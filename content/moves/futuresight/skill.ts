/**
 * 预知未来 / futuresight —— 执行组织。
 *
 * 核心念头：不隔空即时命中，而是把一团属于自己的念力送到对手头顶，悬停一段时间后落下——
 *   延迟就是余地：对手读得到它、能抢时间治疗与加防，也能把这场战斗拖到锁定失效。
 *
 * 三幕 + 收：
 *   起（windup，提交前）：眼里聚起念光、头顶浮环，只播预告。
 *   投（execute）：把 carry 效果 world_combat:futuresight_charge 挂在施法者身上，并给目标盖上
 *       world_combat:status/futuresight 的预知印记（物品栏可见）；动作随即结束，施法者恢复自由。
 *   悬（该效果的 track）：在目标头顶凝出一团纯表现的念力（WorldFeedback.onEffect 托管，随本效果收回），
 *       逐刻跟随目标；紧收的念环与倒计时弧读出还有多久落下。它不是战斗实体，不可被攻击、也不解除预约。
 *   落（strike）：延迟到点，从实际念团位置短光路落到目标，复用共享 hurt（源=施法者）结算一次 sight
 *       特殊伤害；成功结算才播命中，被拒绝只落空。目标已离场则整团落空。
 * 反制：延迟里对手可以治疗、加防、拉开；印记被牛奶或别的招式清掉不影响已经定下的预知（梦已成真）。
 * 归属：印记是每个 charge 自己的一份 StatusContributions 贡献，多人预约各自结束，不清别人的标记；
 *   预约的最终结果按本执行 origin 显式 settle（completion:external），未到期不猜落空。
 */
