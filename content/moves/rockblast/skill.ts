/**
 * 岩石爆击 / rockblast 的出手方式。本族「2～5 连发硬物」的岩石型。
 *
 * 核心念头：**掀地碎岩、霰弹齐射**——施法者从脚下的地里掰出石块，一块接一块按弧线抛向目标；
 *   每块落地砸一次，并把落点那格地面崩成碎石。卖的是「岩石取自你脚下的世界」与「越近吃得越满」。
 *
 * 三幕（提交前只播预告）：
 *   起（charge）：脚下地面裂开、石块在身侧浮起，只播预告。
 *   射（volley → hit / ground）：提交后每 `gap` 刻抛出一块石头（带 `spread` 偏角、按 `arc` 弧坠）；
 *       石块是可见的方块投递（原生实体外观），材质取自施法者脚下（沙地→沙岩、深板岩→碎深板岩）。
 *   击（hit / ground）：撞上敌人结算一次 `shard` 物理伤害并把落点崩成 `rubble` 刻的碎石；
 *       落到地面只崩碎石、不造成伤害。石块抛得散，远距离的目标会被漏掉——这是 90 命中的翻译。
 *
 * 与同族分开：种子机关枪是贴地直飞的小籽、飞弹针是追身细针、冰锥碎在目标身上、尖刺加农炮直线穿排；
 *   只有岩石爆击走弧线，并且把落点砸成碎石堆。
 *
 * 配置 `boulder`（巨岩式）由公式改威力／投石数／散布／弧坠与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const rockblastScene = "world_combat:move_rockblast";

    /** 把地表方块归到一个「岩石类」材质上：沙归沙岩、深板岩归碎深板岩，其余石质归圆石。 */
    function rockblastGroundMaterial(id: string): string {
        const value = String(id);
        if (value.indexOf("red_sand") >= 0) return "minecraft:red_sandstone";
        if (value.indexOf("sand") >= 0) return "minecraft:sandstone";
        if (value.indexOf("deepslate") >= 0) return "minecraft:cobbled_deepslate";
        if (value.indexOf("blackstone") >= 0) return "minecraft:blackstone";
        if (value.indexOf("basalt") >= 0) return "minecraft:basalt";
        if (value.indexOf("netherrack") >= 0) return "minecraft:netherrack";
        if (value.indexOf("tuff") >= 0) return "minecraft:tuff";
        if (value.indexOf("andesite") >= 0) return "minecraft:andesite";
        if (value.indexOf("diorite") >= 0) return "minecraft:diorite";
        if (value.indexOf("granite") >= 0) return "minecraft:granite";
        if (value.indexOf("terracotta") >= 0) return "minecraft:terracotta";
        if (value.indexOf("gravel") >= 0) return "minecraft:gravel";
        if (value.indexOf("ice") >= 0) return "minecraft:packed_ice";
        if (value.indexOf("obsidian") >= 0) return "minecraft:obsidian";
        if (value.indexOf("dirt") >= 0 || value.indexOf("podzol") >= 0 || value.indexOf("mycelium") >= 0) return "minecraft:dirt";
        return "minecraft:cobblestone";
    }

    /** 读施法者脚下最近的一层实心方块，作为这一梭石头的材质来源。 */
    function rockblastSurface(world: CombatWorld, at: CombatPoint): string {
        for (let dy = 1; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(at.x(), at.y() + dy, at.z()));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava") continue;
            return id;
        }
        return "minecraft:stone";
    }

    /** 把落点附近那层地表换成碎石；实体占着的格子由宿主等它走开再合上。 */
    function rockblastRubble(world: CombatWorld, point: CombatPoint, block: string, ticks: number): void {
        const cells: any[] = [], radius = 1;
        const px = point.x(), py = point.y(), pz = point.z();
        for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
            if (Math.abs(dx) + Math.abs(dz) > 2) continue;
            const x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
            for (let dy = 0; dy >= -2; dy--) {
                const y = Math.floor(py) + dy;
                const found = world.block(WorldCombat.point(x, y, z));
                if (found === null) break;
                const id = String(found.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (id === block) break;
                cells.push({ x: x, y: y, z: z, block: block });
                break;
            }
        }
        if (!cells.length) return;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return; }
    }

    /** 把弧线方向绕世界 Y 轴偏一个角度，做出霰弹的散布。 */
    function rockblastScatter(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: "rockblast",
        cooldownParameter: "recharge",
        name: "Rock Blast",
        description: "从脚下的地里掰出石块，一块接一块按弧线抛向目标：每块落地砸一次，并把落点崩成碎石。石块抛得散、贴脸才吃得满；巨岩式少而重、抛得更紧更陡。",
        uses: ["中近距离一梭有弧线的重石", "把落点地面崩成碎石", "对厚目标用巨岩式堆单块伤害"],
        kind: "enemy",
        range: 7,
        maxRange: 12,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 28,
        maximumTicks: 260,
        style: "stone",
        defaults: { boulder: false, ai: { maxChase: 9, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("rockblast", "reach", pokemon), geometry: "line", style: "stone", color: 0xA98C6A,
                label: config && config.boulder === true ? "巨岩式" : "碎岩霰弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["rockblast"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("rockblast", "tempo", context)),
                recover: Math.round(p("rockblast", "aftercast", context)),
                cooldown: Math.round(p("rockblast", "recharge", context)),
                active: 0,
                range: p("rockblast", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shots = Math.max(2, Math.min(5, Math.round(p("rockblast", "shots", action))));
            action.present("rockblast:charge", rockblastScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", shots: shots, boulder: config && config.boulder === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p("rockblast", "shard", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("rockblast", "shots", action))));
            const gap = Math.max(2, Math.round(p("rockblast", "gap", action)));
            const speed = Math.max(0.5, p("rockblast", "velocity", action));
            const gravity = Math.max(0.01, p("rockblast", "arc", action));
            const radius = Math.max(0.15, p("rockblast", "radius", action));
            const spread = Math.max(1, p("rockblast", "spread", action));
            const chips = Math.max(6, Math.round(p("rockblast", "chips", action)));
            const rubbleTicks = Math.max(40, Math.round(p("rockblast", "rubble", action)));
            const boulder = !!(config && config.boulder);
            const material = rockblastGroundMaterial(rockblastSurface(world, action.origin()));
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.28));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            let shot = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 抛出一块石头；它落地（撞人或撞地）后进入 complete，按间隔排下一块。 */
            function volley(current: CombatAction): void {
                if (shot >= shots) { finish(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) { finish(current); return; }
                const origin = current.origin();
                const centre = body.position();
                let direction = LivingActions.ballistic(origin, centre, speed, gravity);
                if (direction === null) direction = aim(current);
                direction = rockblastScatter(direction, (scope.random() * 2 - 1) * spread * Math.PI / 180);
                const distance = centre.minus(origin).length();
                const index = shot + 1;
                shot = index;
                sound(current, "cobblemon:move.rockthrow.actor");
                WorldFeedback.emit(scope, rockblastScene, 1, origin,
                    { moment: "volley", shot: index, shots: shots, chips: chips, scale: scale, intensity: intensity, boulder: boulder ? 1 : 0 }, 18);
                LivingActions.projectile(current, {
                    speed: speed, range: distance + 4, radius: radius, direction: direction, gravity: gravity,
                    lifetime: Math.max(24, Math.round(distance / Math.max(0.3, speed)) + 30),
                    appearance: { block: material, spin: true, scale: Math.max(0.4, Math.min(1.0, radius * 1.6)) } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world();
                        const at = hit.position();
                        const struck = hit.target();
                        if (hit.hitEntity() && struck !== null && scope2.valid(struck) && !scope2.friendly(struck)) {
                            if (!impact(inner, hit, "rockblast", power, { damage: damageSpec("rockblast", "shard"), flags: { bullet: true } })) return;
                            rockblastRubble(scope2, at, material, rubbleTicks);
                            WorldFeedback.emit(scope2, rockblastScene, 1, at,
                                { moment: "hit", target: String(struck.ref()), shot: index, shots: shots, chips: chips, scale: scale, intensity: intensity, rubble: rubbleTicks }, 22);
                            sound(inner, "cobblemon:impact.rock");
                            return;
                        }
                        rockblastRubble(scope2, at, material, Math.round(rubbleTicks * 0.6));
                        WorldFeedback.emit(scope2, rockblastScene, 1, at,
                            { moment: "ground", shot: index, shots: shots, chips: Math.round(chips * 0.6), scale: scale, intensity: Math.max(0.4, intensity * 0.7) }, 18);
                    }
                }, function (inner: CombatAction) {
                    inner.after(gap, function (next: CombatAction) { volley(next); });
                });
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, rockblastScene, 1, action.origin(),
                { moment: "charge", shots: shots, chips: chips, scale: scale, intensity: intensity, boulder: boulder ? 1 : 0 }, 16);
            volley(action);
        }
    });
}
