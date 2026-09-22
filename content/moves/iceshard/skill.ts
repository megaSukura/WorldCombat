/**
 * 冰砾 / iceshard 的出手方式。
 *
 * 核心念头：当场在手里结出一枚冰砾、贴直线高速掷出——几乎瞬发；撞上谁就把他冻得发僵，
 *   落点把脚下那片地面冻出会滑的薄冰。它是本族唯一的远程物理招。
 *
 * 两幕：
 *   起（windup，提交前）：冷气在拳/手前收拢成一颗，只播预告（present charge）。
 *   掷（execute）：提交后冰砾沿瞄准方向飞出（tint 冰蓝的冰砾外观），身后拖一条冰碴尾；
 *       命中非友方就结算 shard 物理伤害、给他挂上共享身份 chill（冻僵减速），并在落点冻出一片薄冰；
 *       砸到地形就在落点冻一小片冰、只响一声（dud）。开碎冰式时命中还会崩到周围一圈敌人。
 *
 * 与同族分开：冰冻光束是等待蓄力的贯穿光束、按特殊结算、冻成一条线；冰砾只有一枚、瞬发、按物理结算，
 *   落点冻出的是一小块会滑的薄冰。
 */
namespace PokemonSkills {
    /** 在落点冻出一小片薄冰（租借，linger，到期原方块回来）；返回冻了几格。 */
    function iceshardFrost(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const reach = Math.max(0.5, radius), steps = Math.ceil(reach);
        const px = Math.floor(point.x()), py = Math.floor(point.y()), pz = Math.floor(point.z());
        for (let dx = -steps; dx <= steps; dx++) for (let dz = -steps; dz <= steps; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > reach + 0.5) continue;
            const x = px + dx, z = pz + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = py + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                const above = world.block(WorldCombat.point(x, y + 1, z));
                const over = above === null ? "" : String(above.id());
                if (over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air")
                    cells.push({ x: x, y: y, z: z, block: "minecraft:ice" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: iceshardId,
        name: "Ice Shard",
        description: "The user flash-freezes a chunk of ice and hurls it at the target. This move always goes first.",
        uses: ["瞬发的远程物理先手", "隔一段距离点掉一个目标并把他冻僵", "把落点地面冻出会滑的薄冰"],
        kind: "enemy",
        range: 11,
        maxRange: 16,
        prepare: 1,
        active: 0,
        recover: 5,
        cooldown: 16,
        style: "frost",
        defaults: { shatter: false, ai: { maxChase: 14, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(iceshardId, "reach", pokemon) : 11, geometry: "line", style: "frost", color: 0xBFE8F8,
                label: config && config.shatter === true ? "冰砾·碎冰" : "冰砾" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[iceshardId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(iceshardId, "tempo", context)),
                recover: Math.round(p(iceshardId, "settle", context)),
                cooldown: Math.round(p(iceshardId, "recharge", context)),
                active: 0,
                range: p(iceshardId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("iceshard:charge", iceshardScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, splinters: Math.round(p(iceshardId, "splinters", action)),
                    shatter: config && config.shatter === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const reach = Math.max(3, p(iceshardId, "reach", action));
            const velocity = Math.max(0.4, p(iceshardId, "velocity", action));
            const radius = Math.max(0.12, p(iceshardId, "radius", action));
            const power = p(iceshardId, "shard", action);
            const chillTicks = Math.max(20, Math.round(p(iceshardId, "chillTicks", action)));
            const frostRadius = Math.max(0.6, p(iceshardId, "frostRadius", action));
            const frostTicks = Math.max(40, Math.round(p(iceshardId, "frostTicks", action)));
            const splinters = Math.max(12, Math.round(p(iceshardId, "splinters", action)));
            const splash = Math.max(0.2, Math.min(0.9, p(iceshardId, "splash", action)));
            const splashRadius = Math.max(0.8, p(iceshardId, "splashRadius", action));
            const shatter = !!(config && config.shatter);
            const scale = Math.max(0.6, Math.min(1.6, radius / 0.22));
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 冻出薄冰并播一记冰面闪光；没冻成格子（没有可替换的地面）就不播。 */
            function placeFrost(scope: CombatWorld, at: CombatPoint, radius: number, ticks: number): void {
                const cells = iceshardFrost(scope, at, radius, ticks);
                if (cells <= 0) return;
                WorldFeedback.emit(scope, iceshardScene, 1, at,
                    { moment: "frost", splinters: Math.max(8, Math.min(splinters, cells * 3)), scale: Math.max(0.4, radius / 1.2) }, 26);
            }

            sound(action, "cobblemon:move.iceshard.actor_1");

            const flight = LivingActions.projectile(action, {
                speed: velocity, range: Math.max(reach, action.range()), radius: radius,
                lifetime: Math.max(20, Math.round(reach / Math.max(0.3, velocity)) + 18),
                appearance: { sprite: "cobblemon:generic/ice/iceshard", tint: 0xBFE8F8, glow: true,
                    scale: Math.max(0.5, Math.min(1.3, radius / 0.22)) } as any,
                impact: function (current: CombatAction, hit: CombatImpact): void {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, iceshardId, power, { damage: damageSpec(iceshardId, "shard") });
                        const ref = String(victim.ref());
                        WorldFeedback.emit(scope, iceshardScene, 1, point,
                            { moment: "shatter", target: ref, splinters: splinters, scale: scale, intensity: intensity, shatter: shatter ? 1 : 0 }, 24);
                        scope.sound("cobblemon:impact.ice", point, 14, "{}");
                        scope.sound("minecraft:block.glass.break", point, 12, "{}");
                        if (landed) {
                            CombatStatus.apply(scope, victim, "chill", iceshardChillEffect, chillTicks, 0, { unique: true });
                            WorldFeedback.emit(scope, iceshardScene, 1, point, { moment: "chill", target: ref, scale: scale }, 22);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), iceshardChillText, [], 22);
                            if (shatter) WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, splashRadius, { below: 1.5, above: 2.5 }),
                                function (other: CombatActor, otherFacts: CombatObservation): void {
                                    if (String(other.ref()) === ref) return;
                                    if (!hurt(current, other, iceshardId, power * splash, { damage: damageSpec(iceshardId, "shard") })) return;
                                    WorldFeedback.emit(scope, iceshardScene, 1, otherFacts.position(),
                                        { moment: "shatter", target: String(other.ref()), splinters: Math.round(splinters * 0.6), scale: scale, intensity: Math.max(0.4, intensity * 0.7), shatter: 1 }, 20);
                                });
                        }
                        placeFrost(scope, point, frostRadius, frostTicks);
                    } else {
                        placeFrost(scope, point, frostRadius * 0.7, frostTicks * 0.7);
                        WorldFeedback.emit(scope, iceshardScene, 1, point,
                            { moment: "dud", splinters: splinters, scale: scale, intensity: intensity }, 18);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), iceshardMissText, [], 20);
                        scope.sound("minecraft:block.glass.break", point, 12, "{}");
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, "iceshard:flight:" + action.id(), iceshardScene, 1, action.origin(),
                { moment: "fly", projectile: flight, splinters: splinters, scale: scale, intensity: intensity, shatter: shatter ? 1 : 0 }, 80);
        }
    });
}
