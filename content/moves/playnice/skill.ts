/**
 * 和睦相处 / Play Nice — 执行组织。
 *
 * 核心念头：当着对手的面摊开双手表示和睦，让追上来的东西先停手。手势以自身为圆心摊开，所以它不要瞄准，
 *   但要求别人看得见你——想让它成立，必须自己站进人堆里。除了降攻击，它当场平息对方的敌意，
 *   并在身份存续期间维持，是本组唯一能让人「不打你」的一招；代价是这份和睦很脆——一旦自己这边先动手，
 *   对方立刻翻脸，只有降下去的攻击还留着。
 *
 * 出手：短起手（windup 在身侧摊开手势）后提交，以自身为圆心摊开。
 * 命中：WorldGeometry.select 取半径内看得见、尚未被劝住的非友方，按救援需求排序后逐个尝试。
 *       先落实际降攻（NativeEffects.boost 的真实变化才用于反馈），再挂真实 MobEffect 载体；载体落地后由
 *       一只托管效果以 effect owner 身份申请 world.targetLease(actor, null, ticks)。只有原生事件真实接受，
 *       才宣布暂缓选敌。Boss 等拒绝该入口时只留降攻的小纹，不硬控。
 * 维持与破裂：托管效果按 watch 核对载体与租约（active && owned && mode=calm）；载体被驱散或租约丢失即结束。
 *       一旦对方受到来自施法者阵营的实际正伤害，托管的和睦结束，对方可以重新还手，但已降的攻击等级保留。
 * 反制：背对、看不见手势，或者干脆离远到半径之外；它不造成伤害，也不阻止对方绕后。玩家与绕过 Mob.setTarget
 *       的自定义 Boss 调度拿不到原生租约，本招只据真实结果反馈，不冒充停手。
 */
namespace PokemonSkills {
    function playniceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    const playniceCalmMark = "world_combat:playnice_calm";
    const playniceBefriendText = "world_combat.move.playnice.text.befriend";
    const playniceHeldText = "world_combat.move.playnice.text.held";
    const playniceOfferText = "world_combat.move.playnice.text.offer";
    const playniceOfferHeldText = "world_combat.move.playnice.text.offer.held";

    interface PlayniceCandidate { actor: CombatActor; need: number; }

    /** 救援需求排序：正在打施法者或其友军的敌人最该先劝，其次离施法者越近越急。 */
    function playniceNeed(world: CombatWorld, self: CombatActor, facts: CombatObservation, origin: CombatPoint): number {
        const engaged = facts.attacking();
        let need = 0;
        if (engaged !== null && world.valid(engaged)
            && (String(engaged.key()) === String(self.key()) || world.allied(engaged, self))) need += 100;
        return need + Math.max(0, 40 - facts.position().minus(origin).length());
    }

    /**
     * 劝一个人：先申请原生目标租约平息敌意，成功后在和睦期间降低攻击。
     * 真实降攻与是否接受平息分别反馈；只有租约真实接受才挂握手与共享身份。返回实际降级与是否平息。
     */
    function playniceCalmActor(world: CombatWorld, actor: CombatActor, drop: number, calm: number, sparkles: number): { calmed: boolean; dropped: number } {
        const before = NativeEffects.effectiveStage(world, actor, "atk");
        let dropped = 0;
        const carrier = MobEffects.apply(world, actor, playniceEffect, calm, 0);
        const at = world.observe(actor);
        if (carrier === null || !carrier.tagged(playniceSpot) || at === null) return { calmed: false, dropped: dropped };
        try {
            // 单独的精确目标托管效果持有租约：开始必须原生事件接受，效果结束即清除租约。
            world.effect(playniceCalmMark, actor,
                JSON.stringify({ caster: String(world.source().ref()), drop: dropped, carrier: MobEffects.anchor(carrier) }), calm);
        } catch (error) {
            MobEffects.consume(world, actor, String(carrier.id()));
            return { calmed: false, dropped: dropped };
        }
        let lease: any = null;
        try { lease = JSON.parse(world.targetLeaseState(actor)); } catch (error) { lease = null; }
        if (!lease || lease.active !== true || lease.mode !== "calm") {
            // 拒绝平息（Boss、玩家、无当前目标等）：start 已撤回载体，不施加降攻。
            WorldFeedback.emit(world, playniceScene, 1, at.position(),
                { moment: "downdrop", target: String(actor.ref()), drop: dropped, sparkles: sparkles }, 26);
            return { calmed: false, dropped: dropped };
        }
        NativeEffects.boostWindow(world, actor, { atk: -drop }, calm, "world_combat:move/playnice", carrier, null);
        dropped = Math.max(0, before - NativeEffects.effectiveStage(world, actor, "atk"));
        WorldFeedback.emit(world, playniceScene, 1, at.position(),
            { moment: "befriend", target: String(actor.ref()), drop: dropped, sparkles: sparkles }, 30);
        WorldFeedback.text(world, playniceAbove(at.position()), dropped > 0 ? playniceBefriendText : playniceHeldText, [dropped], 40);
        return { calmed: true, dropped: dropped };
    }

