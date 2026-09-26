/**
 * 岩石封锁 / rocktomb 的出手方式。
 *
 * 核心念头：**投一块重石头把对手的腿封在地上**——石头砸实的那一下，它脚下的地面立起一圈石柱，把下半身围住，
 * 行动被封、速度被压下去。它是本族唯一**朝目标投掷实体石头**、并真正往世界里留下围栏的一记。
 *
 * 三幕：
 *   起（windup，提交前）：低头、在脚边把一块石头拎起来，石屑向内收。
 *   击（throw → hit / wall）：提交后把石头沿低弧线抛向方向点或选中的实体（看得见、能躲）。砸中落地活物即结算
 *       一次不接触伤害，并在它脚下立起石栏；砸到地面也在真实落点围一圈；砸到墙或空中目标只崩出碎石。
 *   收（cage / shatter）：石栏按 `world.terrain` 租借留下 `cageTicks`，到期原方块回来；速度的下降不随围栏恢复。
 *
 * 选取：kind 为 aim——方向或世界点都能放，也可以直接点实体；提交时不要求存在敌人，命中权限仍由命中层判断。
 * 围栏只由**真实地面命中**生成：砸中落地目标、或石头真正落在可替换地表上；对着空处点不会凭空围住谁。
 * 围栏特意留一道可走缺口（`cageGap`，随目标体宽加宽），避免大个子被挤进石柱；地形被原生保护拒绝时，
 * 只呈碎石与真实减速，不画成功石墙。速度下降是 `NativeEffects.boost(...,"spe",-N)`，并另挂共享身份
 * `world_combat:status/encased`（本单元发明，别的单元可直接消费「行动被封」）。
 *
 * 与同族分开：同是物理一击留痕，撕裂爪/铁尾/暗影之骨/碎岩留下的是**防御**的缺口，岩石封锁留下的是
 * **行动**的封锁（速度）；而同为降速的 bulldoze 是把脚下整圈地裂推出去（范围、只扫地面），
 * 岩石封锁是单体投石、只封一个目标。两人对放也分得开：一个朝外扩，一个朝内收。
 *
 * 配置 `trap`（封场式）由 resolve 改时序、由公式改围栏与单发：开启＝宽而久、降两级，关闭＝窄而重、降一级。
 */
namespace PokemonSkills {
    const rocktombScene = "world_combat:move_rocktomb";
    const rocktombTomb = "world_combat:rocktomb_tomb";
    const rocktombEncaseText = "world_combat.move.rocktomb.text.encase";
    const rocktombShatterText = "world_combat.move.rocktomb.text.shatter";
    const rocktombWallText = "world_combat.move.rocktomb.text.wall";
    const rocktombBlockedText = "world_combat.move.rocktomb.text.blocked";
    const rocktombMissText = "world_combat.move.rocktomb.text.miss";

