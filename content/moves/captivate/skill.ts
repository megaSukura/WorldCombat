/**
 * 诱惑 / Captivate — 执行组织。
 *
 * 核心念头：当场抬眸，用一条只靠视线维持的目光看住**一个对手**，让它心神一荡、特攻下降；
 *   它不像电波那样绕身张开，也不像密语那样一句话就走——你必须一直看住它。
 *
 * 出手：`kind: "enemy"`——选一个看得见的敌人，短起手后提交。提交后复核距离与视线：
 *   超距、被掩体挡住、目标离场都安静收尾；真正看住才挂共享身份并压特攻。
 * 维持：提交后建立随动作存亡的 `world_combat:captivate_lock`：
 *   它给目标挂 `world_combat:captivate_gaze`（身份 world_combat:status/captivated），
 *   并用 NativeEffects.boostWindow 把这份特攻下降绑在载体上；随后每 2 刻复查
 *   「目标仍在本招射程内、视线仍通畅、载体仍在」，任一条不成立就结束。
 *   术者改用其他动作、被 interrupt、松开持续输入、目标离场或被驱散，动作结束 → 锁结束 →
 *   窗口关闭、载体被收回，特攻等级精确复原。这份贡献只在注视期间存在。
 * 反制：躲到掩体后、拉开到射程之外、或逼术者换招／被打断。它不抓、不拉、不定身、不造成伤害，
 *   也不会把敌意强加给目标。宝可梦之间的异性只作风味文字，不再硬性拦截；其他生物没有性别，直接有效。
 *
 * 配置 `focus`（专注注视）：由 resolve 改时序、由公式把下降从 2 级升到 3 级；更慢更深的同一道目光。
 */
