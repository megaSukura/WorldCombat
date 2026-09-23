/**
 * 食梦 / dreameater 的出手方式。
 *
 * 核心念头：只有对方睡着时，梦才会从它头顶浮起来——把梦拉成一道紫烟吸进自己口里，梦越沉，这一口越大。
 *   它不把任何东西送出去，抽取线的两端始终是睡者与施法者；醒着的目标没有梦可吃，这一招根本不会花出去。
 *
 * 两幕：
 *   起（windup，提交前）：眼眶亮起紫光、身边聚起梦境的光点，只播预告。
 *   食（draw → feast / sap，提交后）：从睡者头顶拉出一道梦烟，沿「目标→自身」抽回；这一口按 `dream` 结算，
 *       伤害的一半经共享 `drain` 转回自身。目标在命中后自然惊醒（共享睡眠在受伤时解除），所以这是一次性的抽取。
 *       目标没在做梦则公式只给 0.55 倍并很快落空（`ready` 会在提交前直接作废，不花 PP）。
 *
 * 与家族分开：其余吸招只要够到就能抽，只有食梦以「对方睡着」为前提，且吸取量随剩余睡眠增长。
 *   命中、防御、相性与暴击走共享 `hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    const dreameaterFeastText = "world_combat.move.dreameater.text.feast";
    const dreameaterSapText = "world_combat.move.dreameater.text.sap";
    const dreameaterWakeText = "world_combat.move.dreameater.text.wake";

    define({
        id: dreameaterId,
        cooldownParameter: "recharge",
        name: "Dream Eater",
        description: "吃掉正在睡觉的对手的梦进行攻击。回复对手所受到伤害的一半HP。",
        uses: ["在对方睡着时把生命抽回自己身上", "为队友制造的睡眠窗口收一次续航", "从远处对睡者下手，不必贴身"],
        kind: "enemy",
        range: 9,
        maxRange: 14.5,
        prepare: 9,
        active: 1,
        recover: 10,
        cooldown: 34,
        style: "dream",
        defaults: { deep: false, ai: { maxChase: 13, healBelow: 0.75 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(dreameaterId, "mist", pokemon) * 1.6 : 0.74, geometry: "circle", style: "dream", color: 0x8E5BD0,
                label: config && config.deep === true ? "食梦·深潜" : "食梦" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[dreameaterId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(dreameaterId, "draw", context)),
                recover: Math.round(p(dreameaterId, "settle", context)),
                cooldown: Math.round(p(dreameaterId, "recharge", context)),
                active: 1,
                range: p(dreameaterId, "reach", context) + 0.4
            };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.3) return "out-of-range";
            if (!CombatStatus.behaves(world, target, "sleep")) return "not-asleep";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), target = action.target();
            const asleep = target !== null && world.valid(target) && CombatStatus.behaves(world, target, "sleep");
            action.present("world_combat:dreameater:" + action.id(), dreameaterScene, 1, action.origin(),
                JSON.stringify({ moment: "sink", asleep: asleep ? 1 : 0, deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            const power = p(dreameaterId, "dream", action);
            const share = p(dreameaterId, "sap", action);
            const mist = p(dreameaterId, "mist", action);
            const motes = Math.max(8, Math.round(p(dreameaterId, "motes", action)));
            const scale = Math.max(0.6, Math.min(1.8, mist / 0.46));

            function fizzle(point: CombatPoint): void {
                WorldFeedback.emit(world, dreameaterScene, 1, point, { moment: "fizzle", scale: scale }, 18);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.9, 0)), dreameaterWakeText, [], 22);
                sound(action, "cobblemon:impact.psychic");
                done(action);
            }

            if (target === null || !world.valid(target) || world.friendly(target) || !CombatStatus.behaves(world, target, "sleep")) {
                fizzle(action.targetPosition());
                return;
            }
            const body = world.observe(target);
            const at = body === null ? action.targetPosition() : body.position();
            const self = world.observe(action.actor());
            const from = self === null ? action.origin() : self.position();
            const dream = CombatStatus.representative(world, target, "sleep");
            const depth = dream === null ? 0 : Math.max(0, Math.min(1, dream.duration() / 160));
            const flow = from.minus(at), span = flow.length();
            const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();

            sound(action, "cobblemon:move.psychic.actor");
            WorldFeedback.emit(world, dreameaterScene, 1, at,
                { moment: "draw", target: String(target.ref()), path: ["target", "source"],
                    direction: [inward.x(), inward.y(), inward.z()], span: span, motes: motes, depth: depth }, 34);

            const landed = hurt(action, target, dreameaterId, power,
                { damage: damageSpec(dreameaterId, "dream"), drain: share });

            WorldFeedback.emit(world, dreameaterScene, 1, at,
                { moment: "feast", target: String(target.ref()), motes: motes, depth: depth, scale: scale }, 24);
            sound(action, "cobblemon:impact.psychic");
            if (landed) {
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.15, 0)), dreameaterFeastText, [], 24);
                const heal = Math.round(share * 100);
                if (self !== null && self.health() < self.maxHealth()) {
                    WorldFeedback.emit(world, dreameaterScene, 1, from, { moment: "sap", sap: heal, motes: motes }, 26);
                    WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.25, 0)), dreameaterSapText, [heal], 24);
                }
            }
            done(action);
        }
    });
}
