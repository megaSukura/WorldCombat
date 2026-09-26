/**
 * 棱角化 / sharpen 的执行组织。
 *
 * 核心念头：把身体的边边角角顶出来。皮肤下一片片锋先鼓起，随后一齐弹出、边缘反着冷光；出手更利，
 *   近身撞上来的人会被这些棱角划伤。它是自我强化族里唯一把身体本身变成武器的一招。
 *
 * 三幕：
 *   蓄角（windup 播「起锋」，提交前只观察与预告，可被打断，打断不花代价）。
 *   弹出（提交后）：这层「棱角」载体拥有本次实际抬起的物攻（NativeEffects.boostWindow 绑在载体上），
 *     挂上共享身份 world_combat:status/sharpened；一片片棱角从体表弹出、地面的石屑被带起。
 *     载体的实际贡献只有本次差额：窗口走完、被牛奶／/effect clear 拿掉，或再次施放刷新时，只会撤去这一份。
 *   反击（窗口内）：任何**真实原生近身接触**攻击落到身上时，攻击者在接触点被棱角划一记 `edge` 伤害——
 *     射弹、状态掉血或脚本附加伤害都不算接触，不会误触。
 * 结束：棱角窗口走完（或被清除）时棱角钝去，物攻由载体窗口自行收回；这里只收尾表现。
 *
 * 与同族分开：瑜伽姿势是慢、静、内在的唤醒，不被打扰更深、且留住；棱角化是快、外长棱角、带接触反击的窗口，到点收回。
 * 视觉与数值同源：cut 打在伤害回执给出的真实接触点；持续棱光绑在这层 boostWindow 上，窗口一收表现即收。
 */
namespace PokemonSkills {
    const sharpenScene = "world_combat:move_sharpen";
    const sharpenEffect = "world_combat:sharpened";
    const sharpenMark = "world_combat:sharpen_mark";
    const sharpenContribution = "world_combat:move/sharpen";
    const sharpenText = "world_combat.move.sharpen.text.jagged";
    const sharpenCappedText = "world_combat.move.sharpen.text.capped";
    const sharpenCutText = "world_combat.move.sharpen.text.cut";
    const sharpenDullText = "world_combat.move.sharpen.text.dull";
    const sharpenCounter = "world_combat:sharpen_counter";
    /** 表现里的参考半径：`data.scale = 实际棱角半径 / 这个数`。 */
    const sharpenReferenceRadius = 1.0;