namespace PokemonSkills {
    function captivateAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 随动作存亡的注视锁：载体、窗口与持续表现都挂在它上面，断线/换招/打断即整体收回。 */
    WorldCombat.effect(captivateLock, 1, 400, "action", function (json: string): string {
        const value = JSON.parse(json);
        ["drop", "hold", "range", "motes", "hearts"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid captivate lock state");
        });
        if (typeof value.self !== "string") throw new Error("Invalid captivate lock state");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    function captivateHeld(effect: CombatEffect, body: CombatObservation, state: any): void {
        WorldFeedback.onEffect(effect.world(), effect.id(), "captivate:hold:" + String(effect.target().ref()), captivateScene, 1,
            body.position(), { moment: "hold", target: String(effect.target().ref()), path: [state.self, String(effect.target().ref())],
                drop: state.drop, motes: state.motes });
    }

    WorldCombat.effectHandler(captivateLock, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), state = JSON.parse(effect.state());
        const body = world.valid(victim) ? world.observe(victim) : null;
        if (body === null) { effect.end(); return; }
        // 同源重施按旧载体刷新，而不是叠出第二份；不同来源的下降仍各自持有。
        const previous = MobEffects.read(world, victim, captivateEffect);
        const carrier = MobEffects.apply(world, victim, captivateEffect, state.hold, 0);
        function ward(): void {
            state.refused = true; effect.state(JSON.stringify(state));
            WorldFeedback.emit(world, captivateScene, 1, body!.position(), { moment: "ward", target: String(victim.ref()) }, 18);
            effect.end();
        }
        if (carrier === null) { ward(); return; }
        const before = NativeEffects.effectiveStage(world, victim, "spa");
        const window = NativeEffects.boostWindow(world, victim, { spa: -state.drop }, state.hold,
            captivateContribution, carrier, previous);
        const lost = Math.max(0, before - NativeEffects.effectiveStage(world, victim, "spa"));
        // 真正掉下去才留载体与窗口；免疫降级或已封底时收回载体，只留一点灰白，不报假成功。
        if (!window || lost <= 0) {
            if (window) NativeEffects.windowClose(world, window);
            world.removeMobEffect(victim, captivateEffect, carrier.key());
            ward(); return;
        }
        state.window = window; state.age = 0;
        effect.state(JSON.stringify(state));
        const held = world.observe(victim) || body;
        const selfRef = state.self, victimRef = String(victim.ref());
        WorldFeedback.emit(world, captivateScene, 1, held.position(),
            { moment: "lock", target: victimRef, path: [selfRef, victimRef], drop: lost, motes: state.motes }, 24);
        WorldFeedback.emit(world, captivateScene, 1, held.position(),
            { moment: "charm", target: victimRef, drop: lost, hearts: state.hearts }, 30);
        WorldFeedback.text(world, captivateAbove(held.position()), "world_combat.move.captivate.text.charm", [lost], 40);
        // 持续表现绑在这次真实窗口上：窗口关闭或被驱散时表现一起收，不留残影。
        WorldFeedback.onEffect(world, window, "captivate:linger:" + victimRef, captivateScene, 1, held.position(),
            { moment: "linger", target: victimRef });
        captivateHeld(effect, held, state);
        effect.schedule("watch", "watch", 2, "{}");
    });
    WorldCombat.effectHandler(captivateLock, "watch", function (effect) {
        const world = effect.world(), victim = effect.target(), state = JSON.parse(effect.state());
        const body = world.valid(victim) ? world.observe(victim) : null, source = world.observe(effect.source());
        // 目标离场、术者离场、载体被驱散（窗口随之结束）都在这里结束注视。
        if (body === null || source === null || world.mobEffect(victim, captivateEffect) === null) { effect.end(); return; }
        if (body.position().minus(source.position()).length() > state.range || !world.clear(source.position(), body.position())) {
            state.reason = "break"; effect.state(JSON.stringify(state)); effect.end(); return;
        }
        state.age = (state.age || 0) + 1;
        if (state.age % 4 === 0) { effect.state(JSON.stringify(state)); captivateHeld(effect, body, state); }
        effect.schedule("watch", "watch", 2, "{}");
    });
    WorldCombat.effectHandler(captivateLock, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), state = JSON.parse(effect.state());
        // 先收回窗口；窗口释放自己对该载体的持有，特攻等级精确复原。
        if (typeof state.window === "number" && state.window > 0) NativeEffects.windowClose(world, state.window);
        if (state.refused) return;
        const body = world.valid(victim) ? world.observe(victim) : null;
        if (body === null) return;
        WorldFeedback.emit(world, captivateScene, 1, body.position(),
            { moment: state.reason === "break" ? "break" : "release", target: String(victim.ref()),
                path: [state.self, String(victim.ref())] }, 22);
    });

    define({
        id: captivateId,
        cooldownParameter: "recharge",
        name: "诱惑",
        description: "当场抬眸看住一个看得见的对手，让它的特攻大幅下降；这份下降只在你的目光维持期间存在，一断线、换招或被打断就立刻收回。目标跑出射程或被掩体挡住即断线。专注注视降得更深，但起手与冷却都更长；它不抓、不拉、不定身，也不造成伤害。",
        uses: ["持续削弱一个法系威胁的特攻输出", "在掩体后的狭窄空间用视线远程压住对手", "给队友的进攻拖住一个高特攻目标"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 180,
        style: "charm",
        defaults: { focus: false },
        fields: [
            flag("focus", "专注注视")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[captivateId], detail: { values: config }, world, actor, attributes };
            const focus = !!(config && config.focus);
            return {
                prepare: Math.round(p(captivateId, "tempo", context)) + (focus ? 5 : 0),
                recover: p(captivateId, "recover", context),
                cooldown: Math.round(p(captivateId, "recharge", context) * (focus ? 1.3 : 1)),
                active: 1,
                range: p(captivateId, "gazeRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("captivate-windup", captivateScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const focus = !!(config && config.focus);
            const context: NumberContext | undefined = pokemon ? { pokemon, skill: skills[captivateId], detail: { values: config } } : undefined;
            return { radius: context ? p(captivateId, "gazeRange", context) : 6, geometry: "line", style: "charm",
                label: focus ? "诱惑·专注注视" : "诱惑" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(2, Math.min(3, Math.round(p(captivateId, "drop", action))));
            const hold = Math.max(40, Math.round(p(captivateId, "hold", action)));
            const range = Math.max(2, p(captivateId, "gazeRange", action));
            const motes = 14 + drop * 8;
            const hearts = 10 + drop * 8;
            sound(action, "minecraft:block.amethyst_block.chime");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.ref()) === String(self.ref())) {
                WorldFeedback.emit(world, captivateScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action); return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (point.minus(origin).length() > range) {
                WorldFeedback.emit(world, captivateScene, 1, point, { moment: "fizzle", target: String(target.ref()) }, 16);
                done(action); return;
            }
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, captivateScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, captivateAbove(point), "world_combat.move.captivate.text.blocked", [], 28);
                done(action); return;
            }
            const victim = target;
            const lock = action.effect(captivateLock, victim,
                JSON.stringify({ drop: drop, hold: hold, range: range, motes: motes, hearts: hearts, self: String(self.ref()) }), hold + 40);
            let settled = false;
            function finish(current: CombatAction): void { if (settled) return; settled = true; done(current); }
            // 实际过程结束（锁被收回、窗口走完、断线）即停；动作被外部取消时锁随动作结束，无需自行收尾。
            function watch(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const active = scope.effects(victim, captivateLock).some(view => view.id() === lock);
                const carrier = MobEffects.read(scope, victim, captivateEffect);
                if (!active || carrier === null) { finish(current); return; }
                if (scope.valid(victim)) {
                    const held = scope.observe(victim);
                    if (held !== null) current.face(held.position(), 20, 20);
                }
                current.after(2, watch);
            }
            watch(action);
        }
    });

    // 玩家选中一个活物、按住技能键持续注视；松开即 world_combat:input-stop 取消。AI 直接提交目标走满时长。
    WorldCombat.preview("world_combat:" + captivateId, JSON.stringify({ radius: 0.6, lineOfSight: true, input: { version: 1, steps: ["entity"], sustained: true } }));
}
