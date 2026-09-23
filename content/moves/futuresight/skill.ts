/**
 * 预知未来 / futuresight —— 执行组织。
 *
 * 核心念头：不隔空即时命中，而是把一团属于自己的念力送到对手头顶，悬停一段时间后落下——
 *   延迟就是余地：对手读得到它、能抢时间治疗与加防，也能把这场战斗拖到锁定失效。
 *
 * 三幕 + 收：
 *   起（windup，提交前）：眼里聚起念光、头顶浮环，只播预告。
 *   投（execute）：把 carry 效果 world_combat:futuresight_charge 挂到施法者身上，并给目标盖上
 *       world_combat:status/futuresight 的预知印记（物品栏可见）；动作随即结束，施法者恢复自由。
 *   悬（该效果的 track）：在目标头顶放出一只属于自己的念力中间体（world.helper），逐刻跟随目标，
 *       画面读到它悬在哪、目标走到哪。
 *   落（strike）：延迟到点，念力从中间体位置落下，复用共享 hurt（源=施法者）结算一次 sight 特殊伤害，
 *       撤掉印记与中间体。目标已离场则落空。
 * 反制：延迟里对手可以治疗、加防、拉开；印记被牛奶或别的招式清掉不影响已经定下的预知（梦已成真）。
 */