    /** 可被围栏替换成石的地表方块；替换不会碰到方块实体、流体与不可破坏方块。 */
    function rocktombSurface(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block" ||
            id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:deepslate" ||
            id === "minecraft:gravel" || id === "minecraft:sand" || id === "minecraft:red_sand" ||
            id === "minecraft:sandstone" || id === "minecraft:cobblestone") return "minecraft:cobblestone";
        return "";
    }

    /** 空出的出口覆盖整格投影，保证缺口的净宽，而不是只排除格子中心。 */
    function rocktombInGap(x: number, z: number, centre: CombatPoint, forward: CombatPoint, width: number): boolean {
        var dx = x + 0.5 - centre.x(), dz = z + 0.5 - centre.z();
        var cellHalf = (Math.abs(forward.x()) + Math.abs(forward.z())) * 0.5;
        return dx * forward.x() + dz * forward.z() + cellHalf >= 0
            && Math.abs(-dx * forward.z() + dz * forward.x()) - cellHalf < width * 0.5;
    }

    /**
     * 在目标脚边围出一圈石栏：先把这一圈的**地表**换成石（与 bulldoze／rockslide 同一手，稳），
     * 再在每格地表上方尽力立起一排石柱（只放空气格；落到活物碰撞箱里的格由宿主按占用拒绝并跳过，
     * 所以石柱不会把人挤进实体）。
     *
     * 两批都走 `world.terrainResult(...bestEffort:true)`：被原生保护或已占用的格由原生跳过，返回真正放置的格；
     * 按 centre→gapFrom 方向留出 `gapWidth` 宽的一道缺口，让围住的活物能自己走出来，也避免大体型被挤进石柱。
     * 返回真正放下的石柱基点（每根取最低一格），供表现逐根点亮；放不下石柱时 `pillars` 为空，调用方据此不画假墙。
     */
    function rocktombCage(world: CombatWorld, centre: CombatPoint, radius: number, height: number, ticks: number,
                          gapFrom: CombatPoint | null, gapWidth: number): { placed: number; pillars: number[][] } {
        var surfaceRing: any[] = [], pillars: any[] = [], r = Math.ceil(radius + 0.3);
        var px = centre.x(), py = centre.y(), pz = centre.z(), inner = Math.max(0.6, radius - 0.7);
        var baseX = Math.floor(px), baseY = Math.floor(py), baseZ = Math.floor(pz);
        var gapForward = WorldGeometry.flatUnit(gapFrom === null ? WorldCombat.point(1, 0, 0) : gapFrom.minus(centre));
        for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
            var x = baseX + dx, z = baseZ + dz;
            var offsetX = x + 0.5 - px, offsetZ = z + 0.5 - pz;
            // 取真正与圆环相交的方格；小圈的格中心可能全在内圈或外圈，不能据此误判空场。
            var nearX = Math.max(0, Math.abs(offsetX) - 0.5), nearZ = Math.max(0, Math.abs(offsetZ) - 0.5);
            var farX = Math.abs(offsetX) + 0.5, farZ = Math.abs(offsetZ) + 0.5;
            if (nearX * nearX + nearZ * nearZ > radius * radius || farX * farX + farZ * farZ < inner * inner) continue;
            if (rocktombInGap(x, z, centre, gapForward, gapWidth)) continue;
            var surface: number | null = null, blocked = false;
            // 从命中点上方一直扫到下方六格，命中点可能在目标的头顶或侧面。
            for (var y = baseY + 2; y >= baseY - 6; y--) {
                var block = world.block(WorldCombat.point(x, y, z));
                if (block === null) { blocked = true; break; }
                var id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") { blocked = true; break; }
                var surfaceId = rocktombSurface(id);
                if (surfaceId === "") { blocked = true; break; }
                surface = y;
                if (surfaceId !== id) surfaceRing.push({ x: x, y: y, z: z, block: surfaceId, expectedState: String(block.state()) });
                break;
            }
            if (blocked || surface === null) continue;
            for (var h = 1; h <= height; h++) {
                var above = world.block(WorldCombat.point(x, surface + h, z));
                if (above === null) break;
                var aboveId = String(above.id());
                if (aboveId !== "minecraft:air" && aboveId !== "minecraft:cave_air" && aboveId !== "minecraft:void_air") break;
                pillars.push({ x: x, y: surface + h, z: z, block: "minecraft:cobblestone", expectedState: String(above.state()) });
            }
        }
        var placed = 0, bases: number[][] = [];
        if (surfaceRing.length) {
            try {
                var surfaceResult = JSON.parse(String(world.terrainResult(JSON.stringify({ cells: surfaceRing, replace: true, linger: true, bestEffort: true }), ticks)));
                placed += surfaceResult && surfaceResult.placed ? surfaceResult.placed.length : 0;
            } catch (error) { }
        }
        if (pillars.length) {
            // 每根石柱单独租借：某一格被保护或占住时只跳过这一根，不会把整批石柱一起回滚。
            var lowest: { [column: string]: number[] } = Object.create(null);
            for (var i = 0; i < pillars.length; i++) {
                var pillar = pillars[i];
                try {
                    var pillarResult = JSON.parse(String(world.terrainResult(JSON.stringify({ cells: [pillar], linger: true, bestEffort: true }), ticks)));
                    var list: any[] = pillarResult && pillarResult.placed ? pillarResult.placed : [];
                    if (!list.length) continue;
                    placed += list.length;
                    var column = String(pillar.x) + ":" + String(pillar.z);
                    if (!lowest[column] || pillar.y < lowest[column][1]) lowest[column] = [pillar.x, pillar.y, pillar.z];
                } catch (error) { }
            }
            Object.keys(lowest).forEach(function (column: string) { bases.push(lowest[column]); });
        }
        return { placed: placed, pillars: bases };
    }

    define({
        id: "rocktomb",
        name: "Rock Tomb",
        description: "朝方向点或选中的目标投一块重石头：砸中的目标速度下降，落地时它脚下立起一圈留有缺口的石柱把行动围住；石头真正落在可替换地面上也会围一圈，只有站在地上的目标才围得住。封场式围得更宽更久、压两级速度，砸击式砸得更重。",
        uses: ["单体降速，封住冲上来或想跑的人", "用一圈留缺口的石柱把目标钉在原地", "跳过空中的目标，专封站桩的对手"],
        kind: "aim",
        range: 6.5,
        maxRange: 12,
        prepare: 8,
        active: 26,
        recover: 9,
        cooldown: 30,
        style: "rock",
        defaults: { trap: false, ai: { maxChase: 8, sealRunner: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("rocktomb", "cageRadius", pokemon), geometry: "area", style: "rock",
                color: 0x8A7A62, label: config && config.trap === true ? "封场岩封" : "砸击岩封" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["rocktomb"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var trap = !!(config && config.trap);
            return {
                prepare: p("rocktomb", "prepare", context) + (trap ? 3 : 0),
                recover: p("rocktomb", "recover", context),
                cooldown: p("rocktomb", "cooldown", context) + (trap ? 6 : 0),
                active: skills["rocktomb"].active,
                range: p("rocktomb", "throwRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_rocktomb:windup", rocktombScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", trap: config && config.trap === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("rocktomb", "boulder", action);
            const speed = p("rocktomb", "throwSpeed", action);
            const range = p("rocktomb", "throwRange", action);
            const rockRadius = p("rocktomb", "collisionRadius", action);
            const cageHeight = Math.max(1, Math.round(p("rocktomb", "cageHeight", action)));
            const stages = Math.max(1, Math.round(p("rocktomb", "encaseStages", action)));
            const cageTicks = Math.max(40, Math.round(p("rocktomb", "cageTicks", action)));
            const gravity = 0.05;
            const notes = Math.max(10, Math.round(power * 1.1));
            const throwScale = Math.max(0.4, p("rocktomb", "cageRadius", action) / 1.3);
            const intensity = Math.max(0.5, Math.min(2, power / 55));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.rockthrow.actor");

            /**
             * 围栏落点只来自真实命中：victim 为被砸中的落地活物，或 victim 为 null 时石头真正落在地面。
             * 离地的目标围不起来、也不掉速，只挨那块石头（与 bulldoze 只扫地面同一读法）。
             * 只有原生真正放下石柱才挂封锁身份、画围栏；地形被拒绝时只崩碎石，速度照样真实下降。
             */
            function seal(current: CombatAction, victim: CombatActor | null, point: CombatPoint, grounded: boolean): void {
                const scope = current.world();
                const aimed = victim !== null ? withTarget(factContext(current), victim) : current;
                const body = victim !== null ? scope.observe(victim) : null;
                const min = body === null ? null : body.boundsMin(), max = body === null ? null : body.boundsMax();
                const centre = min !== null && max !== null ? WorldCombat.point((min.x() + max.x()) * 0.5, min.y(), (min.z() + max.z()) * 0.5) : point;
                const halfX = min !== null && max !== null ? (max.x() - min.x()) * 0.5 : 0;
                const halfZ = min !== null && max !== null ? (max.z() - min.z()) * 0.5 : 0;
                const halfWidth = Math.max(halfX, halfZ);
                const radius = Math.max(p("rocktomb", "cageRadius", aimed), halfWidth + 1.3);
                const away = WorldGeometry.flatUnit(centre.minus(origin));
                const gapWidth = Math.max(p("rocktomb", "cageGap", aimed),
                    2 * (halfX * Math.abs(away.z()) + halfZ * Math.abs(away.x())) + 0.5);
                const scale = Math.max(0.4, radius / 1.3);
                // 围栏固定在命中时的脚部中心，出口背向投石者；实际身体投影决定所需净宽。
                const gapAway = centre.plus(away);
                if (victim !== null && !grounded) {
                    WorldFeedback.emit(scope, rocktombScene, 1, point,
                        { moment: "shatter", target: String(victim.ref()), notes: notes, scale: scale }, 24);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), rocktombShatterText, [], 24);
                    return;
                }
                const cage = rocktombCage(scope, centre, radius, cageHeight, cageTicks, gapAway, gapWidth);
                if (victim !== null) NativeEffects.boost(scope, victim, "spe", -stages);
                if (!cage.pillars.length) {
                    WorldFeedback.emit(scope, rocktombScene, 1, point,
                        { moment: "shatter", target: victim !== null ? String(victim.ref()) : "", notes: notes, scale: scale }, 24);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.05, 0)), rocktombBlockedText, [], 26);
                    sound(current, "minecraft:block.stone.break");
                    return;
                }
                WorldFeedback.emit(scope, rocktombScene, 1, centre,
                    { moment: "cage", target: victim !== null ? String(victim.ref()) : "", stages: stages, pillars: cage.pillars.length,
                        scale: scale, ticks: cageTicks, intensity: intensity }, 30);
                for (let i = 0; i < cage.pillars.length; i++) {
                    const cell = cage.pillars[i];
                    WorldFeedback.emit(scope, rocktombScene, 1, WorldCombat.point(cell[0] + 0.5, cell[1], cell[2] + 0.5),
                        { moment: "pillar", scale: scale }, 40);
                }
                if (victim !== null) {
                    MobEffects.apply(scope, victim, rocktombTomb, cageTicks, 0);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), rocktombEncaseText, [stages], 30);
                }
                scope.sound("minecraft:block.stone.place", point, 14, "{}");
            }

            function hitRock(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const point = hit.position(), victim = hit.target();
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    const body = scope.observe(victim);
                    const landed = impact(current, hit, "rocktomb", power, { damage: damageSpec("rocktomb", "boulder"), contact: false });
                    WorldFeedback.emit(scope, rocktombScene, 1, point,
                        { moment: "hit", target: String(victim.ref()), notes: notes, scale: throwScale, intensity: intensity }, 24);
                    sound(current, "cobblemon:impact.rock");
                    if (landed) seal(current, victim, point, body !== null && body.grounded());
                    return;
                }
                if (victim !== null) {
                    WorldFeedback.emit(scope, rocktombScene, 1, point, { moment: "miss", notes: notes, scale: throwScale }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)), rocktombMissText, [], 22);
                    sound(current, "minecraft:block.stone.break");
                    return;
                }
                const face = hit.blockFace();
                if (face === "up") { seal(current, null, point, true); return; }
                WorldFeedback.emit(scope, rocktombScene, 1, point,
                    { moment: "shatter", notes: notes, scale: throwScale, face: face }, 22);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), rocktombWallText, [], 22);
                sound(current, "minecraft:block.stone.break");
            }

            const targetPoint = action.targetPosition();
            const direction = LivingActions.ballistic(origin, targetPoint, speed, gravity) || aim(action);
            const flightRange = Math.max(range, origin.minus(targetPoint).length() + 3);
            const flight = action.projectile(origin, direction.scale(speed), gravity, rockRadius, flightRange,
                Math.max(30, Math.round(flightRange / Math.max(0.2, speed) + 40)),
                function (inner, hit) { hitRock(inner, hit); },
                function (inner) { finish(inner); },
                JSON.stringify({ block: "minecraft:cobblestone", scale: Math.max(0.7, rockRadius * 1.6), spin: true }));
            WorldFeedback.keep(world, "rocktomb:throw:" + String(action.id()), rocktombScene, 1, origin,
                { moment: "throw", projectile: flight, scale: throwScale, notes: notes }, 200);
            sound(action, "minecraft:block.stone.fall");
        }
    });
}