namespace PokemonSkills {
    const futureSightReceipts: { [id: string]: number } = Object.create(null);
    WorldCombat.on("world_combat:futuresight/receipt", "world_combat:damage_settled", "", event => {
        const data = JSON.parse(event.data()), token = String(data.futureSightReceipt || "");
        if (Object.prototype.hasOwnProperty.call(futureSightReceipts, token))
            futureSightReceipts[token] = data.settled === true ? Math.max(0, Number(data.actual) || 0) : 0;
    });
    function futuresightAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }
    function futuresightMote(body: CombatObservation, hang: number): CombatPoint { return body.position().plus(WorldCombat.point(0, hang, 0)); }

    function futuresightChargeData(json: string): string {
        var value = JSON.parse(json);
        if (typeof value.target !== "string" || typeof value.caster !== "string") throw new Error("Invalid futuresight target");
        ["landAt", "power", "hang", "radius", "total"].forEach(function (key: string) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid futuresight state: " + key);
        });
        if (value.power <= 0 || value.hang <= 0 || value.radius <= 0 || value.total <= 0) throw new Error("Invalid futuresight values");
        return JSON.stringify(value);
    }

    // 预约兑现是一条外部完成：提交后动作结束但结果保持挂起，直到念团真正落下或预约真正结束才结清。
    ExecutionOutcomes.intentions.define({ id: "world_combat:move_futuresight/intent", apply: function (intent) {
        if (intent.action === null || intent.action.content() !== "world_combat:" + futureSightId) return;
        intent.offensive = true;
        intent.completion = "external";
    } });

    // 预知印记是每个 charge 自己的提示：一条预约一份贡献，别人结束不清我的标记。
    StatusContributions.define(futureSightSeal);

    WorldCombat.effect(futureSightCharge, 1, 480, "actor", futuresightChargeData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(futureSightCharge, "start", function (effect: CombatEffect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var target = world.actor(state.target);
        if (target === null || !world.valid(target)) { effect.end(); return; }
        var body = world.observe(target);
        if (body === null) { effect.end(); return; }
        var ticks = Math.max(20, Math.round(state.landAt - world.tick()));
        StatusContributions.upsert(world, target, futureSightSeal, String(effect.id()), {}, ticks,
            { owner: { id: effect.id(), definition: futureSightCharge, target: String(effect.source().ref()) } });
        var at = futuresightMote(body, state.hang);
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
        var at = futuresightMote(body, state.hang), remaining = Math.max(0, state.landAt - world.tick());
        // 念团只由本效果托管的场景表现：charge 结束/被清除时同步收回，不对它造成战斗影响。
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_futuresight/hang/" + effect.id(), futureSightScene, 1,
            at, { moment: "hang", target: String(target.ref()), hang: state.hang });
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_futuresight/mote/" + effect.id(), futureSightMoteScene, 1,
            at, { target: String(target.ref()), hang: state.hang, remaining: remaining, total: state.total, radius: state.radius,
                scale: Math.max(0.5, Math.min(2, state.radius / 0.6)) });
        if (world.tick() < state.landAt) effect.schedule("track", "track", 1, "{}");
    });
    WorldCombat.effectHandler(futureSightCharge, "strike", function (effect: CombatEffect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var target = world.actor(state.target);
        if (target === null || !world.valid(target) || world.observe(target) === null) {
            var self = world.observe(effect.source());
            if (self !== null) WorldFeedback.emit(world, futureSightScene, 1, futuresightAbove(self.position()), { moment: "fizzle" }, 22);
            ExecutionOutcomes.settle(world);
            effect.end();
            return;
        }
        var body = world.observe(target)!;
        var above = futuresightMote(body, state.hang);
        const token = String(effect.id()) + ":" + world.tick();
        const casterEntity = world.nativeEntity(effect.source());
        const features: PokemonDamage.Features & { futureSightReceipt: string } = {
            damage: damageSpec(futureSightId, "sight"), futureSightReceipt: token };
        let applied = false;
        futureSightReceipts[token] = 0;
        try { hurt(world, target, futureSightId, state.power, features); applied = futureSightReceipts[token] > 0; }
        finally { delete futureSightReceipts[token]; }
        if (!casterEntity || !casterEntity.isAlive() || casterEntity.isRemoved()) return;
        if (world.valid(target)) StatusContributions.remove(world, target, futureSightSeal, String(effect.id()));
        if (applied) {
            // 兑现：从实际念团位置短光路落到目标，命中反馈与真实伤害同刻。
            WorldFeedback.emit(world, futureSightMoteScene, 1, above, { moment: "strike", start: world.tick(),
                path: [[above.x(), above.y(), above.z()], [body.position().x(), body.position().y(), body.position().z()]] }, 6);
            WorldFeedback.emit(world, futureSightScene, 1, body.position(),
                { moment: "impact", target: String(target.ref()), radius: state.radius, power: state.power,
                    motes: Math.max(20, Math.round(state.power * 0.4)) }, 30);
            WorldFeedback.text(world, futuresightAbove(body.position()), futureSightHitText, [Math.round(state.power)], 30);
            world.sound("cobblemon:impact.psychic", body.position(), 16, "{}");
        } else {
            // 原生拒绝/免疫：念团在目标上方散去，不谎报命中。
            WorldFeedback.emit(world, futureSightScene, 1, above, { moment: "fizzle", target: String(target.ref()) }, 22);
        }
        ExecutionOutcomes.settle(world);
        effect.end();
    });
    WorldCombat.effectHandler(futureSightCharge, "end", function (effect: CombatEffect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var target = world.actor(state.target);
        if (target !== null && world.valid(target)) StatusContributions.remove(world, target, futureSightSeal, String(effect.id()));
        ExecutionOutcomes.settle(world);
    });
    WorldCombat.effectHandler(futureSightCharge, "operation:world_combat:dispel", function (effect: CombatEffect) { effect.end(); });

    define({
        id: futureSightId,
        cooldownParameter: "recharge",
        name: "Future Sight",
        description: "把念团预约在一个对手头顶，延迟后对它造成一次特殊伤害；期间可以治疗或加防，清掉提示标记不取消预约。施术者必须留场，目标离开可观察范围则取消。",
        uses: ["在开战前先锁定一个远处目标", "逼对手在延迟里分心应对", "布置一记延时单体重击后接着行动"],
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
                radius: p(futureSightId, "radius", action), total: delay };
            sound(action, "minecraft:entity.evoker.cast_spell");
            world.effect(futureSightCharge, self, JSON.stringify(state), delay + 120);
            WorldFeedback.emit(world, futureSightScene, 1, action.origin(),
                { moment: "charge", target: String(target.ref()), delay: delay }, 20);
            WorldFeedback.text(world, futuresightAbove(body.position()), futureSightSendText, [Math.round(delay / 20)], 30);
            done(action);
        }
    });
}
