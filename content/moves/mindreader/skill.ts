/**
 * 心之眼 / mindreader 的出手方式。
 *
 * 核心念头：看清一个对手正在朝哪里走，再用一次更准的攻击兑现读势——短期照亮它、把自己的命中抬起来，
 *   并且窗口期间在它脚下画一条随真实速度更新的趋势虚线；只有打中**所读的那个目标**才兑现。
 *
 * 三幕：
 *   凝神（windup，提交前只观察与预告，可被打断，不花代价）。
 *   读穿（提交后）：给自己挂 world_combat:mindreader_eyes（身份 world_combat:status/mindreader）并把命中等级
 *     交给一段 boostWindow 抬起（共享 NativeSemantics.aim 的精度因此提高），同时把目标照亮；标记
 *     world_combat:mindreader_mark 记下目标、读光、窗口 id 与本次实际抬起的等级。
 *     刷新时先撤旧：boostWindow 按 previous 只续本招这一份，旧窗口被关闭，不会叠加或漏撤。
 *   读势（窗口期间）：每 4 刻采一次目标的真实 velocity，在当前位置到约 6 刻速度外推点之间画短方向虚线，
 *     长度封顶 3 格；静止则收成一点；趋势线遇实墙截断。它只表示当前运动趋势，不预测未来动作。
 *   兑现（伤害命中）：只有打中所读目标且造成真实伤害时，用掉这层读——撤载体、关窗口，读线从目标缩回施法者。
 *   自散：读到期、被清除，或目标失效/离场时，读势收起并原样收回命中等级（world_combat:mob_effect_removed）。
 *
 * 与同族分开：磨爪只抬自己的攻与命中；锁定把目标钉住；心之眼读的是**对手的运动方向**，并用一次兑现的攻击收走。
 * 目标若在读还在时退出射程、被清除类效果解掉，或让这一击落空，都拿不到兑现。
 */
