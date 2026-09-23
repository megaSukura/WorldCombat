/**
 * 撒娇 / Charm — 执行组织。
 *
 * 核心念头：凑近一个对手，用撒娇把它的战意拖进心软里——它下不去手，攻击大幅下降；目光落在谁身上，
 *   谁才会中招。贴近撒娇卸得深，飞吻够得远，两者不能兼得。
 *
 * 两幕：
 *   起（windup 播「抬眼」，提交前只观察与预告，可被打断，打断不花代价）。
 *   中（提交后）：一个看得见的目标挂共享的 world_combat:charm_heart（身份 world_combat:status/charmed），
 *     再 NativeEffects.boost 下降攻击；一串心沿视线从施法者飞进对手心里。
 * 视线：要求 world.clear 通视；被掩体挡住时只播 blocked，不掉任何东西。
 * 反制：躲到掩体后、或用距离换掉这一次；只有单体，也拦不住另一边的敌人。
 */
namespace PokemonSkills {
    function charmAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: charmId,
        cooldownParameter: "recharge",
        name: "撒娇",
        description: "凑近一个看得见的对手撒娇，把它的战意拖软，大幅降低它的攻击；被掩体挡住就落空。也可以改送飞吻，够得更远，但卸掉的劲更少。",
        uses: ["让追上来的物攻威胁出手变软", "在它冲上来前先把它的攻击压下去", "用飞吻在稍远处补一记削弱"],
        kind: "enemy",
        range: 3,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 130,
        style: "charm",
        defaults: { kiss: false },
        fields: [
            flag("kiss", "飞吻")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[charmId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(charmId, "tempo", context)),
                recover: p(charmId, "recover", context),
                cooldown: Math.round(p(charmId, "recharge", context)),
                active: 1,
                range: p(charmId, "charmRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("charm-windup", charmScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", kiss: config && config.kiss ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const kiss = !!(config && config.kiss);
            return { radius: kiss ? 8 : 3, geometry: "line", style: "charm", color: 0xF28FB0,
                label: kiss ? "撒娇·飞吻" : "撒娇" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(2, Math.round(p(charmId, "drop", action))));
            const linger = Math.max(80, Math.round(p(charmId, "heartTicks", action)));
            const hearts = Math.max(12, Math.round(p(charmId, "hearts", action)));
            const kiss = !!(config && config.kiss);
            sound(action, kiss ? "minecraft:entity.allay.ambient_without_item" : "minecraft:entity.cat.purr");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, charmScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                // 目光被掩体挡住：对方看不到撒娇，落空。
                WorldFeedback.emit(world, charmScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, charmAbove(point), "world_combat.move.charm.text.blocked", [], 30);
                done(action);
                return;
            }
            MobEffects.apply(world, target, charmEffect, linger, 0);
            NativeEffects.boost(world, target, "atk", -drop);
            WorldFeedback.emit(world, charmScene, 1, point,
                { moment: "charm", path: ["source", "target"], target: String(target.ref()),
                    drop: drop, hearts: hearts, kiss: kiss ? 1 : 0 }, 30);
            WorldFeedback.text(world, charmAbove(point), "world_combat.move.charm.text.charm", [drop], 36);
            done(action);
        }
    });

    // 心软存续期间，目标头顶持续浮起下不去手的心。
    WorldCombat.on("world_combat:move_charm/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== charmEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "charm:" + String(actor.ref()), charmScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
