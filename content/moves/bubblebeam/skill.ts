/**
 * 泡沫光线 / bubblebeam 的出手方式。
 *
 * 核心念头：**一记会黏的泡沫浪**。它打不疼，但被打到的人身上黏一层泡沫、越走越沉；泡沫还沿准线涌开一个
 *   锥面，把主目标身边的敌人也糊上。它区别于同族水招的地方就是这个「黏」——水枪细快不沾、水炮整柱顶开、
 *   加农水炮高压加力竭，只有泡沫光线会留下共享身份 `world_combat:status/foamed`。
 *
 * 三幕：
 *   起（windup，提交前）：口边冒起成串小泡、越冒越密，只播预告（可被打断）。
 *   涌（stream → burst / splat，提交后）：一团泡沫迎头飞出；命中非友方结算 `foam` 特殊伤害、按 `slowChance`
 *       掉 `slowStages` 级速度、黏上泡沫；打到硬面只有一响。
 *   黏（douse / cling / pop）：泡沫沿准线继续涌开 `foamRadius` 的锥面，锥内其余敌人吃较轻的 `splash`、也被黏住；
 *       泡沫在身上持续冒泡，走完 `clingTicks` 自然爆掉（pop），或被外力清掉。
 *
 * 与同族分开：唯一会黏住目标、把人变慢的水属性喷射；画面上是一大团会散开会浮起的泡，不是水线也不是水柱。
 *
 * 配置 `dense`（浓沫）由公式改威力／概率／级数／半径／时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const bubblebeamScene = "world_combat:move_bubblebeam";
    const bubblebeamFoamEffect = "world_combat:bubblebeam_foam";
    const bubblebeamClingText = "world_combat.move.bubblebeam.text.cling";
    const bubblebeamMissText = "world_combat.move.bubblebeam.text.miss";

    /** 在目标身上黏一层泡沫：借共享身份 foamed（本单元发明的概念），独一无二地替换同类载体。 */
    function bubblebeamFoam(world: CombatWorld, victim: CombatActor, ticks: number): boolean {
        return CombatStatus.apply(world, victim, "foamed", bubblebeamFoamEffect,
            Math.max(40, Math.round(ticks)), 0, { unique: true, secondary: true });
    }

    /** 按概率把速度降下来：共享能力等级阶梯，对宝可梦、原版生物、玩家同一条路。 */
    function bubblebeamSlow(world: CombatWorld, victim: CombatActor, chance: number, stages: number): boolean {
        if (world.random() >= chance) return false;
        NativeEffects.boost(world, victim, "spe", -stages);
        return true;
    }

    define({
        id: "bubblebeam",
        name: "Bubble Beam",
        description: "喷出一团会黏的泡沫：主目标吃泡沫伤害、有概率掉速度并被泡沫黏住，泡沫还沿准线涌开、糊住目标前方的敌人。浓沫更黏更软；急泡泡更快更远、但黏不住。",
        uses: ["把跑得快的对手黏住、压它速度", "糊住目标前方一片，为队友创造先手", "留一段共享身份 foamed 给别的招以后消费"],
        kind: "enemy",
        range: 12,
        maxRange: 17,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "foam",
        defaults: { dense: false, ai: { maxChase: 14, crippleRunners: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bubblebeam", "foamRadius", pokemon), geometry: "area", style: "foam",
                color: 0x8FE0F0, label: config && config.dense === true ? "浓沫光线" : "泡沫光线" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bubblebeam"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bubblebeam", "tempo", context)),
                recover: Math.round(p("bubblebeam", "aftercast", context)),
                cooldown: Math.round(p("bubblebeam", "recharge", context)),
                active: 0,
                range: p("bubblebeam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("bubblebeam:charge", bubblebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", bubbles: Math.round(p("bubblebeam", "bubbles", action)),
                    dense: config && config.dense === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("bubblebeam", "foam", action);
            const splash = p("bubblebeam", "splash", action);
            const chance = Math.max(0.02, Math.min(0.9, p("bubblebeam", "slowChance", action)));
            const stages = Math.max(1, Math.min(2, Math.round(p("bubblebeam", "slowStages", action))));
            const cling = Math.max(60, Math.round(p("bubblebeam", "clingTicks", action)));
            const radius = Math.max(0.18, p("bubblebeam", "radius", action));
            const foamRadius = Math.max(1.2, p("bubblebeam", "foamRadius", action));
            const speed = Math.max(0.6, p("bubblebeam", "velocity", action));
            const bubbles = Math.max(12, Math.round(p("bubblebeam", "bubbles", action)));
            const dense = !!(config && config.dense);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.28));
            const intensity = Math.max(0.5, Math.min(2.2, power / 65));
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.bubblebeam.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range() + 1.5, radius: radius,
                lifetime: Math.max(24, Math.round((action.range() + 1.5) / Math.max(0.2, speed) + 14)),
                appearance: { sprite: "cobblemon:generic/bubble/bigbubble", tint: 0x8FE0F0, glow: true,
                    scale: Math.max(0.8, Math.min(1.8, radius / 0.28)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    let heading = point.minus(origin);
                    if (heading.length() < 0.05) heading = current.direction();
                    const flat = WorldCombat.point(heading.x(), 0, heading.z());
                    const direction = flat.length() > 0.001 ? flat.unit() : WorldCombat.point(0, 0, 1);
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        struck = true;
                        if (!impact(current, hit, "bubblebeam", power, { damage: damageSpec("bubblebeam", "foam") })) return;
                        const slowed = bubblebeamSlow(scope, victim, chance, stages);
                        bubblebeamFoam(scope, victim, cling);
                        WorldFeedback.emit(scope, bubblebeamScene, 1, point,
                            { moment: "burst", target: String(victim.ref()), bubbles: bubbles, stages: stages,
                                slowed: slowed ? 1 : 0, scale: scale, intensity: intensity }, 24);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), bubblebeamClingText, [stages], 26);
                        sound(current, "cobblemon:move.bubblebeam.target");
                        sound(current, "minecraft:block.bubble_column.bubble_pop");
                    } else {
                        WorldFeedback.emit(scope, bubblebeamScene, 1, point,
                            { moment: "splat", bubbles: bubbles, scale: scale, intensity: intensity }, 20);
                        scope.sound("minecraft:block.bubble_column.bubble_pop", point, 14, "{}");
                    }
                    // 泡沫沿准线继续涌开：锥面内的其余敌人被溅沫糊上、也黏住。
                    WorldGeometry.selectEnemies(scope,
                        WorldGeometry.sector(point, direction, foamRadius, 110, { below: 1.8, above: 2.4 }),
                        function (other, facts) {
                            if (victim !== null && String(other.ref()) === String(victim.ref())) return;
                            hurt(current, other, "bubblebeam", splash, { damage: damageSpec("bubblebeam", "splash") });
                            const slowed = bubblebeamSlow(scope, other, chance * 0.8, stages);
                            bubblebeamFoam(scope, other, Math.round(cling * 0.8));
                            WorldFeedback.emit(scope, bubblebeamScene, 1, facts.position(),
                                { moment: "douse", target: String(other.ref()), bubbles: Math.round(bubbles * 0.7),
                                    stages: stages, slowed: slowed ? 1 : 0, scale: Math.max(0.5, scale * 0.85),
                                    intensity: Math.max(0.4, intensity * 0.75) }, 20);
                        });
                    WorldFeedback.emit(scope, bubblebeamScene, 1, point,
                        { moment: "foam", radius: foamRadius, bubbles: bubbles,
                            scale: Math.max(0.6, Math.min(2.2, foamRadius / 2.0)), intensity: intensity }, 26);
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    const scope = current.world();
                    WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 0.9, 0)),
                        bubblebeamMissText, [], 22);
                }
                finish(current);
            });

            WorldFeedback.keep(world, "bubblebeam:stream:" + action.id(), bubblebeamScene, 1, origin,
                { moment: "stream", projectile: flight, bubbles: bubbles, scale: scale, intensity: intensity,
                    dense: dense ? 1 : 0 }, 90);
        }
    });

    // 泡沫自然爆开（或被外力清掉）：在目标身上补一记小泡爆，让「黏着」有明确的结束。
    WorldCombat.on("world_combat:move_bubblebeam/pop", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bubblebeamFoamEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, bubblebeamScene, 1, body.position(),
            { moment: "pop", target: String(actor.ref()), cause: String(data.cause || "") }, 18);
    });

    // 黏着期间在脚边维持一小圈缓慢上浮的泡：少而稳，让出本体视线。
    WorldCombat.on("world_combat:move_bubblebeam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bubblebeamFoamEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "bubblebeam:foam:" + String(actor.ref()), bubblebeamScene, 1, body.position(),
            { moment: "cling", target: String(actor.ref()), bubbles: 10 }, 40);
    });
}
