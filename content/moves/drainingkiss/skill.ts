/**
 * 吸取之吻 / drainingkiss 的出手方式。
 *
 * 核心念头：凑到对手脸前，用一个吻把它的一口气吸过来——它比同族任何一口都黏，抽回的比例超过一半以上。
 *
 * 两幕：
 *   起（windup，提交前）：唇边亮起粉光、几颗心向内收拢，只播预告。
 *   吻（kiss → sip / mend，提交后）：贴身送上一吻，命中即结算 `peck` 接触伤害；伤害的 3/4 经共享 `drain`
 *       转回自身，同时沿「目标→自身」抽出一束玫红光点，施法者身上浮起回血光。亲空只散开一点心。
 *
 * 与家族分开：食梦必须先睡着、吸取是藤不脱手、花粉团按对象分红伤；只有它是**贴身而回的吻**，
 *   汲取比例最高（0.75）、出手最短；画面读法是一束心从对手身上被收回来。
 *
 * 命中、防御、相性与暴击走共享 `hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    const drainingkissKissText = "world_combat.move.drainingkiss.text.kiss";
    const drainingkissMendText = "world_combat.move.drainingkiss.text.mend";
    const drainingkissMissText = "world_combat.move.drainingkiss.text.miss";

    define({
        id: drainingkissId,
        cooldownParameter: "recharge",
        name: "Draining Kiss",
        description: "用一个吻吸取对手的HP。回复给予对手伤害的一半以上的HP。",
        uses: ["贴身把对手的一口气吸回来", "血量偏低时用最短的一吻续航", "在缠斗里顺手把血线拉回来"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.4,
        prepare: 6,
        active: 1,
        recover: 8,
        cooldown: 26,
        style: "kiss",
        defaults: { swoon: false, ai: { maxChase: 8, healBelow: 0.85 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(drainingkissId, "radius", pokemon) * 1.8 : 0.72, geometry: "circle", style: "kiss", color: 0xFF8FB8,
                label: config && config.swoon === true ? "吸取之吻·沉醉" : "吸取之吻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[drainingkissId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(drainingkissId, "tempo", context)),
                recover: Math.round(p(drainingkissId, "aftercast", context)),
                cooldown: Math.round(p(drainingkissId, "recharge", context)),
                active: 1,
                range: p(drainingkissId, "reach", context) + 0.3
            };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.25) return "out-of-range";
            return world.clear(action.origin(), body.position()) ? "" : "no-line";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:drainingkiss:" + action.id(), drainingkissScene, 1, action.origin(),
                JSON.stringify({ moment: "lean", target: action.target() === null ? "" : String(action.target()!.ref()),
                    swoon: config && config.swoon === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            const power = p(drainingkissId, "peck", action);
            const share = p(drainingkissId, "sap", action);
            const radius = p(drainingkissId, "radius", action);
            const hearts = Math.max(6, Math.round(p(drainingkissId, "hearts", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.42));
            const self = world.observe(action.actor());
            const from = self === null ? action.origin() : self.position();

            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, drainingkissScene, 1, action.targetPosition(), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 0.9, 0)), drainingkissMissText, [], 22);
                sound(action, "minecraft:entity.allay.item_taken");
                done(action);
                return;
            }
            const body = world.observe(target);
            const at = body === null ? action.targetPosition() : body.position();
            sound(action, "minecraft:entity.allay.item_given");
            const landed = hurt(action, target, drainingkissId, power,
                { damage: damageSpec(drainingkissId, "peck"), contact: true, drain: share });

            const flow = from.minus(at), span = flow.length();
            const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
            WorldFeedback.emit(world, drainingkissScene, 1, at,
                { moment: "kiss", target: String(target.ref()), span: span, hearts: hearts, scale: scale,
                    direction: [inward.x(), inward.y(), inward.z()], intensity: Math.max(0.6, Math.min(2.2, power / 50)) }, 30);
            sound(action, "cobblemon:impact.fairy");
            if (landed) {
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), drainingkissKissText, [], 22);
                const heal = Math.round(share * 100);
                if (self !== null && self.health() < self.maxHealth()) {
                    WorldFeedback.emit(world, drainingkissScene, 1, from, { moment: "mend", sap: heal, hearts: hearts }, 26);
                    WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.25, 0)), drainingkissMendText, [heal], 22);
                }
            }
            done(action);
        }
    });
}
