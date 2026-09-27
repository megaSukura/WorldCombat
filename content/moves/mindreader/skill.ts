/** A target-bound read: real movement hints and one successful direct hit, with no global accuracy stage change. */
namespace PokemonSkills {
    function mindreaderAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    WorldCombat.effect(mindreaderMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.target !== "string" || !value.target) throw new Error("Invalid mindreader mark: target");
        ["motes", "reveal", "budgetId", "focus"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid mindreader mark: " + key);
        });
        if (value.carrier !== undefined && value.carrier !== null) {
            if (typeof value.carrier.id !== "string" || typeof value.carrier.key !== "string") throw new Error("Invalid mindreader mark: carrier");
        }
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mindreaderMark, "start", function () { });
    WorldCombat.effectHandler(mindreaderMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function mindreaderMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, mindreaderMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function mindreaderReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, mindreaderMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }
    /**
     * 趋势虚线：每 pulse 刻采一次目标真实速度，得到一条「从当前位置沿当前方向、长度封顶 cap 格」的短虚线；
     * 静止收成一点，遇可确认实墙截断且绝不越过起点。载荷传方向与长度（而不是固定的两个端点），
     * 客户端每帧把整条线按目标当前位置整体平移，两端始终同源，箭头不会反指。表现绑在本次读数标记上，读结束即随标记清理。
     */
    function mindreaderTrendUpdate(world: CombatWorld, actor: CombatActor, markId: number, mark: any, at: CombatObservation): void {
        const base = at.position().plus(WorldCombat.point(0, -0.4 * at.height(), 0));
        const velocity = at.velocity(), speed = velocity.length();
        let moving = speed >= mindreaderMoveEpsilon;
        let direction = moving ? velocity.unit() : WorldCombat.point(0, 0, 0);
        let length = moving ? Math.min(speed * mindreaderTrend, mindreaderTrendCap) : 0;
        if (moving && length > 0) {
            // 只有真正被墙挡住才裁剪；裁剪后不再退回越过起点。
            const wall = WorldGeometry.blockHit(world, base, base.plus(direction.scale(length)));
            if (wall) length = Math.max(0, Math.min(length, wall.position().minus(base).length() - 0.15));
        }
        if (length < 0.05) { moving = false; length = 0; direction = WorldCombat.point(0, 0, 0); }
        WorldFeedback.onEffect(world, markId, "world_combat:move_mindreader/trend", mindreaderTrendScene, 1, base,
            { moment: "trend", target: String(mark.target),
                base: [base.x(), base.y(), base.z()], dir: [direction.x(), direction.y(), direction.z()], len: length,
                anchorDrop: 0.1 * at.height(),
                moving: moving ? 1 : 0, motes: Math.max(6, Math.round(Number(mark.motes) || 14)),
                outline: Math.max(0.2, at.width() * 0.65),
                intensity: Math.max(0.5, Math.min(2, speed * 6 + 0.5)) });
    }
    /** 收束这层读：撤标记、预约预算与本次载体，并按原因收尾表现。 */
    function mindreaderClose(world: CombatWorld, actor: CombatActor, cause: string, point: CombatPoint | null): void {
        const mark = mindreaderMarkOf(world, actor);
        if (mark === null) return;
        mindreaderReleaseMark(world, actor);
        if (Number(mark.budgetId) > 0) world.operation(mark.budgetId, "world_combat:dispel", "{}");
        if (mark.carrier && MobEffects.matches(world, actor, mark.carrier)) MobEffects.consume(world, actor, mindreaderEffect);
        if (cause === "spent") {
            const body = point === null ? world.observe(actor) : null;
            const at = point === null ? (body === null ? null : body.position()) : point;
            if (at === null) return;
            const motes = Math.max(10, Math.round(Number(mark.motes) || 14));
            // 兑现只落在被读目标身上：念波由目标向外炸开，不再宣称念线沿线缩回。
            WorldFeedback.emit(world, mindreaderScene, 1, at,
                { moment: "strike", target: String(mark.target),
                    motes: motes, intensity: Math.max(0.8, Math.min(2.2, motes / 14 + 0.5)) }, 26);
            world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
            WorldFeedback.text(world, mindreaderAbove(at), mindreaderReadText, [], 26);
            return;
        }
        if (cause !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, mindreaderScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, mindreaderAbove(body.position()), mindreaderFadeText, [], 22);
    }

    NativeEffects.aimRules.define({ id: "world_combat:move_mindreader/precision", apply: context => {
        const world = context.world, actor = context.source, mark = mindreaderMarkOf(world, actor);
        if (!mark || mark.target !== String(context.target.ref()) || !mark.carrier || !MobEffects.matches(world, actor, mark.carrier)) return;
        if (context.data && !DamageSemantics.directOffense(context.data)) return;
        const handle = { actor, id: mark.budgetId }, budget = DamageBudgets.read(world, handle);
        if (!budget || budget.available < 1) return;
        if (context.data && !DamageBudgets.reserve({ world, data: context.data }, [handle])) return;
        context.precision = Math.max(context.precision, CombatStages.accuracyMultiplier(mark.focus));
    } });
    // Only the reserved, successful hit on this target consumes the read; misses and native refusals release it.
    WorldCombat.on("world_combat:move_mindreader/spend", "world_combat:damage_settled", DamageBudgets.settledHook, event => {
        const world = event.world(), source = event.actor();
        if (!world.valid(source)) return;
        const mark = mindreaderMarkOf(world, source);
        if (mark === null) return;
        const data = JSON.parse(String(event.data()));
        if (!DamageBudgets.results(data).some(result => result.id === mark.budgetId && result.committed && result.active)) return;
        const target = event.target(), victim = target && world.valid(target) ? world.observe(target) : null;
        mindreaderClose(world, source, "spent", victim === null ? null : victim.position());
    });

    // 自散/外解：窗口走到头或被牛奶一类效果解除时，收回本次读势；自然到期额外播一次褪去。
    WorldCombat.on("world_combat:move_mindreader/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mindreaderEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const mark = mindreaderMarkOf(world, actor);
        if (mark === null) return;
        // 刷新时旧载体被移除而新载体仍在：这不是读结束，不撤新的窗口。
        if (mark.carrier && MobEffects.read(world, actor, mindreaderEffect) !== null && MobEffects.matches(world, actor, mark.carrier)) return;
        mindreaderClose(world, actor, String(data.cause), null);
    });

    // 存续期：每 4 刻按目标真实速度更新一次趋势虚线；目标失效或离场即收。
    WorldCombat.on("world_combat:move_mindreader/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mindreaderEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const mark = mindreaderMarkOf(world, actor);
        if (mark === null) return;
        const target = world.actor(String(mark.target));
        if (target === null || !world.valid(target)) { mindreaderClose(world, actor, "lost", null); return; }
        if (world.tick() % mindreaderPulse !== 0) return;
        const views = world.effects(actor, mindreaderMark);
        if (!views.length) return;
        const at = world.observe(target);
        if (at === null) return;
        mindreaderTrendUpdate(world, actor, views[0].id(), mark, at);
    });

    define({
        id: mindreaderId,
        cooldownParameter: "recharge",
        name: "心之眼",
        description: "看清一个对手的动向，短暂照亮它并显示移动趋势。对它的下一次成功攻击会更准，攻击其他目标不受这次读势影响。",
        uses: ["在对手横移或撤退前先看清它的走向", "读清一个善于闪避的对手，为随后的追击创造机会", "追踪读势期间移到掩体后的目标"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 92,
        style: "read",
        defaults: { predict: false },
        fields: [flag("predict", "预读")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[mindreaderId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(2, Math.round(p(mindreaderId, "tempo", context))),
                recover: Math.round(p(mindreaderId, "aftercast", context)),
                cooldown: Math.round(p(mindreaderId, "recharge", context)),
                active: 1,
                range: p(mindreaderId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(mindreaderId, "reach", pokemon) : 8, geometry: "line", style: "read",
                color: 0xB07CE8, label: config && config.predict ? "心之眼·预读" : "心之眼" };
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_mindreader:windup", mindreaderScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", predict: config && config.predict ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, mindreaderScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (point.minus(origin).length() > p(mindreaderId, "reach", action) || !world.clear(origin, point)) {
                WorldFeedback.emit(world, mindreaderScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, mindreaderAbove(point), "world_combat.move.mindreader.text.blocked", [], 28);
                done(action);
                return;
            }
            const ticks = Math.max(60, Math.round(p(mindreaderId, "readTicks", action)));
            const reveal = Math.max(40, Math.round(p(mindreaderId, "reveal", action)));
            const motes = Math.max(8, Math.round(p(mindreaderId, "motes", action)));
            const focus = Math.max(1, Math.min(6, Math.round(p(mindreaderId, "focus", action))));
            const previous = MobEffects.read(world, actor, mindreaderEffect);
            const carrier = MobEffects.apply(world, actor, mindreaderEffect, ticks, previous ? previous.amplifier() : 0);
            if (!carrier) {
                // 原生拒绝这次载体：已有的读原样保留，本次直接收场，不建可被空消费的标记。
                WorldFeedback.emit(world, mindreaderScene, 1, point, { moment: "fizzle" }, 16);
                done(action); return;
            }
            const budget = DamageBudgets.open(world, actor, carrier.duration(), { uses: 1, anchor: MobEffects.anchor(carrier) });
            if (!budget) {
                if (MobEffects.matches(world, actor, MobEffects.anchor(carrier))) MobEffects.consume(world, actor, mindreaderEffect);
                if (self !== null) WorldFeedback.emit(world, mindreaderScene, 1, self.position(), { moment: "fizzle" }, 16);
                done(action); return;
            }
            MobEffects.apply(world, target, "minecraft:glowing", reveal, 0);
            mindreaderClose(world, actor, "replaced", null);
            // 标记略长于载体，让载体自然到期后的收尾仍能读到本层读；趋势表现绑在它上面随读结束清理。
            const markId = world.effect(mindreaderMark, actor, JSON.stringify({
                target: String(target.ref()), motes: motes, reveal: reveal, budgetId: budget.id, focus: focus,
                carrier: MobEffects.anchor(carrier) }), ticks + 8);
            if (!(markId > 0)) {
                world.operation(budget.id, "world_combat:dispel", "{}");
                if (MobEffects.matches(world, actor, MobEffects.anchor(carrier))) MobEffects.consume(world, actor, mindreaderEffect);
                WorldFeedback.emit(world, mindreaderScene, 1, point, { moment: "fizzle" }, 16);
                done(action); return;
            }
            sound(action, "minecraft:block.enchantment_table.use");
            if (self !== null) {
                WorldFeedback.emit(world, mindreaderScene, 1, self.position(),
                    { moment: "read", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        motes: motes, reveal: reveal, added: focus, scale: Math.max(0.6, Math.min(2, ticks / 200)) }, 30);
                WorldFeedback.text(world, mindreaderAbove(self.position()), mindreaderReadyText, [focus], 30);
            }
            if (at !== null) mindreaderTrendUpdate(world, actor, markId, { target: String(target.ref()), motes: motes }, at);
            done(action);
        }
    });
}
