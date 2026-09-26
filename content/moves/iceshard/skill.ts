/**
 * 冰砾 / iceshard 的出手方式。
 *
 * 核心念头：当场在手里结出一枚冰砾、贴直线高速掷出——几乎瞬发；撞上谁就把他冻得发僵。
 *   它是本族唯一的远程物理招，读法是「轻快小弹」：一枚、极快、点到即止，不在地上留下任何东西。
 *
 * 两幕：
 *   起（windup，提交前）：冷气在手前收拢成一颗，只播预告（present charge）。
 *   掷（execute）：提交后冰砾沿瞄准方向飞出（tint 冰蓝的冰砾外观），身后拖一条冰碴尾；
 *       命中非友方就结算 shard 物理伤害、给他挂上共享身份 chill（冻僵减速）；
 *       砸到地形只碎一撮冰碴，飞尽自然消散。
 *       开碎冰式时，**首次撞实体**还会崩到周围一圈敌人（每人按 splash 系数吃一记有限碎片旁伤），不留下场。
 *
 * 选取：`kind: "aim"`——朝方向或世界点都能直掷，提交后可空放；命中权限仍由命中层按敌我关系判断。
 * 与同族分开：冰冻光束是等待蓄力的贯穿光束、按特殊结算、冻成一条线；冰锥是多枚追身细锥。
 *   冰砾只有一枚、瞬发、按物理结算，不在落点替换任何地面方块。
 */
namespace PokemonSkills {
    define({
        id: iceshardId,
        cooldownParameter: "recharge",
        name: "Ice Shard",
        description: "当场结出一枚冰砾、贴直线高速掷出：几乎瞬发，命中造成物理伤害并让目标冻僵、移动变慢。自由直射，撞到方块只碎冰分散，飞尽则消散。碎冰式命中会崩到周围一圈敌人，但飞得更慢、更近、更费。",
        uses: ["瞬发的远程物理先手", "隔一段距离点掉一个目标并把他冻僵", "自由直射，落空不留场"],
        kind: "aim",
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
            const chillTicks = Math.max(16, Math.round(p(iceshardId, "chillTicks", action)));
            const splinters = Math.max(12, Math.round(p(iceshardId, "splinters", action)));
            const splash = Math.max(0.2, Math.min(0.9, p(iceshardId, "splash", action)));
            const splashRadius = Math.max(0.8, p(iceshardId, "splashRadius", action));
            const shatter = !!(config && config.shatter);
            const scale = Math.max(0.6, Math.min(1.6, radius / 0.22));
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.iceshard.actor_1");

            const flight = LivingActions.projectile(action, {
                speed: velocity, range: Math.max(reach, action.range()), radius: radius,
                lifetime: Math.max(20, Math.round(reach / Math.max(0.3, velocity)) + 16),
                appearance: { sprite: "cobblemon:generic/ice/iceshard", tint: 0xBFE8F8, glow: true,
                    scale: Math.max(0.5, Math.min(1.3, radius / 0.22)) } as any,
                impact: function (current: CombatAction, hit: CombatImpact): void {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, iceshardId, power, { damage: damageSpec(iceshardId, "shard") });
                        const ref = String(victim.ref());
                        WorldFeedback.emit(scope, iceshardScene, 1, point,
                            { moment: "shatter", target: ref, splinters: splinters, scale: scale, intensity: intensity, shatter: shatter ? 1 : 0 }, 20);
                        scope.sound("cobblemon:impact.ice", point, 14, "{}");
                        scope.sound("minecraft:block.glass.break", point, 12, "{}");
                        if (landed) {
                            CombatStatus.apply(scope, victim, "chill", iceshardChillEffect, chillTicks, 0, { unique: true });
                            WorldFeedback.emit(scope, iceshardScene, 1, point, { moment: "chill", target: ref, scale: scale }, 18);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), iceshardChillText, [], 20);
                            // 碎冰式只崩首次撞到的实体：周围每人按 splash 系数吃一记有限旁伤，不铺地面、不留场。
                            if (shatter) WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, splashRadius, { below: 1.5, above: 2.5 }),
                                function (other: CombatActor, otherFacts: CombatObservation): void {
                                    if (String(other.ref()) === ref) return;
                                    if (!hurt(current, other, iceshardId, power * splash, { damage: damageSpec(iceshardId, "shard") })) return;
                                    WorldFeedback.emit(scope, iceshardScene, 1, otherFacts.position(),
                                        { moment: "shatter", target: String(other.ref()), splinters: Math.round(splinters * 0.6), scale: scale, intensity: Math.max(0.4, intensity * 0.7), shatter: 1 }, 18);
                                });
                        }
                    } else {
                        WorldFeedback.emit(scope, iceshardScene, 1, point,
                            { moment: "dud", splinters: splinters, scale: scale, intensity: intensity }, 16);
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