    // 托管效果：申请并维持真实原生目标租约，核对载体生命周期；握手表现绑在它上面，随它一起结束。
    WorldCombat.effect(playniceCalmMark, 1, 1200000, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid play nice calm source");
        if (typeof value.drop !== "number" || !isFinite(value.drop) || value.drop < 0) throw new Error("Invalid play nice calm drop");
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("Invalid play nice calm carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(playniceCalmMark, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.carrier)) { effect.end(); return; }
        if (!world.targetLease(actor, null, effect.remaining())) {
            // 原生入口拒绝：撤掉载体，不施加降攻。
            MobEffects.consume(world, actor, state.carrier.id);
            effect.end(); return;
        }
        const body = world.observe(actor);
        if (body !== null)
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_playnice/hold", playniceScene, 1, body.position(),
                { moment: "hold", target: String(actor.ref()), drop: state.drop });
        effect.schedule("watch", "watch", 10, "{}");
    });
    // 载体被驱散、被替换，或租约丢失/到期：结束和睦，仍属本效果的载体一并撤回，不留失效锚。
    WorldCombat.effectHandler(playniceCalmMark, "watch", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.carrier)) { effect.end(); return; }
        let lease: any = null;
        try { lease = JSON.parse(world.targetLeaseState(actor)); } catch (error) { lease = null; }
        if (!lease || lease.active !== true || lease.owned !== true || lease.mode !== "calm") {
            MobEffects.consume(world, actor, state.carrier.id);
            effect.end(); return;
        }
        effect.schedule("watch", "watch", 10, "{}");
    });
    WorldCombat.effectHandler(playniceCalmMark, "end", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (world.valid(actor) && MobEffects.matches(world, actor, state.carrier))
            MobEffects.consume(world, actor, state.carrier.id);
    });
    WorldCombat.effectHandler(playniceCalmMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 已开始或正在进行的攻击也要停：仍持有本招真实 calm 租约的载体，其可识别的直接攻击提交被共享闸门拒绝。
    CombatStatus.actions.define({ id: "world_combat:move_playnice/calm", after: ["cobblemon_world_combat:skill-policy"],
        apply: function (context: CombatStatus.ActionPolicy) {
            const world = context.world, actor = context.actor;
            if (!world.valid(actor) || !CombatStatus.has(world, actor, playniceSpot)) return;
            const direct = context.phase === "damage" ? DamageSemantics.read(context.metadata).attack
                : context.phase === "commit" && !!context.move && typeof context.move.category === "function"
                    && String(context.move.category()) !== "status";
            if (!direct) return;
            let lease: any = null;
            try { lease = JSON.parse(world.targetLeaseState(actor)); } catch (error) { return; }
            if (!lease || lease.active !== true || lease.mode !== "calm") return;
            context.blocked.calmed = true;
            context.detail.calmed = { status: "befriended" };
        } });

    // 己方先动手就把这份和睦打碎：受来自施法者阵营的实际正伤害时，结束平息、断开握手；攻击下降保留。
    WorldCombat.on("world_combat:move_playnice/break", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), victim = event.target(), attacker = event.actor();
        if (victim === null || !world.valid(victim)) return;
        const data = JSON.parse(String(event.data() || "{}"));
        if (!(data.actual > 0)) return;
        const marks = world.effects(victim, playniceCalmMark);
        if (!marks.length) return;
        for (let index = 0; index < marks.length; index++) {
            const state = JSON.parse(String(marks[index].data()));
            const caster = world.actor(state.caster);
            const fromCasterSide = caster !== null && world.valid(caster)
                && (String(attacker.key()) === String(caster.key()) || world.allied(attacker, caster));
            if (!fromCasterSide) continue;
            MobEffects.consume(world, victim, playniceEffect);
            world.operation(marks[index].id(), "world_combat:dispel", "{}");
            const body = world.observe(victim);
            if (body !== null)
                WorldFeedback.emit(world, playniceScene, 1, body.position(),
                    { moment: "break", target: String(victim.ref()), drop: state.drop }, 22);
        }
    });

    define({
        id: playniceId,
        cooldownParameter: "recharge",
        name: "和睦相处",
        description: "当着对手摊开双手表示和睦，让它失去战斗的气力，降低攻击，并当场平息它的敌意、暂时不再动手。手势以自身为圆心摊开，必须站进人堆里、还要让对方看得见；这份和睦很脆，自己这边一动手就会破裂。",
        uses: ["被围住时劝停一圈近战", "让追上来的敌人先松口再脱离", "给队友争取重新站位的时间"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "friendship",
        defaults: { bow: false },
        fields: [
            flag("bow", "作揖")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[playniceId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(playniceId, "tempo", context)),
                recover: p(playniceId, "recover", context),
                cooldown: Math.round(p(playniceId, "recharge", context)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("playnice-windup", playniceScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", bow: config && config.bow ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const bow = !!(config && config.bow);
            return { radius: p(playniceId, "offerRadius", pokemon), geometry: "circle", style: "friendship", color: 0x6FC26F,
                label: bow ? "和睦相处·作揖" : "和睦相处" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const radius = Math.max(1.6, p(playniceId, "offerRadius", action));
            const drop = Math.max(1, Math.min(3, Math.round(p(playniceId, "atkDrop", action))));
            const calm = Math.max(40, Math.round(p(playniceId, "calmTicks", action)));
            const cap = Math.max(1, Math.round(p(playniceId, "maxTargets", action)));
            const sparkles = Math.max(10, Math.round(p(playniceId, "sparkles", action)));
            sound(action, "minecraft:block.note_block.chime");
            const candidates: PlayniceCandidate[] = [];
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius), function (actor, facts) {
                if (facts.friendly() || !facts.visible() || CombatStatus.has(world, actor, playniceSpot)) return;
                candidates.push({ actor: actor, need: playniceNeed(world, self, facts, origin) });
            });
            candidates.sort(function (a, b) { return b.need - a.need; });
            let attempts = 0, calmed = 0, applied = 0;
            for (let index = 0; index < candidates.length && attempts < cap; index++) {
                const result = playniceCalmActor(world, candidates[index].actor, drop, calm, sparkles);
                attempts++;
                if (result.dropped > applied) applied = result.dropped;
                if (result.calmed) calmed++;
            }
            WorldFeedback.emit(world, playniceScene, 1, origin,
                { moment: "offer", radius: radius, caught: candidates.length, calmed: calmed, drop: applied,
                    sparkles: sparkles, scale: radius / 3.0 }, 34);
            if (calmed > 0)
                WorldFeedback.text(world, playniceAbove(origin), applied > 0 ? playniceOfferText : playniceOfferHeldText,
                    [calmed, applied], 40);
            done(action);
        }
    });
}
