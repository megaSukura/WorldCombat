/**
 * 种子炸弹 / seedbomb 的出手方式。
 *
 * 核心念头：**把一荚硬种高抛过顶，让它们从上方落下来砸在目标身上**——不是沿直线打出去，而是从天而降的一小片种雨。
 * 它的形状是一条慢而陡的弧线，落点周围的一小圈地面被种雨盖住，谁站在里面就挨整荚硬种。
 *
 * 三幕：
 *   起（windup，提交前）：低头把硬种收进荚里，脚边种屑向内聚。
 *   抛（toss → rain，提交后）：种荚沿高抛弧线飞过顶（看得见、能躲），落到目标附近的地面或目标身上；
 *       在头顶 `dropHeight` 处散开成 `seeds` 颗硬种，硬种一颗颗从上方落下，盖住 `spread` 半径的一小圈。
 *   砸（burst / miss）：落种砸实，圈里的非友方各挨一次 `volley` 硬种伤害，命中处崩开 `chaff` 片碎壳；打空只有碎壳。
 *
 * 与同族分开：能量球是沿直线飞行的实心球、命中在地面长草；种子炸弹走高抛弧线、从上方落种、没有地面残留。
 *
 * 配置 `heavy`（重荚）由 resolve 改时序、由公式改威力／种数／落点：开启＝少而重、覆盖窄；关闭＝多而轻、覆盖宽。
 */
namespace PokemonSkills {
    const seedbombScene = "world_combat:move_seedbomb";
    const seedbombMissText = "world_combat.move.seedbomb.text.miss";

    define({
        id: "seedbomb",
        cooldownParameter: "recharge",
        name: "Seed Bomb",
        description: "把一荚硬种高抛过顶，让它们从上方落在目标身上：落点周围一小圈内的非友方各挨一次硬种伤害。重荚少而重、覆盖窄；散荚多而轻、覆盖宽。",
        uses: ["隔着一小块地形把硬种砸到目标头顶", "罩住一小片落点逼对手走位", "中距离单体点射的一记重击"],
        kind: "enemy",
        range: 10,
        maxRange: 15,
        prepare: 11,
        active: 0,
        recover: 10,
        cooldown: 32,
        style: "verdant",
        defaults: { heavy: false, ai: { maxChase: 12, preferGround: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("seedbomb", "spread", pokemon), geometry: "circle", style: "verdant",
                color: 0x8FBF3A, label: config && config.heavy === true ? "重荚种子炸弹" : "散荚种子炸弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["seedbomb"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("seedbomb", "tempo", context)),
                recover: Math.round(p("seedbomb", "aftercast", context)),
                cooldown: Math.round(p("seedbomb", "recharge", context)),
                active: skills["seedbomb"].active,
                range: p("seedbomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_seedbomb:windup", seedbombScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("seedbomb", "volley", action);
            const seeds = Math.max(6, Math.round(p("seedbomb", "seeds", action)));
            const spread = Math.max(1.2, p("seedbomb", "spread", action));
            const drop = Math.max(3.5, p("seedbomb", "dropHeight", action));
            const seedRadius = Math.max(0.2, p("seedbomb", "seedRadius", action));
            const speed = Math.max(0.4, p("seedbomb", "arcSpeed", action));
            const range = Math.max(4, p("seedbomb", "reach", action));
            const chaff = Math.max(8, Math.round(p("seedbomb", "chaff", action)));
            const gravity = 0.05;
            const scale = spread / 1.5;
            const intensity = Math.max(0.5, Math.min(2.2, power / 80));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.seedbomb.actor");

            /** 落种砸下：盖住落点周围一小圈，圈里的非友方各挨一次整荚伤害，然后崩出碎壳。 */
            function land(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                const canopy = point.plus(WorldCombat.point(0, drop, 0));
                let hits = 0; const first = { ref: "" };
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, spread, { below: 2.0, above: 2.5 }),
                    function (victim, facts) {
                        if (!hurt(current, victim, "seedbomb", power, { damage: damageSpec("seedbomb", "volley"), contact: false })) return;
                        if (hits === 0) first.ref = String(victim.ref());
                        hits++;
                    });
                WorldFeedback.emit(scope, seedbombScene, 1, canopy,
                    { moment: "rain", seeds: seeds, chaff: chaff, drop: drop, scale: scale, intensity: intensity }, 28);
                WorldFeedback.emit(scope, seedbombScene, 1, point,
                    { moment: hits > 0 ? "burst" : "miss", target: first.ref !== "" ? first.ref : undefined,
                        seeds: seeds, chaff: chaff, hits: hits, scale: scale, intensity: intensity }, 24);
                scope.sound("cobblemon:impact.grass", point, 16, "{}");
                if (hits === 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), seedbombMissText, [], 24);
            }

            const targetPoint = action.targetPosition();
            const direction = LivingActions.ballistic(origin, targetPoint, speed, gravity) || aim(action);
            const flightRange = Math.max(range, origin.minus(targetPoint).length() + 6);
            const flight = LivingActions.projectile(action, {
                speed: speed, direction: direction, range: flightRange, radius: seedRadius, gravity: gravity,
                lifetime: Math.max(40, Math.round(flightRange / Math.max(0.2, speed) + 40)),
                appearance: { item: "minecraft:pumpkin_seeds", scale: Math.max(0.7, Math.min(1.6, seedRadius * 2.4)) },
                impact: function (current: CombatAction, hit: CombatImpact) { land(current, hit.position()); }
            }, function (current: CombatAction) { finish(current); });
            WorldFeedback.keep(world, "seedbomb:toss:" + String(action.id()), seedbombScene, 1, origin,
                { moment: "toss", projectile: flight, seeds: seeds, scale: scale }, 200);
        }
    });
}
