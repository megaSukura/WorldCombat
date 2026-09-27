/**
 * 忍耐 / bide —— 执行组织。
 *
 * 核心念头：把这段时间挨的打攒成一口闷气，站定不动，时间一到连本带利地吐回给最后打你的人。
 *
 * 三慕：
 *   起（windup，提交前）：收住架势、把力往身上聚，只播预告。
 *   忍（execute，提交后）：先立共享身份 world_combat:status/bide 的架势载体，再以载体锚点归属这一本账；
 *       这段时间里每一次外来伤害都记进账本（parameters.ts 的记账监听），并按上限截断；载体被清除/替换即停记。
 *       扎根取向下用世界已有的定身表达锁住脚步；画面按账本比例变亮，底环随剩余时间收小作倒计时。
 *   还（release，时间到自动）：账上有多重就按 payback 加倍还给最后打你的人（按真实体表距够得到才行，够不到找最近
 *       的敌人），返还读实际伤害回执；被打断/取消/清除则架势立即崩解、账本作废，这一口白忍。
 * 反制：忍耐期间站定不动、不能出手，对手可以选择先拉开、找掩体、或干脆不碰你；打扰断一样前功尽弃。
 */
namespace PokemonSkills {
    const bideHold = "world_combat:move_bide/hold";
    WorldCombat.effect(bideHold, 1, 480, "action", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(bideHold, "start", () => {});
    WorldCombat.effectHandler(bideHold, "end", effect => {
        const state = JSON.parse(effect.state()), world = effect.world(), actor = effect.target();
        if (state.root > 0) world.operation(state.root, "world_combat:dispel", "{}");
        if (state.carrier && MobEffects.matches(world, actor, state.carrier)) world.removeMobEffect(actor, state.carrier.id, state.carrier.key);
        const record = bideRaw(actor);
        if (record && record.instance === state.instance) bideEnd(actor);
        delete bideBroken[String(actor.ref())];
    });
    function bideAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.4, 0)); }

    /** 两具真实碰撞箱之间的表面距离；贴住或重叠时为 0。大体型体心远但身体贴住时仍算可达。 */
    function bideBoundsGap(a: CombatObservation, b: CombatObservation): number {
        const low = b.boundsMin(), high = b.boundsMax();
        const dx = Math.max(low.x() - a.boundsMax().x(), a.boundsMin().x() - high.x(), 0);
        const dy = Math.max(low.y() - a.boundsMax().y(), a.boundsMin().y() - high.y(), 0);
        const dz = Math.max(low.z() - a.boundsMax().z(), a.boundsMin().z() - high.z(), 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** 还手够不到账主时的备选：忍耐者周围体表最近、且真正通视的敌人。用真实碰撞箱求交，不用体心距。 */
    function bideNearest(world: CombatWorld, self: CombatActor, from: CombatObservation, reach: number): CombatActor | null {
        var best: CombatActor | null = null, bestGap = reach + 1;
        WorldGeometry.selectBodies(world, WorldGeometry.bodySphere(from.position(), reach), function (other, facts) {
            if (String(other.key()) === String(self.key()) || facts.friendly()) return;
            var gap = bideBoundsGap(from, facts);
            if (gap > reach || gap >= bestGap) return;
            if (!world.clear(from.position(), facts.position())) return;
            bestGap = gap; best = other;
        });
        return best;
    }

    define({
        freeMovement: function (config) { return !!config.rooted; },
        id: bideId,
        cooldownParameter: "recharge",
        name: "Bide",
        description: "进入忍耐架势，期间受到的每一次外来伤害都记进账本；时间到把账上伤害按 1.4–2.8 倍还给最后打你的人，够不到就找最近的敌人；没挨到打或被打断就白忍一场。",
        uses: ["在被打的一轮里攒一记大还手", "逼对手在你站定时决定要不要继续打", "把分散的小伤害聚成一记重击"],
        kind: "self",
        range: 0,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 120,
        style: "bide",
        maximumTicks: 480,
        defaults: { rooted: true, ai: { minHealth: 0.5 } },
        fields: [flag("rooted", "扎根硬忍")],
        indicator: function (config) {
            return { radius: 1, style: "bide", color: 0xE06A3C, label: config && config.rooted === true ? "忍耐·扎根" : "忍耐·且战" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[bideId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: p(bideId, "tempo", context), recover: p(bideId, "settle", context),
                cooldown: p(bideId, "recharge", context), active: 0, range: 0 };
        },
        windup: function (action, config, prepare) {
            action.present("bide:windup", bideScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", rooted: config && config.rooted === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const rooted = !!(config && config.rooted);
            const window = Math.max(30, Math.round(p(bideId, "window", action)));
            const cap = Math.max(1, body.maxHealth() * p(bideId, "capFraction", action));
            // 先立架势载体，账本才有真实归属；载体建不起来这一口就不忍。
            const carrier = MobEffects.apply(world, self, bideBraceEffect, window);
            if (carrier === null) { done(action); return; }
            bideBegin(world, self, cap, window, action.id(), MobEffects.anchor(carrier));
            const root = rooted ? world.effect("world_combat:rooted", self, "{}", window) : 0;
            const hold = action.effect(bideHold, self, JSON.stringify({ root: root, carrier: MobEffects.anchor(carrier), instance: action.id() }), window + 1);
            if (!(hold > 0)) {
                if (root > 0) world.operation(root, "world_combat:dispel", "{}");
                if (MobEffects.matches(world, self, MobEffects.anchor(carrier))) MobEffects.consume(world, self, bideBraceEffect);
                bideEnd(self); done(action); return;
            }
            sound(action, "minecraft:entity.iron_golem.damage");
            WorldFeedback.emit(world, bideScene, 1, body.position(),
                { moment: "brace", target: String(self.ref()), cap: cap, window: window, remaining: window }, 20);
            WorldFeedback.text(world, bideAbove(body.position()), bideBraceText, [Math.round(window / 20)], 26);

            let released = false;
            const ref = String(self.ref());

            function steady(current: CombatAction): void {
                if (released) return;
                const scope = current.world();
                if (!scope.valid(self)) return;
                const at = scope.observe(self);
                if (at === null) return;
                // 只读原始账本：续画不负责结账，也不在还手前后抢先删账导致空还。
                const record = bideRaw(self);
                if (record === null) return;
                if (MobEffects.read(scope, self, bideBraceEffect) === null) return;  // 载体没了就不再续画，账本交给结账/断记
                const ratio = Math.max(0, Math.min(1, record.amount / Math.max(1, record.cap)));
                const left = Math.max(0, record.window - (scope.tick() - record.start));
                WorldFeedback.onEffect(scope, hold, "bide:brace:" + ref, bideScene, 1, at.position(),
                    { moment: "brace", target: ref, charge: record.amount, cap: record.cap, remaining: left, window: record.window,
                        shellRate: Math.round(4 + 8 * ratio), glintRate: Math.round(3 + 6 * ratio),
                        ringRadius: 0.6 + 0.8 * (left / Math.max(1, record.window)) });
                current.after(10, steady);
            }

            function disperseInPlace(current: CombatAction, at: CombatObservation, charge: number, amount: number, reach: number): void {
                // 最后攻击者不可达、被墙挡住、还手被拒或没有合法敌人：这一口在自己身上散掉，不假装打中。
                sound(current, "minecraft:entity.player.attack.sweep");
                WorldFeedback.emit(current.world(), bideScene, 1, at.position(),
                    { moment: "whiff", target: ref, charge: charge, amount: amount, reach: reach }, 22);
                WorldFeedback.text(current.world(), bideAbove(at.position()), bideWhiffText, [], 24);
                done(current);
            }

            function release(current: CombatAction): void {
                if (released) return;
                released = true;
                const scope = current.world();
                // 先读原始账本算出这一次真正使用的还手伤害，再结账清除。
                const record = bideRaw(self);
                const charge = record === null ? 0 : record.amount;
                const amount = charge > 0 ? Math.round(p(bideId, "payback", current)) : 0;
                const lastSource = record === null ? "" : record.source;
                bideEnd(self);
                delete bideBroken[ref];
                MobEffects.consume(scope, self, bideBraceEffect);
                const at = scope.observe(self);
                if (at === null) { done(current); return; }
                const reach = p(bideId, "releaseReach", current);
                if (!(charge > 0)) { disperseInPlace(current, at, charge, 0, reach); return; }
                // 账主必须先通视、且体表距离在射程内才算可达；够不到就退回可达的最近敌人。
                let target: CombatActor | null = null;
                if (lastSource !== "") {
                    const candidate = scope.actor(lastSource);
                    if (candidate !== null && scope.valid(candidate) && String(candidate.key()) !== String(self.key()) && !scope.friendly(candidate)) {
                        const targetBody = scope.observe(candidate);
                        if (targetBody !== null && bideBoundsGap(at, targetBody) <= reach
                            && scope.clear(at.position(), targetBody.position())) target = candidate;
                    }
                }
                if (target === null) target = bideNearest(scope, self, at, reach);
                if (target === null) { disperseInPlace(current, at, charge, 0, reach); return; }
                const targetBody = scope.observe(target);
                const targetPoint = targetBody === null ? at.position() : targetBody.position();
                const actual = bideRawHit(current, target, amount, false);
                if (!(actual > 0)) { disperseInPlace(current, at, charge, 0, reach); return; }
                const struck = scope.observe(target);
                const point = struck === null ? targetPoint : struck.position();
                // 命中已经兑现，反馈与数字都基于这次实际回伤（护甲、免疫、Boss 规则之后）；释放路径连到真正的对象。
                sound(current, "minecraft:entity.generic.explode");
                WorldFeedback.emit(scope, bideScene, 1, at.position(),
                    { moment: "release", target: String(target.ref()), charge: charge, amount: actual, reach: reach,
                        path: [ref, String(target.ref())],
                        motes: Math.max(20, Math.round(actual * 1.5)),
                        intensity: Math.max(0.4, Math.min(2.4, actual / Math.max(1, at.maxHealth()))) }, 30);
                WorldFeedback.emit(scope, bideScene, 1, point,
                    { moment: "strike", target: String(target.ref()), amount: actual, motes: Math.max(14, Math.round(actual * 1.5)) }, 26);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), bideReleaseText, [Math.round(actual)], 28);
                if (scope.valid(target)) scope.sound("cobblemon:impact.fighting", point, 15, "{}");
                done(current);
            }

            steady(action);
            action.after(window, release);
        }
    });

    // 动作以「收招」以外的任何方式结束（中断、取消、目标/主体失效）时，立即停记这一口；崩塌反馈留给本载体的
    // 可写 tick 播，避免在读作用域里写世界。正常走完 window 的收招由 release 结账，不在此列。
    WorldCombat.on("world_combat:move_bide/cancel", "world_combat:action_ended", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.content) !== "world_combat:" + bideId) return;
        if (String(data.reason) === "finished") return;
        const actor = event.actor();
        if (actor === null || bideRaw(actor) === null || bideRaw(actor)!.instance !== Number(data.instance)) return;
        bideEnd(actor);
        bideBroken[String(actor.ref())] = true;
    });

    // 架势被外力挂断后，在本载体的可写 tick 里收掉效果并播崩塌，不留失效锚与视觉残留。
    WorldCombat.on("world_combat:move_bide/brace-broken", "world_combat:mob_effect_tick", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bideBraceEffect) return;
        const actor = event.actor();
        if (actor === null) return;
        const ref = String(actor.ref());
        if (bideBroken[ref] !== true) return;
        delete bideBroken[ref];
        const world = event.world();
        MobEffects.consume(world, actor, bideBraceEffect);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, bideScene, 1, body.position(), { moment: "broken", target: ref }, 22);
        WorldFeedback.text(world, bideAbove(body.position()), bideBrokenText, [], 24);
    });
}
