/**
 * 聚宝功 / payday —— 注册与动作。
 *
 * 核心念头：把一小把金币在手里掂亮，随手朝对手甩出去。币串点状打在它身上（物理伤害），
 *   打偏和打剩的落在落点周围，是世界里真能捡的 Relic Coin。这招便宜、快、单发；
 *   它留下的东西就是它本身——零钱铺在场上，谁都能捡。
 *
 * 两幕：
 *   起（windup，提交前）：手里的钱掂亮、金光聚拢（`action.present` 预告）。
 *   撒（throw → hit / scatter）：提交后币串沿直线飞向目标（外观就是真硬币），命中或落地时
 *     结算一次物理伤害；随后把 `scatter` 枚真币撒在落点周围（`world.dropItem`，带初速自然落地）。
 *
 * 与同族分开：淘金潮是自身为中心、铺满一圈的大雨；聚宝功是**单体、快出手、少而实**的一手钱。
 * 配置 `largesse`（大把撒钱）由公式改撒币数与单发、由 resolve 改时序。
 */
namespace PokemonSkills {
    const paydayScene = "world_combat:move_payday";
    const paydayScatterText = "world_combat.move.payday.text.scatter";

    /** 在落点周围撒下真币：优先用 Cobblemon 的遗迹硬币，缺失时退回金粒；带初速自然落地。 */
    function paydayScatter(current: CombatAction, point: CombatPoint, count: number, fling: number): void {
        const scope = current.world();
        const item = scope.item("cobblemon:relic_coin") !== null ? "cobblemon:relic_coin" : "minecraft:gold_nugget";
        for (let index = 0; index < count; index++) {
            const angle = scope.random() * Math.PI * 2, speed = fling * (0.6 + scope.random() * 0.8);
            const drop = WorldCombat.point(Math.cos(angle) * 0.35, 0.35 + scope.random() * 0.3, Math.sin(angle) * 0.35);
            try {
                scope.dropItem(point.plus(drop), item, 1,
                    JSON.stringify({ pickupDelay: 16, velocity: [Math.cos(angle) * speed, 0.2, Math.sin(angle) * speed] }));
            } catch (error) { /* 掉落被拒绝时只保留粒子与机制，不影响施放 */ }
        }
        WorldFeedback.emit(scope, paydayScene, 1, point, { moment: "scatter", scatter: count, fling: fling }, 26);
        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), paydayScatterText, [count], 30);
        scope.sound("cobblemon:block.relic_coin_pouch.place", point, 12, "{}");
    }

    define({
        id: "payday",
        cooldownParameter: "wait",
        name: "Pay Day",
        description: "把一小把金币掂亮后朝对手甩出去：币串点状打在它身上，打偏和打剩的落在落点周围，是世界里真能捡的硬币。大把撒钱式撒得更多，但单发更轻、更慢。",
        uses: ["用便宜、快的一发换血", "在落点周围留下能捡的零钱", "远距离先手骚扰，不占太多出手节奏"],
        kind: "enemy",
        range: 12,
        maxRange: 17,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 22,
        style: "coin",
        defaults: { largesse: false, ai: { maxChase: 14 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: Math.max(0.5, p("payday", "radius", pokemon)), geometry: "circle", style: "coin",
                color: 0xFFD24A, label: config && config.largesse === true ? "大把撒钱" : "聚宝功" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["payday"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("payday", "tempo", context)),
                recover: Math.round(p("payday", "aftercast", context)),
                cooldown: Math.round(p("payday", "wait", context)),
                active: 0,
                range: p("payday", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("payday:flip", paydayScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", largesse: config && config.largesse === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p("payday", "coin", action);
            const speed = p("payday", "throwSpeed", action);
            const radius = p("payday", "radius", action);
            const coins = Math.max(5, Math.round(p("payday", "coins", action)));
            const scatter = Math.max(2, Math.round(p("payday", "scatter", action)));
            const fling = Math.max(0.1, p("payday", "fling", action));
            const scale = Math.max(0.6, Math.min(1.6, radius / 0.2));
            const intensity = Math.max(0.5, Math.min(2, power / 40));
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.arrow.shoot");
            WorldFeedback.keep(world, "payday:throw:" + action.id(), paydayScene, 1, action.origin(),
                { moment: "throw", coins: coins, scale: scale, intensity: intensity }, 80);

            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 160,
                appearance: { item: "cobblemon:relic_coin", glow: true, scale: Math.max(0.7, Math.min(1.4, scale)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const victim = hit.target();
                    struck = true;
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        impact(current, hit, "payday", power, { damage: damageSpec("payday", "coin") });
                        WorldFeedback.emit(scope, paydayScene, 1, hit.position(),
                            { moment: "hit", target: String(victim.ref()), coins: coins, scale: scale, intensity: intensity }, 24);
                        sound(current, "cobblemon:block.relic_coin_sack.hit");
                    } else {
                        WorldFeedback.emit(scope, paydayScene, 1, hit.position(),
                            { moment: "hit", coins: coins, scale: scale, intensity: intensity }, 20);
                        sound(current, "minecraft:block.amethyst_block.chime");
                    }
                    paydayScatter(current, hit.position(), scatter, fling);
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!struck) paydayScatter(current, current.targetPosition(), scatter, fling);
                finish(current);
            });
        }
    });
}
