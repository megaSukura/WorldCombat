/**
 * 帮助 / Helping Hand —— 执行组织。
 *
 * 核心念头：你替伙伴托一把——伸手把一小束光送进他身体，他**下一次造成直接伤害的命中**因此重得多；光用掉就散。
 *
 * 出手：短起手（windup 播伸手聚光），提交时先在伙伴身上挂原生状态 world_combat:helping_hand
 *   （共享身份 world_combat:status/helpinghand），成功后再开一份一次性的 DamageBudgets 预约，并写一条本单元的
 *   world_combat:move_helpinghand/hold 保存这份预约、载体锚、强度与光点数。任一环节失败就不留下半份帮助。
 * 兑现：伙伴的下一次直接命中在 damage_incoming 里预约这份力，真正造成正伤害后（damage_settled）才扣掉；
 *   零伤害、被护盾/免疫挡下、持续与间接伤害都不消耗，光留在身上等下一次机会。
 * 自散：一直没出手时，载体与预约一起到期；hold 每刻核对载体锚与预约，失效即自行结束并安静褪去。
 * 反制：这份力只兑现在下一次直接命中，对手可以先走位、用无敌帧或护盾吃掉这一次直接攻击，或直接集火施法者。
 */
namespace PokemonSkills {
    interface HelpinghandHold { budget: number; carrier: MobEffects.Anchor; boost: number; motes: number; caster: string; }

