/**
 * 腹鼓 / Belly Drum —— 执行组织。
 *
 * 核心念头：用小半条命换一阵满级物攻；鼓声一起，全场都听得见，代价也摆在明面上。
 *
 * 出手：共享节奏。windup 是连续鼓点，随时可被打断且不花 PP；ready 在提交前拒绝生命已在下限之下的施法者。
 * 结果：提交后把生命压到 keep 比例，用 NativeEffects.boostWindow 把 stages 级物攻挂上持续状态
 *   world_combat:bellydrum 作为力量窗口；boostWindow 拥有这份贡献，窗口结束或被清除时只撤回自己那几级，
 *   不会因为期间别处升降阶而多扣。
 * 反制：鼓点准备期可被打断（不花 PP）；起鼓后生命只有一半，且力量只维持一个窗口，对手可以拖过窗口或趁
 *   低血强攻。
 */
namespace PokemonSkills {
    const bellydrumScene = "world_combat:move_bellydrum";
    const bellydrumEffect = "world_combat:bellydrum";
    const bellydrumTextSurge = "world_combat.move.bellydrum.text.surge";
    const bellydrumTextFade = "world_combat.move.bellydrum.text.fade";

    function bellydrumAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    // 力量窗口由 boostWindow 拥有：它只撤回自己贡献的那几级，不会因为窗口期间别处降攻而多扣。
    // 这里只负责读窗口剩余时间与等级，把「近身鼓点余纹」按剩余时间续播，并记录窗口总长用来算衰退。
    var bellydrumWindowTicks: { [ref: string]: number } = {};

    function bellydrumHold(actor: CombatActor, effect: CombatMobEffect, total: number): any {
        var beats = Math.max(1, effect.amplifier());
        var remaining = Math.max(0, effect.duration());
        var wane = total > 0 ? Math.max(0, Math.min(1, 1 - remaining / total)) : 0;
        var glow = Math.max(1, Math.round(beats * Math.pow(1 - wane, 2)));
        return { moment: "hold", target: String(actor.ref()), beats: beats, remaining: remaining, wane: wane, glow: glow };
    }

    WorldCombat.on("world_combat:bellydrum/hold-start", "world_combat:mob_effect_added", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== bellydrumEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        var body = world.observe(actor); if (!body) return;
        var effect = world.mobEffect(actor, bellydrumEffect); if (!effect) return;
        bellydrumWindowTicks[String(actor.ref())] = Math.max(1, Number(data.duration) || effect.duration());
        WorldFeedback.keep(world, "world_combat:move_bellydrum/hold/" + String(actor.ref()), bellydrumScene, 1,
            body.position(), bellydrumHold(actor, effect, bellydrumWindowTicks[String(actor.ref())]), 30);
    });

    WorldCombat.on("world_combat:bellydrum/hold-tick", "world_combat:mob_effect_tick", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== bellydrumEffect || event.world().tick() % 10 !== 0) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        var effect = world.mobEffect(actor, bellydrumEffect); if (!effect) return;
        var body = world.observe(actor); if (!body) return;
        var total = bellydrumWindowTicks[String(actor.ref())] || Math.max(1, effect.duration());
        WorldFeedback.keep(world, "world_combat:move_bellydrum/hold/" + String(actor.ref()), bellydrumScene, 1,
            body.position(), bellydrumHold(actor, effect, total), 30);
    });

    WorldCombat.on("world_combat:bellydrum/fade", "world_combat:mob_effect_removed", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== bellydrumEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        delete bellydrumWindowTicks[String(actor.ref())];
        var body = world.observe(actor);
        if (body) {
            WorldFeedback.emit(world, bellydrumScene, 1, body.position(),
                { moment: "fade", target: String(actor.ref()), beats: Math.max(1, Math.round(Number(data.amplifier) || 1)) }, 26);
            WorldFeedback.text(world, bellydrumAbove(body.position()), bellydrumTextFade, [], 26);
        }
    });

    define({
        id: bellydrumId, name: "腹鼓",
        description: "拍响腹鼓，把自己的生命压到一条底线，换取满级物攻；力量维持一段可见的窗口，窗口结束或提前被清除时会收回那些能力等级。生命低于那条底线时无法起鼓。",
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
            // 先把这次的净贡献算出来（会被上限截断），boostWindow 才拥有并只撤回这一笔；状态只承载可见窗口。
            var before = NativeEffects.effectiveStage(world, self, "atk");
            var granted = Math.max(-6, Math.min(6, before + stages)) - before;
            var surge = Math.max(20, Math.round(p(bellydrumId, "surgeTicks", action)));
            var carrier = MobEffects.apply(world, self, bellydrumEffect, surge, Math.max(0, granted));
            NativeEffects.boostWindow(world, self, { atk: stages }, surge, "bellydrum", carrier);
            sound(action, "minecraft:block.note_block.bass");
            WorldFeedback.emit(world, bellydrumScene, 1, body.position(),
                { moment: "surge", target: String(self.ref()), beats: Math.max(1, granted), burst: Math.max(1, granted) * 10,
                    paidRatio: body.maxHealth() > 0 ? paid / body.maxHealth() : 0 }, 34);
            WorldFeedback.text(world, bellydrumAbove(body.position()), bellydrumTextSurge, [], 30);
            done(action);
        }
    });
}
