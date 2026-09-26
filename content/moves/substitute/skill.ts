/**
 * 替身 / substitute 的出手方式与工作效果。
 *
 * 念头的形状（两幕 + 持续）：
 *  1) 成形——支付一部分最大生命，在选定的落点（`place` 格内）放出一个真实的身体（`world.helper`），
 *     它的耐久 = 实际支付的生命 × 耐久倍率；给施法者挂上 `world_combat:substitute_ward`（拥有这个身体并
 *     每 5 刻看守）与共享 `world_combat:redirect`（把指向施法者的 incoming 伤害转给替身），并让施法者带上
 *     共享身份 `world_combat:status/substitute`。
 *  2) 守护——联系距离内且视线畅通的每一次攻击都落在替身上；替身闪一下（absorb，强度=本次承受/最大生命）。
 *     看守每 6 刻用与承伤层同一个谓词读一次联系是否成立，只在接通/断开变化的那一拍播一次，并让表现里
 *     本体到替身的细线随之接回或断开。
 *  3) 结束——替身被打碎（break）或时间走完（expire）：撤掉 redirect、清掉身份、放出收尾画面。
 *
 * 提交前只观察（sense）并在 `windup` 用 `action.present` 预告；提交后才触碰世界。cost/ward/place/linkRange/
 * wardTicks 全部来自参数公式，执行、AI 与悬浮读同一棵树。看守的连线判定直接调用 shared redirect 用的
 * `WorldEffects.redirectConnected`，让画出的线与实际承伤读同一组位置和视线事实。
 */
namespace PokemonSkills {
    const substituteScene = "world_combat:move_substitute";
    const substituteWard = "world_combat:substitute_ward";
    const substituteStatus = "world_combat:substitute";
    const substituteFormText = "world_combat.move.substitute.text.form";
    const substituteWeakText = "world_combat.move.substitute.text.weak";
    const substituteBreakText = "world_combat.move.substitute.text.break";
    const substituteExpireText = "world_combat.move.substitute.text.expire";
    const substituteLinkOnText = "world_combat.move.substitute.text.link_on";
    const substituteLinkOffText = "world_combat.move.substitute.text.link_off";