    function helpinghandAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    WorldCombat.effect(helpinghandHold, 1, 1200, "actor", function (json) {
        const value: HelpinghandHold = JSON.parse(json || "{}");
        if (!value || typeof value.budget !== "number" || !isFinite(value.budget) || value.budget <= 0)
            throw new Error("Invalid helpinghand hold: budget");
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("Invalid helpinghand hold: carrier");
        if (typeof value.boost !== "number" || !isFinite(value.boost) || value.boost <= 0)
            throw new Error("Invalid helpinghand hold: boost");
        if (typeof value.motes !== "number" || !isFinite(value.motes) || value.motes <= 0)
            throw new Error("Invalid helpinghand hold: motes");
        if (typeof value.caster !== "string") throw new Error("Invalid helpinghand hold: caster");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    /** The hold owns the pending-light visual and ends itself once its reservation or carrier is gone. */
    function helpinghandWatch(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), value: HelpinghandHold = JSON.parse(effect.state());
        const budget = DamageBudgets.read(world, { actor, id: value.budget });
        if (budget !== null && budget.remaining > 0 && MobEffects.matches(world, actor, value.carrier)) {
            const body = world.observe(actor);
            if (body === null) { effect.end(); return; }
            WorldFeedback.onEffect(world, effect.id(), "helpinghand:ready", helpinghandScene, 1, body.position(),
                { moment: "ready", target: String(actor.ref()), motes: value.motes });
            effect.schedule("watch", "watch", 1, "{}");
            return;
        }
        // A consumed hold is dispelled by the settled hook before this runs; anything still here lost its carrier.
        const body = world.observe(actor);
        if (body !== null && MobEffects.read(world, actor, helpinghandEffect) === null) {
            WorldFeedback.emit(world, helpinghandScene, 1, body.position(),
                { moment: "fade", target: String(actor.ref()) }, 22);
            WorldFeedback.text(world, helpinghandAbove(body.position()), helpinghandFadeText, [], 22);
        }
        effect.end();
    }
    WorldCombat.effectHandler(helpinghandHold, "start", helpinghandWatch);
    WorldCombat.effectHandler(helpinghandHold, "watch", helpinghandWatch);
    WorldCombat.effectHandler(helpinghandHold, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 兑现点：带帮助的伙伴下一次直接命中先预约这份预算，真正造成正伤害后才扣掉；失败保留。
    DamageBudgets.modifiers.define({ id: "world_combat:move_helpinghand/strike", apply: function (context) {
        const data = context.data, world = context.world, source = context.source;
        if (!(data.amount > 0) || !world.valid(source) || String(source.ref()) === String(context.target.ref())) return;
        if (!DamageSemantics.directOffense(data)) return;
        const holds = world.effects(source, helpinghandHold);
        for (let i = 0; i < holds.length; i++) {
            const value: HelpinghandHold = JSON.parse(holds[i].data());
            if (!MobEffects.matches(world, source, value.carrier)) continue;
            const claims = DamageBudgets.reserve(context, [{ actor: source, id: value.budget }]);
            if (!claims) continue;
            data.amount *= 1 + value.boost;
            return;
        }
    } });

    // 只有真正落到正伤害的那次直接命中才关待用光：扣掉载体与 hold，并炸开命中处。
    WorldCombat.on("world_combat:move_helpinghand/spend", "world_combat:damage_settled", DamageBudgets.settledHook, function (event) {
        const world = event.world(), actor = event.actor(), data = JSON.parse(String(event.data()));
        for (const result of DamageBudgets.results(data)) {
            if (!result.committed || !result.payload || result.payload.move !== "helpinghand"
                || !world.valid(actor) || result.actor !== String(actor.ref())) continue;
            const carrier: MobEffects.Anchor = result.payload.carrier;
            if (carrier) world.removeMobEffect(actor, carrier.id, carrier.key);
            world.effects(actor, helpinghandHold).forEach(function (view) {
                if (JSON.parse(view.data()).budget === result.id) world.operation(view.id(), "world_combat:dispel", "{}");
            });
            const body = world.observe(actor);
            if (body === null) continue;
            const boost = Number(result.payload.boost) || 0.5;
            const burst = Math.max(12, Math.round(16 + boost * 40));
            WorldFeedback.emit(world, helpinghandScene, 1, body.position(),
                { moment: "strike", target: String(actor.ref()), boost: boost, burst: burst }, 26);
            WorldFeedback.text(world, helpinghandAbove(body.position()), helpinghandStrikeText, [], 24);
            world.sound("minecraft:block.amethyst_block.chime", body.position(), 14, "{}");
        }
    });

    define({
        id: helpinghandId,
        cooldownParameter: "recharge", name: "帮助",
        description: "伸手托伙伴一把：把一小束光送进他身体，让他下一次造成直接伤害的命中更重；用掉即散，不用则自行褪去。只能帮助离自己够近的伙伴。",
        uses: ["让伙伴的下一发大招更重", "在队友连招前先托一把", "把一次命中机会放大成一次击倒"],
        kind: "friend", range: 4, maxRange: 6,
        prepare: 6, active: 0, recover: 5, cooldown: 48, style: "help",
        defaults: { rally: false },
        fields: [flag("rally", "同心协力")],
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon, skill: skills[helpinghandId], detail: { values: config }, world: world || null, actor: actor || null };
            return {
                prepare: Math.max(2, Math.round(p(helpinghandId, "tempo", context))),
                recover: Math.round(p(helpinghandId, "aftercast", context)),
                cooldown: Math.round(p(helpinghandId, "recharge", context)) + (config && config.rally ? 8 : 0),
                active: 0, range: p(helpinghandId, "reach", context)
            };
        },
        ready: function (action) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "invalid-target";
            return "";
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(helpinghandId, "reach", pokemon) : 4, geometry: "circle", style: "help",
                color: 0xFFD98A, label: config && config.rally ? "同心协力" : "帮助" };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_helpinghand:windup", helpinghandScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(self) || !world.valid(target)) { done(action); return; }
            if (String(target.ref()) === String(self.ref()) || !world.friendly(target)) { done(action); return; }
            const body = world.observe(self), ally = world.observe(target);
            if (body === null || ally === null) { done(action); return; }
            if (ally.position().minus(body.position()).length() > p(helpinghandId, "reach", action)) { done(action); return; }
            const boost = Math.max(0.4, Math.min(0.95, p(helpinghandId, "assist", action)));
            const ticks = Math.max(50, Math.round(p(helpinghandId, "assistTicks", action)));
            const motes = Math.max(8, Math.round(p(helpinghandId, "motes", action)));
            const carrier = MobEffects.apply(world, target, helpinghandEffect, ticks, 0);
            if (carrier === null) { done(action); return; }
            const anchor = MobEffects.anchor(carrier);
            const budget = DamageBudgets.open(world, target, ticks, { uses: 1, anchor: anchor,
                payload: { move: "helpinghand", carrier: anchor, boost: boost, motes: motes, caster: String(self.ref()) } });
            if (budget === null) { world.removeMobEffect(target, anchor.id, anchor.key); done(action); return; }
            world.effect(helpinghandHold, target, JSON.stringify({ budget: budget.id, carrier: anchor, boost: boost, motes: motes, caster: String(self.ref()) }), ticks);
            sound(action, "minecraft:block.amethyst_block.chime");
            WorldFeedback.emit(world, helpinghandScene, 1, ally.position(),
                { moment: "reach", path: [String(self.ref()), String(target.ref())], target: String(target.ref()), motes: motes, boost: boost }, 22);
            WorldFeedback.text(world, helpinghandAbove(ally.position()), helpinghandReadyText, [motes], 30);
            done(action);
        }
    });
}
