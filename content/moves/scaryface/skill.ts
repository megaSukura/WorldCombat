/**
 * 鬼面 / Scary Face — 执行组织。
 *
 * 核心念头：猛地转过脸，正对着一个看得见的对手，把可怖的表情钉进它眼里。目光是媒介，不需要飞行物，
 *   所以只在看得见的地方成立——掩体、距离、一次只能瞪一个，是它天然的空门。
 *
 * 出手：短起手（windup 在脸前聚起阴郁的暗紫）后提交；凝视本身不产生任何实体。
 * 命中：目标挂共享的 world_combat:scary_face_terror（身份 world_combat:status/feared），
 *       再 NativeEffects.boost 大幅下降速度；当场被吓得向后一缩（displace），随即僵住片刻（rooted）。
 * 视线：要求 world.clear 通视；被掩体挡住时只播 blocked，不掉任何东西。
 * 反制：躲进掩体、拉开到凝视距离之外、或集火逼它用掉这一次。
 */
namespace PokemonSkills {
    function scaryfaceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: scaryfaceId,
        name: "鬼面",
        description: "猛地转过脸，用一个看得见的对手正对着的可怖表情吓住它，大幅降低它的速度；被掩体挡住视线时无效。",
        uses: ["拦下一个冲得最快、最麻烦的对手", "在被近身前先把对方拖慢", "为队友争取拉开距离的时间"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 150,
        style: "terror",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[scaryfaceId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(scaryfaceId, "tempo", context)),
                recover: p(scaryfaceId, "recover", context),
                cooldown: Math.round(p(scaryfaceId, "recharge", context)),
                active: 1,
                range: p(scaryfaceId, "gazeRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("scaryface-windup", scaryfaceScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function () { return { radius: 6, geometry: "line", style: "terror", color: 0x5B2A86, label: "鬼面" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(3, Math.round(p(scaryfaceId, "drop", action))));
            const fear = Math.max(60, Math.round(p(scaryfaceId, "fearTicks", action)));
            const recoil = Math.max(0, p(scaryfaceId, "recoil", action));
            const freeze = Math.max(0, Math.round(p(scaryfaceId, "freeze", action)));
            sound(action, "minecraft:entity.enderman.scream");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, scaryfaceScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            if (at === null) { done(action); return; }
            if (!world.clear(origin, at.position())) {
                WorldFeedback.emit(world, scaryfaceScene, 1, origin, { moment: "blocked", target: String(target.ref()) }, 18);
                WorldFeedback.text(world, scaryfaceAbove(origin), "world_combat.move.scaryface.text.blocked", [], 26);
                done(action);
                return;
            }
            MobEffects.apply(world, target, scaryfaceEffect, fear, 0);
            NativeEffects.boost(world, target, "spe", -drop);
            const away = at.position().minus(origin);
            if (recoil > 0 && away.length() > 0.01) world.displace(target, away.unit().scale(recoil));
            if (freeze > 0) WorldEffects.apply(world, target, "rooted", {}, freeze);
            WorldFeedback.emit(world, scaryfaceScene, 1, at.position(),
                { moment: "gaze", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                    drop: drop, shards: 12 + drop * 10 }, 26);
            WorldFeedback.text(world, scaryfaceAbove(at.position()), "world_combat.move.scaryface.text.gaze", [drop], 34);
            done(action);
        }
    });

    // 恐惧存续期间，目标头顶持续冒出被吓出的暗紫余悸。
    WorldCombat.on("world_combat:move_scaryface/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== scaryfaceEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "scaryface:" + String(actor.ref()), scaryfaceScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
