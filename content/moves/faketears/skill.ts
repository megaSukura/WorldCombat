/**
 * 假哭 / faketears — 执行组织。
 *
 * 核心念头：当着对手的面挤出假眼泪，让它心里一软、松开特防。这是骗术——眼泪要被看见，还要离得够近；
 *   施法者越是娇小、越受珍视，这场戏越像真的。得手的一瞬间，对手还会在原地僵住片刻。
 *
 * 出手：短起手（windup 在眼角憋出泪光）后提交；不放飞行物，眼泪沿视线直接送到对方脸上。
 * 命中：目标挂共享身份 world_combat:status/flustered（本单元效果 world_combat:fake_tears_fluster，只借身份），
 *       再 NativeEffects.boost 大幅下降特防；宝可梦损失原生特防等级，其他生物落到护甲属性。
 *       同时用共享的 rooted 效果把目标定住 hesitate 刻——「不知所措」就是那一下。
 * 反制：眼泪要被看见，躲进掩体就落空（blocked）；拉开到 reach 之外够不到；它不是声音，隔着墙不管用。
 */
namespace PokemonSkills {
    function faketearsAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: faketearsId,
        name: "假哭",
        description: "当着对手的面挤出假眼泪，让它心里一软、松开特防；得手的一瞬间对手还会僵住片刻。眼泪要被看见才成立，所以射程很短、还需要通视。施法者越受珍视越可信。",
        uses: ["贴脸削掉一个特攻输出的特防", "在被贴身缠住时制造一瞬间的僵直", "配合队友抢先手，让对方来不及走位"],
        kind: "enemy",
        range: 4,
        maxRange: 6,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 110,
        style: "feign",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[faketearsId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(faketearsId, "tempo", context)),
                recover: p(faketearsId, "recover", context),
                cooldown: Math.round(p(faketearsId, "wait", context)),
                active: 1,
                range: p(faketearsId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("faketears-windup", faketearsScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function () {
            return { radius: 4, geometry: "line", style: "feign", color: 0x8FB8E8, label: "假哭" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(3, Math.round(p(faketearsId, "drop", action))));
            const fluster = Math.max(60, Math.round(p(faketearsId, "fluster", action)));
            const hesitate = Math.max(6, Math.round(p(faketearsId, "hesitate", action)));
            const tears = Math.max(8, Math.round(p(faketearsId, "tears", action)));
            sound(action, "minecraft:entity.wolf.whine");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, faketearsScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                // 眼泪没被看见：对方根本没在看，落空。
                WorldFeedback.emit(world, faketearsScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, faketearsAbove(origin), "world_combat.move.faketears.text.blocked", [], 32);
                done(action);
                return;
            }
            MobEffects.apply(world, target, faketearsEffect, fluster, 0);
            NativeEffects.boost(world, target, "spd", -drop);
            // 「不知所措」：不只是掉特防，还会在原地愣住一下。
            WorldEffects.apply(world, target, "rooted", {}, hesitate);
            world.stopMovement(target);
            WorldFeedback.emit(world, faketearsScene, 1, origin,
                { moment: "feign", path: ["source", "target"], target: String(target.ref()), tears: tears, drop: drop }, 26);
            WorldFeedback.emit(world, faketearsScene, 1, point,
                { moment: "fluster", target: String(target.ref()), drop: drop, hesitate: hesitate, hearts: 4 + drop * 4 }, 26);
            WorldFeedback.text(world, faketearsAbove(point), "world_combat.move.faketears.text.fluster", [drop], 36);
            done(action);
        }
    });

    // 阵脚未稳期间，目标眼角持续抖下零星的假泪点。
    WorldCombat.on("world_combat:move_faketears/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== faketearsEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "faketears:" + String(actor.ref()), faketearsScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
