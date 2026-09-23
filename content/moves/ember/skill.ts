/**
 * 火花 / ember 的出手方式。
 *
 * 核心念头：把一小撮火团在指尖，弹指射出去——一粒小而急的火种沿浅浅的弧线飞出，命中即碎成几粒火星，
 * 可能在目标身上留下一点火。它是有意做小的一招：不铺开、不持续、不封地，只求出手快、能连发。
 *
 * 三幕：
 *   起（kindle，提交前）：指尖亮起一点火，只播预告。
 *   飞（flight，提交后）：火种带一条短焰尾沿浅弧飞出。
 *   碎（burst / burn）：命中活物时结算 spark 特殊伤害并按概率引燃；碎出一撮火星，点着了就贴一层小火。
 *
 * 与同族分开：喷射火焰是一道会变长的火舌，大字爆炎是一整幅烧出的字，神圣之火是裹彩虹火的俯冲；
 * 只有火花是单粒、小、可连发的一口火。配置 `charged` 由 resolve 改时序、由公式改威力／射程／引燃。
 */
namespace PokemonSkills {
    const emberScene = "world_combat:move_ember";
    const emberBurnText = "world_combat.move.ember.text.burn";

    define({
        id: "ember",
        cooldownParameter: "recharge",
        name: "Ember",
        description: "弹指射出一粒小而急的火种，沿浅弧飞到目标身上；命中碎成几粒火星，并可能把目标点燃。出手快、冷却短，是缺手段时最稳的一口小火力。",
        uses: ["快速弹出一粒火种补刀", "连发压血并偶尔引燃", "在没有条件铺开火势时的一口小火力"],
        kind: "enemy",
        range: 12,
        maxRange: 17,
        prepare: 6,
        active: 0,
        recover: 5,
        cooldown: 18,
        style: "fire",
        defaults: { charged: false, ai: { maxChase: 14, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("ember", "radius", pokemon), geometry: "line", style: "fire",
                color: 0xFF9A3C, label: config && config.charged === true ? "蓄力火花" : "火花" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["ember"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("ember", "tempo", context)),
                recover: Math.round(p("ember", "aftercast", context)),
                cooldown: Math.round(p("ember", "recharge", context)),
                active: 0,
                range: p("ember", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("ember:kindle", emberScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", charged: config && config.charged === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p("ember", "spark", action);
            const speed = p("ember", "velocity", action);
            const gravity = p("ember", "gravity", action);
            const radius = p("ember", "radius", action);
            const burnChance = Math.max(0.01, Math.min(0.5, p("ember", "burnChance", action)));
            const sparks = Math.max(3, Math.round(p("ember", "sparks", action)));
            const scale = Math.max(0.6, Math.min(1.6, radius / 0.16));
            const intensity = Math.max(0.6, Math.min(2.2, power / 40));
            let settled = false, struck = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.ember.actor");
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/fire/flame", tint: 0xFF9A3C, glow: true, scale: scale
            };
            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 200,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                        struck = true;
                        const landed = impact(current, hit, "ember", power,
                            { damage: damageSpec("ember", "spark"), status: "burn", chance: burnChance });
                        if (landed && scope.valid(target)) {
                            const body = scope.observe(target);
                            const at = body !== null ? body.position() : point;
                            WorldFeedback.emit(scope, emberScene, 1, at,
                                { moment: "burn", target: String(target.ref()), sparks: sparks, scale: scale, intensity: intensity }, 90);
                            if (CombatStatus.has(scope, target, "burn"))
                                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), emberBurnText, [], 26);
                        }
                    }
                    WorldFeedback.emit(scope, emberScene, 1, point,
                        { moment: "burst", target: target !== null ? String(target.ref()) : "", sparks: sparks,
                            scale: scale, intensity: intensity }, 24);
                    sound(current, "cobblemon:impact.fire");
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    const scope = current.world();
                    WorldFeedback.emit(scope, emberScene, 1, action.origin(),
                        { moment: "fizzle", scale: scale }, 18);
                }
                finish(current);
            });
            WorldFeedback.keep(world, "ember:trail:" + action.id(), emberScene, 1, action.origin(),
                { moment: "flight", sparks: sparks, scale: scale, intensity: intensity }, 60);
        }
    });
}
