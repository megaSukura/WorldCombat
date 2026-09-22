/**
 * 岩石封锁 / rocktomb 的出手方式。
 *
 * 核心念头：**投一块重石头把对手的腿封在地上**——石头砸实的那一下，它脚下的地面立起一圈石柱，把下半身围住，
 * 行动被封、速度被压下去。它是本族唯一**朝目标投掷实体石头**、并真正往世界里留下围栏的一记。
 *
 * 三幕：
 *   起（windup，提交前）：低头、在脚边把一块石头拎起来，石屑向内收。
 *   击（throw → hit）：提交后把石头沿低弧线抛向目标（看得见、能躲），砸中活物即结算一次不接触伤害；
 *       目标落地时，它脚下一圈石柱拔地而起（`world.terrain` 租借，`linger` 活过招式），并按封锁等级压速度、
 *       挂上共享身份 `world_combat:status/encased`。目标离地则围栏立不起来，只挨一块重石头（`shatter`）。
 *   收（cage）：围栏与减速标记留 `cageTicks`，到期原方块回来。
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

    /**
     * 在目标脚边围出一圈石栏：先把这一圈的**地表**换成石（与 bulldoze／rockslide 同一手，稳），
     * 再在每格地表上方尽力立起一排石柱（只放空气格，且不落进任何存活生物的碰撞箱——宿主会为
     * 「格子被活物占住」整批拒绝租赁，所以两批分开租赁，石柱不成立栏还在）。
     * 返回真正改动的格数与按角度排好的顶点（判定与表现共用同一圈）。
     */
    function rocktombCage(world: CombatWorld, centre: CombatPoint, radius: number, height: number, ticks: number): { cells: number; ring: number[][] } {
        var surfaceRing: any[] = [], pillars: any[] = [], points: number[][] = [], r = Math.ceil(radius + 0.3);
        var px = centre.x(), py = centre.y(), pz = centre.z(), inner = Math.max(0.6, radius - 0.7);
        var baseX = Math.floor(px), baseY = Math.floor(py), baseZ = Math.floor(pz);
        for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
            var distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius || distance < inner) continue;
            var x = baseX + dx, z = baseZ + dz, surface = -1, blocked = false;
            // 从命中点上方一直扫到下方六格，命中点可能在目标的头顶或侧面。
            for (var y = baseY + 2; y >= baseY - 6; y--) {
                var block = world.block(WorldCombat.point(x, y, z));
                if (block === null) { blocked = true; break; }
                var id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") { blocked = true; break; }
                surface = y;
                var surfaceId = rocktombSurface(id);
                if (surfaceId !== "" && surfaceId !== id) surfaceRing.push({ x: x, y: y, z: z, block: surfaceId });
                break;
            }
            if (blocked || surface < 0) continue;
            if (!rocktombBlocked(world, x, z, surface + 1)) {
                for (var h = 1; h <= height; h++) {
                    var above = world.block(WorldCombat.point(x, surface + h, z));
                    if (above === null) break;
                    var aboveId = String(above.id());
                    if (aboveId !== "minecraft:air" && aboveId !== "minecraft:cave_air" && aboveId !== "minecraft:void_air") break;
                    pillars.push({ x: x, y: surface + h, z: z, block: "minecraft:cobblestone" });
                }
            }
            points.push([x + 0.5, surface + 1, z + 0.5]);
        }
        var placed = 0;
        if (surfaceRing.length) {
            try { world.terrain(JSON.stringify({ cells: surfaceRing, replace: true, linger: true }), ticks); placed += surfaceRing.length; }
            catch (error) { }
        }
        if (pillars.length) {
            try { world.terrain(JSON.stringify({ cells: pillars, linger: true }), ticks); placed += pillars.length; }
            catch (error) { }
        }
        return { cells: placed, ring: points };
    }

    /** 这格石柱会不会落在某个存活生物的碰撞箱里；会就跳过，否则整批租赁会被宿主拒绝。 */
    function rocktombBlocked(world: CombatWorld, x: number, z: number, y: number): boolean {
        var bodies = world.query(WorldCombat.point(x + 0.5, y, z + 0.5), 3.0, false);
        for (var i = 0; i < bodies.length; i++) {
            var facts = world.observe(bodies[i]);
            if (facts === null) continue;
            var centre = facts.position(), half = facts.width() / 2, tall = facts.height() / 2;
            if (centre.x() + half > x && centre.x() - half < x + 1 && centre.z() + half > z && centre.z() - half < z + 1
                && centre.y() + tall > y && centre.y() - tall < y + 1) return true;
        }
        return false;
    }

    define({
        id: "rocktomb",
        name: "Rock Tomb",
        description: "投一块重石头把目标的腿封在地上：砸中的目标速度下降，脚下立起一圈石柱把它的行动围住；只有站在地上的目标才围得住，离地的只挨一块重石头。封场式围得更宽更高、压两级速度，砸击式砸得更重。",
        uses: ["单体降速，封住冲上来或想跑的人", "用一圈石柱把目标钉在原地", "跳过空中的目标，专封站桩的对手"],
        kind: "enemy",
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
            const cageRadius = p("rocktomb", "cageRadius", action);
            const cageHeight = Math.max(1, Math.round(p("rocktomb", "cageHeight", action)));
            const stages = Math.max(1, Math.round(p("rocktomb", "encaseStages", action)));
            const cageTicks = Math.max(40, Math.round(p("rocktomb", "cageTicks", action)));
            const gravity = 0.05;
            const notes = Math.max(10, Math.round(power * 1.1));
            const scale = cageRadius / 1.3;
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.rockthrow.actor");

            /** 目标落地：立围栏、压速度、挂身份。离地：只崩出一团石屑。 */
            function seal(current: CombatAction, victim: CombatActor, point: CombatPoint): void {
                const scope = current.world();
                const facts = scope.observe(victim);
                if (facts === null || !facts.grounded()) {
                    WorldFeedback.emit(scope, rocktombScene, 1, point,
                        { moment: "shatter", target: String(victim.ref()), notes: notes, scale: scale }, 24);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), rocktombShatterText, [], 24);
                    return;
                }
                NativeEffects.boost(scope, victim, "spe", -stages);
                MobEffects.apply(scope, victim, rocktombTomb, cageTicks, 0);
                const cage = rocktombCage(scope, point, cageRadius, cageHeight, cageTicks);
                WorldFeedback.emit(scope, rocktombScene, 1, point,
                    { moment: "cage", target: String(victim.ref()), stages: stages, pillars: cage.cells,
                        path: cage.ring, scale: scale, ticks: cageTicks,
                        intensity: Math.max(0.5, Math.min(2, power / 55)) }, 30);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), rocktombEncaseText, [stages], 30);
                scope.sound("minecraft:block.stone.place", point, 14, "{}");
            }

            function hitRock(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const point = hit.position(), victim = hit.target();
                if (victim !== null && !scope.friendly(victim)) {
                    const landed = impact(current, hit, "rocktomb", power, { damage: damageSpec("rocktomb", "boulder"), contact: false });
                    WorldFeedback.emit(scope, rocktombScene, 1, point,
                        { moment: "hit", target: String(victim.ref()), notes: notes, scale: scale,
                            intensity: Math.max(0.5, Math.min(2, power / 55)) }, 24);
                    sound(current, "cobblemon:impact.rock");
                    if (landed) seal(current, victim, point);
                    return;
                }
                WorldFeedback.emit(scope, rocktombScene, 1, point, { moment: "miss", notes: notes, scale: scale }, 22);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)), rocktombMissText, [], 22);
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
                { moment: "throw", projectile: flight, scale: scale, notes: notes }, 200);
            sound(action, "minecraft:block.stone.fall");
        }
    });
}