    // 机读标记：棱角窗口的账。棱锋威力、棱角数、半径与本次实际抬起的物攻一起存着，反击与表现照数取值。
    WorldCombat.effect(sharpenMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        ["gift", "edge", "spikes", "spread", "window"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid sharpen value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(sharpenMark, "start", function () { });
    WorldCombat.effectHandler(sharpenMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    EffectReactions.register(sharpenMark, sharpenCounter, function (effect, facts) {
        const world = effect.world(), target = effect.target(), attacker = world.actor(facts.attacker);
        if (!attacker || String(effect.caller().key()) !== String(attacker.key()) || world.allied(target, attacker)) return;
        if (!CombatStatus.has(world, target, "sharpened")) return;
        const state = JSON.parse(effect.state()), power = Math.max(0, Number(state.edge) || 0);
        if (!(power > 0) || !hurt(world, attacker, "sharpen", power, { damage: damageSpec("sharpen", "edge") })) return;
        let point: CombatPoint | null = null;
        const raw = facts.point;
        if (raw && typeof raw[0] === "number" && typeof raw[1] === "number" && typeof raw[2] === "number")
            point = WorldCombat.point(raw[0], raw[1], raw[2]);
        if (point === null) { const body = world.observe(attacker); if (body !== null) point = body.position(); }
        if (point === null) return;
        WorldFeedback.emit(world, sharpenScene, 1, point,
            { moment: "cut", target: String(attacker.ref()), edge: Math.round(power), spikes: Math.round(Number(state.spikes) || 0) }, 18);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), sharpenCutText, [], 18);
        world.sound("minecraft:item.trident.hit", point, 12, "{}");
    });

    function sharpenRead(world: CombatWorld, actor: CombatActor): any | null {
        const marks = world.effects(actor, sharpenMark);
        return marks.length ? JSON.parse(String(marks[0].data())) : null;
    }
    function sharpenClear(world: CombatWorld, actor: CombatActor): void {
        const marks = world.effects(actor, sharpenMark);
        for (let i = 0; i < marks.length; i++) world.operation(marks[i].id(), "world_combat:dispel", "{}");
    }

    define({
        id: "sharpen",
        cooldownParameter: "wait",
        name: "Sharpen",
        description: "把身体的棱角顶出来，抬高物攻；棱角存在期间，近身接触攻击你的对手会被棱角划伤，窗口结束物攻收回。",
        uses: ["近身缠斗前把棱角顶出来，让对手不敢贴脸", "被追击时先加攻、顺手给追兵一记划伤", "棱角钝去后尽快重新顶角，维持物攻加成"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 80,
        style: "edge",
        stationary: true,
        defaults: { quick: false, ai: { maxChase: 14, minGap: 1 } },
        fields: [],
        indicator: function (config) { return { radius: 1, style: "edge", color: 0xC8D0DA, label: config && config.quick === true ? "棱角化 · 速成" : "棱角化" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["sharpen"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("sharpen", "tempo", context)),
                recover: Math.round(p("sharpen", "aftercast", context)),
                cooldown: Math.round(p("sharpen", "wait", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (world.observe(self) === null) return "invalid-target";
            if (CombatStatus.has(world, self, "sharpened")) return "already-sharpened";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_sharpen:charge", sharpenScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", quick: config && config.quick === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("sharpen", "gift", action))));
            const edge = Math.max(1, p("sharpen", "edge", action));
            const spikes = Math.max(6, Math.round(p("sharpen", "spikes", action)));
            const spread = Math.max(0.5, p("sharpen", "spread", action));
            const window = Math.max(60, Math.round(p("sharpen", "sharpTicks", action)));
            const scale = spread / sharpenReferenceRadius;
            // 载体拥有这份物攻贡献：刷新先按 previous 结束同招旧窗口，只续上本招自己那一份，结束只撤本次差额。
            const before = NativeEffects.effectiveStages(world, actor);
            const previous = MobEffects.read(world, actor, sharpenEffect);
            const carrier = MobEffects.apply(world, actor, sharpenEffect, window, previous ? previous.amplifier() : 0);
            let windowId = 0, gained = 0;
            if (carrier) {
                windowId = NativeEffects.boostWindow(world, actor, { atk: gift }, carrier.duration(),
                    sharpenContribution, carrier, previous);
                const raised = NativeEffects.effectiveStages(world, actor);
                gained = Math.max(0, (raised.atk || 0) - (before.atk || 0));
            }
            sharpenClear(world, actor);
            if (carrier) world.effect(sharpenMark, actor,
                JSON.stringify({ gift: gift, applied: gained, edge: edge, spikes: spikes, spread: spread, window: window }), carrier.duration());
            WorldFeedback.emit(world, sharpenScene, 1, body.position(),
                { moment: "jag", actor: String(actor.ref()), gift: gained, spikes: spikes, edge: Math.round(edge), spread: spread, scale: scale,
                    capped: gained > 0 ? 0 : 1,
                    intensity: Math.max(0.7, Math.min(2, 0.7 + spikes / 26 + edge / 60)) }, 28);
            if (windowId > 0)
                // 持续棱光绑在这层 boostWindow 上：窗口到期或被清除，表现随窗口一起收。
                WorldFeedback.onEffect(world, windowId, "world_combat:move_sharpen/edge", sharpenScene, 1, body.position(),
                    { moment: "edge", actor: String(actor.ref()), spikes: spikes, scale: scale });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                gained > 0 ? sharpenText : sharpenCappedText, gained > 0 ? [gained] : [], 28);
            world.sound("minecraft:block.grindstone.use", body.position(), 14, "{}");
            done(action);
        }
    });

    // 窗口内被近身接触打中：棱角划回去。反击本身不带接触标签，不会再次触发。
    WorldCombat.on("world_combat:move_sharpen/cut", "world_combat:damage_applied", "", function (event) {
        const target = event.target();
        if (target === null) return;
        const world = event.world();
        if (!world.valid(target)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        // 只认真实的原生接触攻击：射弹、状态掉血、脚本附加伤害都不算。
        const facts = DamageSemantics.read(data);
        if (!facts.attack || !facts.contact) return;
        if (!CombatStatus.has(world, target, "sharpened")) return;
        const attacker = event.actor();
        if (attacker === null || String(attacker.ref()) === String(target.ref())) return;
        if (!world.valid(attacker) || world.allied(target, attacker)) return;
        const marks = world.effects(target, sharpenMark);
        if (!marks.length) return;
        const receipt = WorldFeedback.receipt(event);
        const at = receipt !== null ? receipt.point : (world.observe(target) !== null ? world.observe(target)!.position() : null);
        if (at === null) return;
        EffectReactions.invoke(world, marks[0].id(), sharpenCounter,
            { attacker: String(attacker.ref()), point: [at.x(), at.y(), at.z()] });
    });

    // 棱角窗口走完或被清除：物攻由载体窗口自行收回，这里只收尾表现。
    WorldCombat.on("world_combat:move_sharpen/dull", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== sharpenEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束，不播散去。
        if (MobEffects.read(world, actor, sharpenEffect)) return;
        const mark = sharpenRead(world, actor);
        const lost = mark ? Math.max(0, Math.round(Number(mark.applied) || 0)) : 0;
        sharpenClear(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, sharpenScene, 1, body.position(), { moment: "dull", actor: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), sharpenDullText, [lost], 22);
    });
}