namespace PokemonSkills {
    function mindreaderAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    WorldCombat.effect(mindreaderMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.target !== "string" || !value.target) throw new Error("Invalid mindreader mark: target");
        ["motes", "reveal", "windowId", "focus"].forEach(function (key) {
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
     * 趋势虚线：每 pulse 刻采一次目标真实速度，在当前位置到 trend 刻外推点之间画一条短线，长度封顶 cap 格；
     * 静止收成一点，遇可确认实墙截断。表现绑在本次读数标记（本 source 创建）上，读结束即随标记清理。
     */
    function mindreaderTrendUpdate(world: CombatWorld, actor: CombatActor, markId: number, mark: any, at: CombatObservation): void {
        const base = at.position().plus(WorldCombat.point(0, -0.4 * at.height(), 0));
        const velocity = at.velocity(), speed = velocity.length(), moving = speed >= mindreaderMoveEpsilon;
        let end = base;
        if (moving) {
            end = base.plus(velocity.unit().scale(Math.min(speed * mindreaderTrend, mindreaderTrendCap)));
            const clip = world.clipBlocks(base, end);
            if (clip && clip.blocked()) end = clip.position().minus(velocity.unit().scale(0.15));
        }
        WorldFeedback.onEffect(world, markId, "world_combat:move_mindreader/trend", mindreaderTrendScene, 1, base,
            { moment: "trend", target: String(mark.target),
                path: [[base.x(), base.y(), base.z()], [end.x(), end.y(), end.z()]],
                moving: moving ? 1 : 0, motes: Math.max(6, Math.round(Number(mark.motes) || 14)),
                outline: Math.max(0.2, at.width() * 0.65),
                intensity: Math.max(0.5, Math.min(2, speed * 6 + 0.5)) });
    }
    /** 收束这层读：撤标记、关窗口、撤载体（只收回本招这一份命中等级），并按原因收尾表现。 */
    function mindreaderClose(world: CombatWorld, actor: CombatActor, cause: string, point: CombatPoint | null): void {
        const mark = mindreaderMarkOf(world, actor);
        if (mark === null) return;
        mindreaderReleaseMark(world, actor);
        if (Number(mark.windowId) > 0) NativeEffects.windowClose(world, Number(mark.windowId));
        if (MobEffects.read(world, actor, mindreaderEffect) !== null) MobEffects.consume(world, actor, mindreaderEffect);
        if (cause === "spent") {
            const body = point === null ? world.observe(actor) : null;
            const at = point === null ? (body === null ? null : body.position()) : point;
            if (at === null) return;
            const motes = Math.max(10, Math.round(Number(mark.motes) || 14));
            WorldFeedback.emit(world, mindreaderScene, 1, at,
                { moment: "strike", target: String(mark.target), path: [String(mark.target), String(actor.ref())],
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

    // 兑现点：带读者打中所读目标、且造成真实伤害时用掉这层读，读线缩回施法者并熄灭；打其他目标不兑现。
    NativeEffects.appliedRules.define({ id: "world_combat:move_mindreader/spend", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.actual > 0)) return;
        if (data.category !== "physical" && data.category !== "special") return;
        const world = hit.world, source = hit.source;
        if (!world.valid(source)) return;
        const mark = mindreaderMarkOf(world, source);
        if (mark === null) return;
        if (String(hit.target.ref()) !== String(mark.target)) return;
        const victim = world.observe(hit.target);
        mindreaderClose(world, source, "spent", victim === null ? null : victim.position());
    } });

    // 自散/外解：窗口走到头或被牛奶一类效果解除时，收回命中等级；自然到期额外播一次褪去。
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
        description: "看清一个对手正在朝哪里走：短期照亮它、把自己的命中拉起来，并用一条随它真实移动更新的趋势线指出方向；只有你随后打中这个目标才兑现读势。",
        uses: ["在对手横移或撤退前先看清它的走向", "把命中拉满，为一次必须命中的追击铺路", "照亮躲在掩体后、正在移动的目标"],
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
            // 刷新：载体交给 boostWindow 拥有并只收回本招这一份；previous 让同招旧窗口被替换而不是叠加/漏撤。
            const previous = MobEffects.read(world, actor, mindreaderEffect);
            const before = NativeEffects.effectiveStage(world, actor, "accuracy");
            const carrier = MobEffects.apply(world, actor, mindreaderEffect, ticks, previous ? previous.amplifier() : 0);
            let windowId = 0, gained = 0;
            if (carrier) {
                windowId = NativeEffects.boostWindow(world, actor, { accuracy: focus }, carrier.duration(),
                    "world_combat:move/mindreader", carrier, previous);
                gained = Math.max(0, NativeEffects.effectiveStage(world, actor, "accuracy") - before);
            }
            if (!windowId) MobEffects.consume(world, actor, mindreaderEffect);
            MobEffects.apply(world, target, "minecraft:glowing", reveal, 0);
            mindreaderReleaseMark(world, actor);
            // 标记略长于载体，让载体自然到期后的收尾仍能读到本层读；趋势表现绑在它上面随读结束清理。
            const markId = world.effect(mindreaderMark, actor, JSON.stringify({
                target: String(target.ref()), motes: motes, reveal: reveal, windowId: windowId, focus: gained,
                carrier: carrier ? MobEffects.anchor(carrier) : null }), ticks + 8);
            sound(action, "minecraft:block.enchantment_table.use");
            if (self !== null) {
                WorldFeedback.emit(world, mindreaderScene, 1, self.position(),
                    { moment: "read", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        motes: motes, reveal: reveal, added: gained, scale: Math.max(0.6, Math.min(2, ticks / 200)) }, 30);
                WorldFeedback.text(world, mindreaderAbove(self.position()), mindreaderReadyText, [gained], 30);
            }
            if (at !== null) mindreaderTrendUpdate(world, actor, markId, { target: String(target.ref()), motes: motes }, at);
            done(action);
        }
    });
}
