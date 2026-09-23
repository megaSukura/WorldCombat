/**
 * 折弯汤匙 / Kinesis — 执行组织。
 *
 * 核心念头：当场把一把汤匙掰弯，只弯给一个看得见它的目标看。汤匙不需要飞过去，靠的是「你看得见我」，
 *   所以射程最远，却也是全族唯一会明确落空的一招——墙后、柱子后、走出视线，这场戏就白演。
 *
 * 出手：短起手（windup 在手里聚起蓝紫念力）后提交；慢掰与快掰在深度与出手速度之间取舍。
 * 命中：先按 world.clear 要求通视；不通视就在落点播一段落空。通过后目标挂共享的 world_combat:kinesis_beguiled
 *       （身份 world_combat:status/beguiled），宝可梦再调用 NativeEffects.boost 下降原生命中等级；
 *       同时在施法者身前短暂生成一把 spinning 的弯曲汤匙（cobblemon:twisted_spoon 的临时实体外观），
 *       它只存在 spoonTicks，是这场戏的实物，不是留在世界里的东西。
 * 反制：掩体与距离；单目标，不会波及旁人。
 */
namespace PokemonSkills {
    function kinesisAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.05, 0)); }

    define({
        id: kinesisId,
        cooldownParameter: "recharge",
        name: "折弯汤匙",
        description: "当场掰弯一把汤匙，只引开一个看得见它的对手的注意：命中下降、攻击变弱。射程很远，但被掩体挡住就落空。",
        uses: ["远距离点名一个最难缠的对手", "在掩体对峙时削弱对方的远程", "给决斗或撤退创造单点优势"],
        kind: "enemy",
        range: 7,
        maxRange: 10,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 180,
        style: "bend",
        defaults: { bend: "twist" },
        fields: [
            choice("bend", "手法", ["twist", "snap"], ["慢掰", "快掰"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[kinesisId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const twist = !(config && config.bend === "snap");
            return {
                prepare: Math.round(p(kinesisId, "tempo", context)) + (twist ? 6 : 0),
                recover: p(kinesisId, "recover", context),
                cooldown: Math.round(p(kinesisId, "recharge", context) * (twist ? 1.2 : 0.95)),
                active: 1,
                range: p(kinesisId, "gazeRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("kinesis-windup", kinesisScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", bend: config && config.bend === "snap" ? "snap" : "twist",
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[kinesisId], detail: { values: config } };
            return { radius: p(kinesisId, "gazeRange", context), geometry: "line", style: "bend",
                color: 0x8FA8E0, label: config && config.bend === "snap" ? "折弯汤匙·快掰" : "折弯汤匙·慢掰" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const twist = !(config && config.bend === "snap");
            const target = action.target();
            const body = world.observe(self);
            const origin = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.7, 0));
            sound(action, "cobblemon:move.kinesis.actor");
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, kinesisScene, 1, action.targetPosition(), { moment: "fizzle" }, 18);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            const delta = point.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            if (!world.clear(origin, point)) {
                // 掩体挡住了戏法：汤匙还在手里，但它看不见。
                WorldFeedback.emit(world, kinesisScene, 1, point, { moment: "fizzle", target: String(target.ref()) }, 22);
                WorldFeedback.text(world, kinesisAbove(point), "world_combat.move.kinesis.text.blocked", [], 30);
                done(action);
                return;
            }
            const stage = Math.max(1, Math.min(3, Math.round(p(kinesisId, "blindStage", action)) + (twist ? 1 : 0)));
            const duration = Math.max(60, Math.round(p(kinesisId, "duration", action) * (twist ? 1.4 : 1)));
            const spoonTicks = Math.max(10, Math.round(p(kinesisId, "spoonTicks", action)));
            const swirl = Math.max(10, Math.round(p(kinesisId, "swirl", action)));
            // 身前举起的那把汤匙：临时实体外观，只存在 spoonTicks，不是留在世界里的东西。
            const hand = origin.plus(direction.scale(Math.min(1.4, Math.max(0.6, distance * 0.5))));
            try { world.helper(hand, 1, JSON.stringify({ item: "cobblemon:twisted_spoon", spin: true, scale: 1.0, glow: true }), spoonTicks); }
            catch (error) { }
            MobEffects.apply(world, target, kinesisEffect, duration, 0);
            NativeEffects.boost(world, target, "accuracy", -stage);
            WorldFeedback.emit(world, kinesisScene, 1, point,
                { moment: "beguile", target: String(target.ref()), stage: stage, swirl: swirl, duration: duration, scale: 1 + stage * 0.15 }, 40);
            WorldFeedback.text(world, kinesisAbove(point), "world_combat.move.kinesis.text.beguile", [stage], 38);
            sound(action, "cobblemon:move.kinesis.target");
            done(action);
        }
    });

    // 失神存续期间，目标头顶持续转着没散去的念力。
    WorldCombat.on("world_combat:move_kinesis/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== kinesisEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 5 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "kinesis:" + String(actor.ref()), kinesisScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
