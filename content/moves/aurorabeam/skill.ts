/**
 * 极光束 / aurorabeam —— 注册与动作。
 *
 * 核心念头：一条**会跑起来的虹色光束**。身前把冷光折成一段棱镜，沿瞄准线冲出去，命中处炸开一圈虹色光、
 * 地面结出一小片霜；被这道冷光刺到的人偶尔攻击下降。它只打最前面的一个，比冰冻光束轻、快、便宜。
 *
 * 两幕：
 *   起（windup，提交前）：身前把冷光折成一点棱镜，只播预告。
 *   射（travel → hit/beam → rime，提交后）：虹光沿直线冲出，命中活体结算 beam 伤害、按 chillChance
 *       把攻击压 1 级、在落点周围的地面租出一小片霜（到期原方块回来）；顺带留一道从施法者到落点的
 *       残余光带，让玩家读出这一束照到了哪。撞空则只落一束光带与浮字。
 *
 * 与冰冻光束分开：冰冻光束是瞬发贯穿一条线的白蓝光、冻住人、留冰线；极光束是看得见轨迹的彩虹缎带、
 * 只打最前一个、留霜斑、压攻击。配置 `spectrum`（虹谱）由 resolve 改时序、由公式改射程／霜斑／概率。
 */
namespace PokemonSkills {
    /** 在落点周围的地面租出一小片霜（packed_ice），到期原方块回来；返回实际铺出的格数。 */
    function aurorabeamFrost(world: CombatWorld, point: CombatPoint, band: number, ticks: number): number {
        const cells: any[] = [];
        const limit = Math.max(6, Math.round(band));
        const baseY = Math.floor(point.y()), centreX = Math.floor(point.x()), centreZ = Math.floor(point.z());
        for (let dx = -2; dx <= 2 && cells.length < limit; dx++) {
            for (let dz = -2; dz <= 2 && cells.length < limit; dz++) {
                if (dx * dx + dz * dz > 5) continue;
                const x = centreX + dx, z = centreZ + dz;
                for (let dy = 1; dy >= -3; dy--) {
                    const y = baseY + dy;
                    const block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                    const above = world.block(WorldCombat.point(x, y + 1, z));
                    const over = above === null ? "" : String(above.id());
                    if (over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air")
                        cells.push({ x: x, y: y, z: z, block: "minecraft:packed_ice" });
                    break;
                }
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: aurorabeamId,
        cooldownParameter: "recharge",
        name: "Aurora Beam",
        description: "射出一条会跑的虹色光束：命中最前面的敌人造成特殊伤害、可能让它的攻击下降 1 级，并在落点地面结出一小片霜。广谱更远更宽更易降攻，聚谱更快更强。",
        uses: ["中远距离的直线点名", "压制物理攻击手", "在通道上留下一小片难走的霜"],
        kind: "enemy",
        range: 14,
        maxRange: 19,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "frost",
        defaults: { spectrum: false, ai: { maxChase: 17, disarm: true, finish: true } },
        fields: [flag("spectrum", "虹谱")],
        indicator: function (config, pokemon) {
            return { radius: p(aurorabeamId, "reach", pokemon), geometry: "line", style: "frost", color: 0x9FE8FF,
                label: config && config.spectrum === true ? "极光束·广谱" : "极光束·聚谱" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[aurorabeamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(aurorabeamId, "tempo", context)),
                recover: Math.round(p(aurorabeamId, "aftercast", context)),
                cooldown: Math.round(p(aurorabeamId, "recharge", context)),
                active: 0,
                range: p(aurorabeamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:aurorabeam:windup", aurorabeamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", spectrum: config && config.spectrum === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p(aurorabeamId, "beam", action);
            const speed = p(aurorabeamId, "velocity", action);
            const radius = p(aurorabeamId, "radius", action);
            const chance = Math.max(0.02, Math.min(0.9, p(aurorabeamId, "chillChance", action)));
            const stages = Math.max(1, Math.round(p(aurorabeamId, "chillStages", action)));
            const band = Math.max(6, Math.round(p(aurorabeamId, "band", action)));
            const bandTicks = Math.max(40, Math.round(p(aurorabeamId, "bandTicks", action)));
            const shimmer = Math.max(10, Math.round(p(aurorabeamId, "shimmer", action)));
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.3));
            const intensity = Math.max(0.5, Math.min(2.2, power / 64));
            let impacted = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.aurorabeam.actor_1");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/smallbeam", tint: 0xB8F0FF, glow: true,
                scale: Math.max(0.8, Math.min(1.8, radius / 0.3))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 120,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    impacted = true;
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    WorldFeedback.emit(scope, aurorabeamScene, 1, point,
                        { moment: "beam", path: [[origin.x(), origin.y(), origin.z()], [point.x(), point.y(), point.z()]],
                            shimmer: shimmer, scale: scale }, 22);
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, aurorabeamId, power, { damage: damageSpec(aurorabeamId, "beam") });
                        WorldFeedback.emit(scope, aurorabeamScene, 1, point,
                            { moment: "hit", target: String(victim.ref()), shimmer: shimmer, scale: scale, intensity: intensity }, 24);
                        if (landed && scope.valid(victim) && scope.random() < chance) {
                            NativeEffects.boost(scope, victim, "atk", -stages);
                            WorldFeedback.emit(scope, aurorabeamScene, 1, point, { moment: "chill", target: String(victim.ref()), shimmer: shimmer }, 24);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), aurorabeamChillText, [stages], 26);
                        }
                        sound(current, "cobblemon:move.aurorabeam.target");
                    } else {
                        WorldFeedback.emit(scope, aurorabeamScene, 1, point, { moment: "miss", target: "", scale: scale }, 20);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), aurorabeamMissText, [], 20);
                    }
                    const placed = aurorabeamFrost(scope, point, band, bandTicks);
                    WorldFeedback.emit(scope, aurorabeamScene, 1, point,
                        { moment: "rime", cells: placed, band: band, scale: Math.max(0.6, Math.min(2.2, band / 10)) }, 28);
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!impacted) WorldFeedback.emit(current.world(), aurorabeamScene, 1, current.targetPosition(), { moment: "miss", scale: scale }, 20);
                finish(current);
            });
            WorldFeedback.keep(world, "aurorabeam:trail:" + action.id(), aurorabeamScene, 1, origin,
                { moment: "travel", projectile: flight, shimmer: shimmer, scale: scale, intensity: intensity }, 60);
        }
    });
}