    /** 看守：拥有替身这个身体，随它存活；redirect 由它建立，也由它撤销。 */
    WorldCombat.effect(substituteWard, 1, 900, "actor",
        function (json: string): string { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(substituteWard, "start", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        let helper: CombatActor | null = null;
        const chosen = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
        const origin = WorldCombat.point(state.origin[0], state.origin[1], state.origin[2]);
        const toward = origin.minus(chosen), units = [chosen,
            chosen.plus(toward.length() > 0.01 ? toward.unit().scale(Math.min(1, toward.length())) : WorldCombat.point(0, 0, 0)),
            chosen.plus(toward.length() > 0.01 ? toward.unit().scale(Math.min(1.6, toward.length())) : WorldCombat.point(0, 1, 0))];
        for (let index = 0; index < units.length && helper === null; index++) {
            try {
                helper = world.helper(units[index], state.health,
                    JSON.stringify({ item: "minecraft:armor_stand", scale: state.scale, substitute: true }), effect.remaining());
            } catch (error) { helper = null; }
        }
        if (helper === null) {
            // 落点被占：退回投入的生命，让这一次施放不留下东西。
            if (world.valid(effect.target())) world.health(effect.target(), state.spent, "world_combat:substitute_refund");
            effect.end();
            return;
        }
        const body = world.observe(helper);
        state.helper = String(helper.ref());
        state.point = body === null ? state.point : [body.position().x(), body.position().y(), body.position().z()];
        state.redirect = world.effect("world_combat:redirect", effect.target(),
            JSON.stringify({ recipient: String(helper.ref()), linkRange: state.linkRange }), effect.remaining());
        // Seed the connection with the same predicate the redirect uses, so the first guard beat never reports a false change.
        state.connected = WorldEffects.redirectConnected(world, effect.target(), helper, state.linkRange);
        const carrier = MobEffects.apply(world, effect.target(), substituteStatus, effect.remaining());
        state.carrier = carrier ? MobEffects.anchor(carrier) : null;
        effect.state(JSON.stringify(state));
        if (!carrier) { effect.end(); return; }
        MobEffects.bind(world, effect.target(), substituteStatus, carrier);
        if (body !== null) {
            WorldFeedback.emit(world, substituteScene, 1, body.position(), { moment: "form", scale: state.scale }, 32);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), substituteFormText, [Math.round(state.spent)], 32);
            world.sound("minecraft:block.beacon.activate", body.position(), 16, "{}");
        }
        effect.schedule("guard", "guard", 5, "{}");
    });
    WorldCombat.effectHandler(substituteWard, "guard", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const helper = state.helper ? world.actor(state.helper) : null;
        const body = helper === null ? null : world.observe(helper);
        if (helper === null || body === null || !world.valid(effect.target())
            || !state.carrier || !MobEffects.matches(world, effect.target(), state.carrier)) {
            state.broken = true;
            effect.state(JSON.stringify(state));
            effect.end();
            return;
        }
        // The exact predicate the shared redirect settles damage with: distance and a clear line.
        const connected = WorldEffects.redirectConnected(world, effect.target(), helper, state.linkRange);
        const point = body.position();
        if (state.connected !== connected) {
            state.connected = connected;
            effect.state(JSON.stringify(state));
            WorldFeedback.emit(world, substituteScene, 1, point,
                { moment: connected ? "link_restore" : "link_break",
                  path: [String(effect.target().ref()), state.helper], scale: state.scale }, 22);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.3, 0)),
                connected ? substituteLinkOnText : substituteLinkOffText, [], 24);
            world.sound(connected ? "minecraft:block.beacon.power_select" : "minecraft:block.beacon.deactivate", point, 12, "{}");
        }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_substitute:present", substituteScene, 1, point,
            { moment: "present", target: state.helper, scale: state.scale, health: body.health(), maximum: body.maxHealth(),
              connected: connected ? 1 : 0, path: connected ? [String(effect.target().ref()), state.helper] : [] });
        effect.schedule("guard", "guard", 6, "{}");
    });
    WorldCombat.effectHandler(substituteWard, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(substituteWard, "end", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state()), actor = effect.target();
        if (state.redirect) world.operation(state.redirect, "world_combat:dispel", "{}");
        const helper = state.helper ? world.actor(state.helper) : null;
        if (helper !== null && world.valid(helper) && world.helperSource(helper) !== null) world.removeHelper(helper);
        const body = world.valid(actor) ? world.observe(actor) : null;
        const anchor = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
        if (world.valid(actor)) {
            const moment = state.broken ? "break" : "expire";
            WorldFeedback.emit(world, substituteScene, 1, anchor, { moment: moment, scale: state.scale }, 24);
            if (body !== null) WorldFeedback.text(world, anchor.plus(WorldCombat.point(0, 1.3, 0)),
                state.broken ? substituteBreakText : substituteExpireText, [], 28);
            world.sound(state.broken ? "minecraft:block.slime_block.break" : "minecraft:block.beacon.deactivate", anchor, 16, "{}");
        }
    });

    /** 替身每一次承伤都闪一下；强度来自这一下占施法者最大生命的比例。 */
    WorldCombat.on("world_combat:move_substitute/absorb", "world_combat:damage_applied", "", function (event) {
        const target = event.target();
        if (target === null || event.world().helperSource(target) === null) return;
        const world = event.world(), data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        let info: any = null;
        try { info = JSON.parse(String(world.helperData(target))); } catch (error) { info = null; }
        if (!info || info.substitute !== true) return;
        const owner = world.helperSource(target), body = owner === null ? null : world.observe(owner);
        const intensity = body === null ? 1 : Math.max(0.4, Math.min(2.5, data.actual / Math.max(1, body.maxHealth())));
        const observed = world.observe(target);
        const point = typeof data.x === "number" && typeof data.y === "number" && typeof data.z === "number"
            ? WorldCombat.point(data.x, data.y, data.z) : observed === null ? null : observed.position();
        if (point !== null)
            WorldFeedback.emit(world, substituteScene, 1, point,
                { moment: "absorb", target: String(target.ref()), intensity: intensity }, 20);
    });

    define({
        id: "substitute",
        name: "Substitute",
        description: "支付一部分自己的最大生命，在近处造出一个承伤的分身；它的耐久是实际投入生命的若干倍。替身只在联系距离内、视线畅通时替你挡下指向你的攻击，走出距离只是暂时停止，回到范围内会恢复；被打碎或存在到时限才结束。",
        uses: ["开战前先立起一面替自己挨打的血盾", "把致命的一轮攻击引到分身上", "受伤时用一部分生命换取重整空间"],
        kind: "point",
        range: 3,
        maxRange: 5,
        prepare: 10,
        active: 2,
        recover: 8,
        cooldown: 100,
        style: "seed",
        defaults: { build: 1.0, ai: { useBelow: 1.0, reserveHealth: 0.35, placement: "towardThreat", leaveStation: false } },
        fields: [
            field(pathOf("build"), "生命投入", "choice", { options: [
                { value: 0.7, label: "薄皮" }, { value: 1.0, label: "标准" }, { value: 1.4, label: "厚身" }] })
        ],
        indicator: function (config, pokemon) { return { radius: 4, geometry: "area", style: "seed", color: 0x9AA0B0, label: "替身" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["substitute"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const build = Number(config && config.build) || 1;
            return {
                prepare: p("substitute", "prepare", context),
                recover: p("substitute", "recover", context) + (build <= 0.7 ? -2 : build >= 1.4 ? 2 : 0),
                cooldown: Math.round(p("substitute", "cooldown", context) * (build <= 0.7 ? 0.85 : build >= 1.4 ? 1.2 : 1)),
                range: p("substitute", "place", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            if (body === null) return "target-left";
            if (world.effects(actor, substituteWard).length > 0) return "already-warded";
            const cost = body.maxHealth() * p("substitute", "cost", action);
            const reserve = config && config.ai && config.ai.reserveHealth !== undefined ? Number(config.ai.reserveHealth) : 0.35;
            if (body.health() <= cost + body.maxHealth() * reserve) return "insufficient-health";
            const point = action.targetPosition();
            if (point.minus(action.origin()).length() > p("substitute", "place", action) + 0.5) return "out-of-range";
            if (!world.clear(action.origin(), point)) return "target-not-visible";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_substitute:windup", substituteScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: 1 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const cost = body.maxHealth() * p("substitute", "cost", action);
            const paid = -world.health(actor, -cost, "world_combat:substitute_cost");
            if (paid < 1) {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), substituteWeakText, [], 24);
                done(action);
                return;
            }
            const health = Math.max(1, paid * p("substitute", "ward", action));
            const point = action.targetPosition(), origin = action.origin();
            const state = { point: [point.x(), point.y(), point.z()], origin: [origin.x(), origin.y(), origin.z()],
                health: health, spent: paid, linkRange: p("substitute", "linkRange", action),
                scale: Math.max(0.5, Math.min(2, health / Math.max(1, body.maxHealth() * 0.25))) };
            world.effect(substituteWard, actor, JSON.stringify(state), Math.round(p("substitute", "wardTicks", action)));
            done(action);
        }
    });
}
