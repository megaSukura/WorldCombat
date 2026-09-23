/**
 * 精神波 / psywave —— 注册与动作。
 *
 * 核心念头：朝目标推出一道**不稳定的念力波前**。它比别的念波更散、会从第一个目标身上继续推向下一个；
 *   每次出手摇出的强度都不同，画面上的环数与亮度直接对应当前这一次的强弱。
 *
 * 两幕（提交前只播预告）：
 *   起（windup）：周身念力紊乱跳动、把波压到掌心，只播预告。
 *   放（execute）：提交时先摇出本此的强度系数，再推出波前；它沿瞄准方向推进，每命中一个非友方结算一次 `wave`
 *       伤害并继续穿透，最多 `pierce` 个；推完全程或穿透用尽后收势。
 *
 * 与同族分开：精神冲击是一枚不追踪的实心棱，精神击破是头顶的重物；精神波是唯一会穿透、也是唯一把「这个数每次
 *   都不同」当作身份的招。配置 `surge` 由公式改威力与波动幅度，由时序改收招冷却。
 */
namespace PokemonSkills {
    define({
        id: psywaveId,
        cooldownParameter: "recharge",
        name: "Psywave",
        description: "朝目标推出一道不稳定的念力波前：它沿瞄准方向穿透多个对手，每命中一个结算一次特殊伤害，且每次出手的强度都不同——画面上的环数与亮度直接显示这一发是强是弱。涌动式更飘更重，稳流式更稳更远。",
        uses: ["打穿排成一列的几个目标", "用便宜的一发补伤害，赌一次高波动", "在稳流式下当作稳定的远程输出"],
        kind: "enemy",
        range: 12,
        maxRange: 18,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "psychic",
        defaults: { surge: false, ai: { maxChase: 15, crowd: true } },
        fields: [flag("surge", "涌动")],
        indicator: function (config, pokemon) {
            return { radius: p(psywaveId, "width", pokemon) * 2.4, geometry: "line", style: "psychic", color: 0x8E6FE0,
                label: config && config.surge === true ? "精神波·涌动" : "精神波·稳流" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psywaveId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(psywaveId, "tempo", context)),
                recover: Math.round(p(psywaveId, "aftercast", context)),
                cooldown: Math.round(p(psywaveId, "recharge", context)),
                active: 0,
                range: p(psywaveId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:psywave:unstable", psywaveScene, 1, action.origin(),
                JSON.stringify({ moment: "unstable", surge: config && config.surge === true,
                    rings: Math.round(p(psywaveId, "rings", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const base = p(psywaveId, "wave", action);
            const swing = Math.max(0.05, Math.min(0.85, p(psywaveId, "swing", action)));
            const speed = p(psywaveId, "velocity", action);
            const width = Math.max(0.25, p(psywaveId, "width", action));
            const pierce = Math.max(1, Math.min(9, Math.round(p(psywaveId, "pierce", action))));
            const baseRings = Math.max(3, Math.round(p(psywaveId, "rings", action)));
            const roll = 1 + (world.random() * 2 - 1) * swing;
            const power = Math.max(1, base * roll);
            const tier = Math.max(0, Math.min(1, (roll - (1 - swing)) / (2 * swing)));
            const rings = Math.max(2, Math.round(baseRings * (0.55 + 0.45 * roll)));
            const scale = Math.max(0.6, Math.min(2.0, width / 0.55));
            let hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.confusion.actor");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/energyorb", tint: 0x8E6FE0, glow: true,
                scale: Math.max(0.8, Math.min(1.6, width / 0.5)),
                pierce: pierce
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: width, lifetime: 140,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, psywaveId, power, { damage: damageSpec(psywaveId, "wave") });
                        if (landed) {
                            hits++;
                            sound(current, "cobblemon:impact.psychic");
                            WorldFeedback.emit(scope, psywaveScene, 1, point,
                                { moment: "hit", target: String(victim.ref()), rings: rings, scale: scale,
                                    intensity: 0.6 + tier * 1.6, tier: tier, power: Math.round(power * 10) / 10 }, 26);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), psywaveHitText, [Math.round(power)], 22);
                        }
                    }
                }
            }, function (current: CombatAction) {
                const scope = current.world();
                if (hits === 0) {
                    WorldFeedback.emit(scope, psywaveScene, 1, current.targetPosition(), { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 1.0, 0)), psywaveMissText, [], 20);
                }
                finish(current);
            });
            WorldFeedback.keep(world, "psywave:wave:" + action.id(), psywaveScene, 1, origin,
                { moment: "flight", projectile: flight, rings: rings, scale: scale, intensity: 0.6 + tier * 1.6, tier: tier, pierce: pierce }, 70);
        }
    });
}
