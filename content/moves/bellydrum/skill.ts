/**
 * 腹鼓 / Belly Drum —— 执行组织。
 *
 * 核心念头：用小半条命换一阵满级物攻；鼓声一起，全场都听得见，代价也摆在明面上。
 *
 * 出手：共享节奏。windup 是连续鼓点，随时可被打断且不花 PP；ready 在提交前拒绝生命已在下限之下的施法者。
 * 结果：提交后把生命压到 keep 比例，NativeEffects.boost 加满 stages 级物攻，并挂上持续状态
 *   world_combat:bellydrum 作为力量窗口；窗口结束（world_combat:mob_effect_removed）时收回那几个等级。
 * 反制：鼓点准备期可被打断（不花 PP）；起鼓后生命只有一半，且力量只维持一个窗口，对手可以拖过窗口或趁
 *   低血强攻。
 */
namespace PokemonSkills {
    const bellydrumScene = "world_combat:move_bellydrum";
    const bellydrumEffect = "world_combat:bellydrum";
    const bellydrumTextSurge = "world_combat.move.bellydrum.text.surge";
    const bellydrumTextFade = "world_combat.move.bellydrum.text.fade";

    function bellydrumAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    // 力量窗口结束时收回鼓出来的等级，避免永久 +6。等级数从效果的 amplifier 读回。
    WorldCombat.on("world_combat:bellydrum/fade", "world_combat:mob_effect_removed", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== bellydrumEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        var stages = Math.max(1, Math.round(Number(data.amplifier) || 1));
        NativeEffects.boost(world, actor, "atk", -stages);
        var body = world.observe(actor);
        if (body) {
            WorldFeedback.emit(world, bellydrumScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 26);
            WorldFeedback.text(world, bellydrumAbove(body.position()), bellydrumTextFade, [], 26);
        }
    });

    define({
        id: bellydrumId, name: "腹鼓",
        description: "拍响腹鼓，把自己的生命压到一半，换取满级物攻；力量维持一段可见的窗口，窗口结束会收回那些能力等级。生命不足一半时无法起鼓。",
        uses: ["把生命换成爆发物攻", "在开战前把物攻拉满", "用可见的力量窗口逼对手做取舍"],
        kind: "self", range: 0, prepare: 14, active: 0, recover: 12, cooldown: 300, style: "drum", maximumTicks: 400,
        defaults: { endure: false },
        fields: [flag("endure", "持久鼓劲")],
        indicator: function (config) { return { radius: 1, style: "drum", label: config.endure === true ? "持久鼓劲" : "爆发鼓劲" }; },
        resolve: function (pokemon, config, world, actor) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[bellydrumId], detail: { values: config }, world: world || null, actor: actor || null };
            return {
                prepare: Math.round(p(bellydrumId, "drumPrepare", context)),
                recover: Math.round(p(bellydrumId, "drumRecover", context)),
                cooldown: Math.round(p(bellydrumId, "cooldown", context)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            var keep = p(bellydrumId, "keep", action);
            if (body.health() <= body.maxHealth() * keep + 0.5) return "too-weak";
            return "";
        },
        windup: function (action, _config, prepare) {
            var beats = Math.max(1, Math.round(p(bellydrumId, "stages", action)));
            action.present("bellydrum:windup", bellydrumScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()), beats: beats }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var keep = p(bellydrumId, "keep", action), stages = Math.max(1, Math.round(p(bellydrumId, "stages", action)));
            var floor = Math.max(1, body.maxHealth() * keep);
            var paid = Math.max(0, body.health() - floor);
            if (paid > 0) world.health(self, -paid, "world_combat:bellydrum");
            NativeEffects.boost(world, self, "atk", stages);
            var surge = Math.max(20, Math.round(p(bellydrumId, "surgeTicks", action)));
            MobEffects.apply(world, self, bellydrumEffect, surge, stages);
            sound(action, "minecraft:block.note_block.bass");
            WorldFeedback.emit(world, bellydrumScene, 1, body.position(),
                { moment: "surge", target: String(self.ref()), beats: stages, burst: stages * 10,
                    paidRatio: body.maxHealth() > 0 ? paid / body.maxHealth() : 0 }, 34);
            WorldFeedback.text(world, bellydrumAbove(body.position()), bellydrumTextSurge, [], 30);
            done(action);
        }
    });
}