namespace PokemonSkills {
    function futuresightAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    function futuresightChargeData(json: string): string {
        var value = JSON.parse(json);
        if (typeof value.target !== "string" || typeof value.caster !== "string") throw new Error("Invalid futuresight target");
        ["landAt", "power", "hang", "radius"].forEach(function (key: string) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid futuresight state: " + key);
        });
        if (value.power <= 0 || value.hang <= 0 || value.radius <= 0) throw new Error("Invalid futuresight values");
        if (typeof value.helper !== "string") value.helper = "";
        return JSON.stringify(value);
    }

    WorldCombat.effect(futureSightCharge, 1, 480, "actor", futuresightChargeData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(futureSightCharge, "start", function (effect: CombatEffect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var target = world.actor(state.target);
        if (target === null || !world.valid(target)) { effect.end(); return; }
        var body = world.observe(target);
        if (body === null) { effect.end(); return; }
        var at = body.position().plus(WorldCombat.point(0, state.hang, 0));
        var ticks = Math.max(20, Math.round(state.landAt - world.tick()));
        var helper: CombatActor | null = null;
        try { helper = world.helper(at, 24, JSON.stringify({ sprite: "cobblemon:generic/psychic/psyspiral", glow: true, spin: true, scale: 1 }), ticks + 60); }
        catch (error) { helper = null; }
        state.helper = helper === null ? "" : String(helper.ref());
        effect.state(JSON.stringify(state));
        CombatStatus.apply(world, target, futureSightStatus, futureSightSeal, ticks, 0, { unique: true });
        WorldFeedback.emit(world, futureSightScene, 1, at, { moment: "send", target: String(target.ref()), hang: state.hang }, 26);
        world.sound("cobblemon:move.psychic.actor", at, 14, "{}");
        effect.schedule("track", "track", 1, "{}");
        effect.schedule("strike", "strike", Math.max(1, Math.round(state.landAt - world.tick())), "{}");
    });
    WorldCombat.effectHandler(futureSightCharge, "track", function (effect: CombatEffect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var target = world.actor(state.target);
        if (target === null || !world.valid(target)) { effect.end(); return; }
        var body = world.observe(target);
        if (body === null) { effect.end(); return; }
        var at = body.position().plus(WorldCombat.point(0, state.hang, 0));
        var helper = state.helper === "" ? null : world.actor(state.helper);
        if (helper !== null && world.valid(helper)) world.teleport(helper, at);
        if (world.tick() % 4 === 0) WorldFeedback.keep(world, "futuresight:hang:" + effect.id(), futureSightScene, 1, at,
            { moment: "hang", target: String(target.ref()), hang: state.hang }, 16);
        if (world.tick() < state.landAt) effect.schedule("track", "track", 1, "{}");
    });
    WorldCombat.effectHandler(futureSightCharge, "strike", function (effect: CombatEffect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var helper = state.helper === "" ? null : world.actor(state.helper);
        var target = world.actor(state.target);
        if (target === null || !world.valid(target) || world.observe(target) === null) {
            if (helper !== null && world.valid(helper)) {
                var gone = world.observe(helper);
                if (gone !== null) WorldFeedback.emit(world, futureSightScene, 1, gone.position(), { moment: "fizzle" }, 22);
            }
            effect.end();
            return;
        }
        var body = world.observe(target)!;
        var at = body.position();
        hurt(world, target, futureSightId, state.power, { damage: damageSpec(futureSightId, "sight") });
        MobEffects.consume(world, target, futureSightSeal);
        if (helper !== null && world.valid(helper)) {
            var above = world.observe(helper);
            if (above !== null) WorldFeedback.emit(world, futureSightScene, 1, above.position(), { moment: "dive", target: String(target.ref()) }, 18);
        }
        WorldFeedback.emit(world, futureSightScene, 1, at,
            { moment: "impact", target: String(target.ref()), radius: state.radius, power: state.power,
                motes: Math.max(20, Math.round(state.power * 0.4)) }, 30);
        WorldFeedback.text(world, futuresightAbove(at), futureSightHitText, [Math.round(state.power)], 30);
        world.sound("cobblemon:impact.psychic", at, 16, "{}");
        effect.end();
    });
    WorldCombat.effectHandler(futureSightCharge, "end", function (effect: CombatEffect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var helper = state.helper === "" ? null : world.actor(state.helper);
        if (helper !== null && world.valid(helper) && world.helperSource(helper) !== null) world.removeHelper(helper);
        var target = world.actor(state.target);
        if (target !== null && world.valid(target)) MobEffects.consume(world, target, futureSightSeal);
    });
    WorldCombat.effectHandler(futureSightCharge, "operation:world_combat:dispel", function (effect: CombatEffect) { effect.end(); });

    define({
        id: futureSightId,
        cooldownParameter: "recharge",
        name: "Future Sight",
        description: "把一团属于自己的念力送到对手头顶，延迟片刻后落下造成一次特殊伤害；延迟期间对手能读出它并抢先治疗或拉开。",
        uses: ["在开战前先锁定一个远处目标", "逼对手在延迟里分心应对", "在安全距离上布置一次必至的重击"],
        kind: "enemy",
        range: 12,
        maxRange: 22,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 150,
        style: "futuresight",
        defaults: { prolonged: false, ai: { maxChase: 14 } },
        fields: [flag("prolonged", "久候")],
        indicator: function (config) {
            return { radius: 1, geometry: "point", style: "futuresight", color: 0x8A7BFF,
                label: config && config.prolonged === true ? "预知未来·久候" : "预知未来·速报" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[futureSightId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: p(futureSightId, "tempo", context), recover: p(futureSightId, "settle", context),
                cooldown: p(futureSightId, "recharge", context), active: 0, range: p(futureSightId, "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("futuresight:windup", futureSightScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()),
                    prolonged: config && config.prolonged === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const body = world.observe(target);
            if (body === null) { done(action); return; }
            const delay = Math.max(20, Math.round(p(futureSightId, "delay", action)));
            const state = { target: String(target.ref()), caster: String(self.ref()), landAt: world.tick() + delay,
                power: p(futureSightId, "sight", action), hang: p(futureSightId, "hangHeight", action),
                radius: p(futureSightId, "radius", action), helper: "" };
            sound(action, "minecraft:entity.evoker.cast_spell");
            world.effect(futureSightCharge, self, JSON.stringify(state), delay + 120);
            WorldFeedback.emit(world, futureSightScene, 1, action.origin(),
                { moment: "charge", target: String(target.ref()), delay: delay }, 20);
            WorldFeedback.text(world, futuresightAbove(body.position()), futureSightSendText, [Math.round(delay / 20)], 30);
            done(action);
        }
    });
}
