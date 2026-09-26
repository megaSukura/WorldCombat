/**
 * 火花 / ember 的出手方式。
 *
 * 核心念头：把一小撮火团在指尖，弹指射出去——一粒小而急的火种沿浅浅的弧线飞出，命中即碎成几粒火星，
 * 可能在目标身上留下一点火。它是有意做小的一招：不铺开、不持续、不封地，只求出手快、能连发。
 *
 * 三幕：
 *   起（kindle，提交前）：指尖亮起一点火，只播预告。
 *   飞（flight，提交后）：火种带一条短焰尾沿浅弧飞出；表现绑定真实弹体 UUID，尾迹与弹体逐帧同步。
 *   碎（burst / burn）：命中的火种碎成几粒火星；**只有真的把目标点燃时**才补一层贴火，普通命中只有短火星。
 *
 * 自由 3D 瞄准：可以朝任意方向或空处弹出，重力与真实方块碰撞决定落点。空放时火星在弹体自己飞到
 * 的末端炸开，不回到原选中目标的位置；没有点燃就不显示持续冒火，避免误导读作已命中。
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
        description: "弹指射出一粒小而急的火种，沿浅弧自由飞出（可瞄实体，也可朝任意方向或空处弹），重力与实墙碰撞决定轨迹；命中碎成几粒火星，并可能把目标点燃。只有真的点着了才会在身上留下持续的小火，没点着只有一撮短火星。出手快、冷却短，是缺手段时最稳的一口小火力。",
        uses: ["快速弹出一粒火种补刀", "连发压血并偶尔引燃", "把火种抛过矮墙或丢向空地预判走位"],
        kind: "aim",
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
            const reach = action.range();
            const scenes = WorldFeedback.actionScenes(emberScene);
            const launch = action.origin();
            const offset = action.targetPosition().minus(launch);
            const direction = offset.length() < 0.01 ? action.direction() : offset.unit();
            // 空放落点：弹体按给定初速与下坠自己飞到射程尽头，不回到原选中目标。
            const flightTicks = Math.max(1, reach / Math.max(0.2, speed));
            const drop = 0.5 * gravity * flightTicks * flightTicks;
            const emptyEnd = launch.plus(direction.scale(reach)).plus(WorldCombat.point(0, -drop, 0));
            let settled = false, resolved = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            sound(action, "cobblemon:move.ember.actor");
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/fire/flame", tint: 0xFF9A3C, glow: true, scale: scale
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius, gravity: gravity, lifetime: 200,
                direction: direction, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    resolved = true;
                    const scope = current.world();
                    const point = hit.position();
                    const target = hit.target();
                    let burned = false;
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                        const landed = impact(current, hit, "ember", power,
                            { damage: damageSpec("ember", "spark"), status: "burn", chance: burnChance });
                        if (landed && scope.valid(target)) {
                            const body = scope.observe(target);
                            const at = body !== null ? body.position() : point;
                            // 长烧表现只在真实灼伤身份已存在时开启；没点着就只放短火星。
                            burned = CombatStatus.has(scope, target, "burn");
                            if (burned) {
                                WorldFeedback.emit(scope, emberScene, 1, at,
                                    { moment: "burn", target: String(target.ref()), sparks: sparks, scale: scale, intensity: intensity }, 90);
                                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), emberBurnText, [], 26);
                            }
                        }
                    }
                    WorldFeedback.emit(scope, emberScene, 1, point,
                        { moment: "burst", target: target !== null ? String(target.ref()) : "", burned: burned ? 1 : 0,
                            sparks: sparks, scale: scale, intensity: intensity }, 24);
                    sound(current, "cobblemon:impact.fire");
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!resolved) {
                    // 空放：在弹体自己飞到的末端收一小撮火星，不回到起始点。
                    WorldFeedback.emit(current.world(), emberScene, 1, emptyEnd,
                        { moment: "fizzle", sparks: Math.max(3, Math.round(sparks * 0.5)), scale: scale }, 18);
                }
                finish(current);
            });
            scenes.show(action, "trail", launch,
                { moment: "flight", projectile: flight, sparks: sparks, scale: scale, intensity: intensity });
        }
    });
}
