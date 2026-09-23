/**
 * 棱角化 / sharpen 的执行组织。
 *
 * 核心念头：把身体的边边角角顶出来。皮肤下一片片锋先鼓起，随后一齐弹出、边缘反着冷光；出手更利，
 *   近身撞上来的人会被这些棱角划伤。它是自我强化族里唯一把身体本身变成武器的一招。
 *
 * 三幕：
 *   蓄角（windup 播「起锋」，提交前只观察与预告，可被打断，打断不花代价）。
 *   弹出（提交后）：NativeEffects.boost 抬起物攻 1 级，挂上共享身份 world_combat:status/sharpened 的棱角窗口；
 *     一片片棱角从体表弹出、地面的石屑被带起。
 *   反击（窗口内）：任何近身接触攻击落到身上时，攻击者被棱角划一记 `edge` 伤害——这是这招真正让人不敢贴脸的地方。
 * 结束：棱角窗口走完（或被清除）时，棱角钝去，这份物攻按 amplifier 原样收回。
 *
 * 与同族分开：瑜伽姿势是慢、静、内在的唤醒，不被打扰更深、且留住；棱角化是快、外长棱角、带接触反击的窗口，到点收回。
 */
namespace PokemonSkills {
    const sharpenScene = "world_combat:move_sharpen";
    const sharpenEffect = "world_combat:sharpened";
    const sharpenMark = "world_combat:sharpen_mark";
    const sharpenText = "world_combat.move.sharpen.text.jagged";
    const sharpenCutText = "world_combat.move.sharpen.text.cut";
    const sharpenDullText = "world_combat.move.sharpen.text.dull";
    const sharpenCounter = "world_combat:sharpen_counter";
    /** 表现里的参考半径：`data.scale = 实际棱角半径 / 这个数`。 */
    const sharpenReferenceRadius = 1.0;

    // 机读标记：棱角窗口的账。棱锋威力、棱角数、半径与物攻级数一起存着，反击与表现照数取值。
    WorldCombat.effect(sharpenMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        ["gift", "edge", "spikes", "spread", "window"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid sharpen value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(sharpenMark, "start", function () { });
    EffectReactions.register(sharpenMark, sharpenCounter, function (effect, facts) {
        const world = effect.world(), target = effect.target(), attacker = world.actor(facts.attacker);
        if (!attacker || String(effect.caller().key()) !== String(attacker.key()) || world.allied(target, attacker)) return;
        if (!CombatStatus.has(world, target, "sharpened")) return;
        const state = JSON.parse(effect.state()), power = Math.max(0, Number(state.edge) || 0);
        if (!(power > 0) || !hurt(world, attacker, "sharpen", power, { damage: damageSpec("sharpen", "edge") })) return;
        const body = world.observe(attacker);
        if (body === null) return;
        WorldFeedback.emit(world, sharpenScene, 1, body.position(),
            { moment: "cut", target: String(attacker.ref()), edge: Math.round(power), spikes: Math.round(Number(state.spikes) || 0) }, 18);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), sharpenCutText, [], 18);
        world.sound("minecraft:item.trident.hit", body.position(), 12, "{}");
    });

    function sharpenRead(world: CombatWorld, actor: CombatActor): any | null {
        const marks = world.effects(actor, sharpenMark);
        return marks.length ? JSON.parse(String(marks[0].data())) : null;
    }
    function sharpenClear(world: CombatWorld, actor: CombatActor): void {
        const marks = world.effects(actor, sharpenMark);
        for (let i = 0; i < marks.length; i++) world.operation(marks[i].id(), "world_combat:dispel", "{}");
    }
    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function sharpenStage(world: CombatWorld, actor: CombatActor): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), "atk")
            : CombatStages.stage(world, actor, "atk");
    }

    define({
        id: "sharpen",
        cooldownParameter: "wait",
        name: "Sharpen",
        description: "把身体的棱角顶出来，提高攻击；棱角还在的这段时间里，近身打你的对手会被棱角划伤。",
        uses: ["近身缠斗前把棱角顶出来，让对手不敢贴脸", "被追击时先加攻、顺手给追兵一记划伤", "在安全的换位空隙刷新棱角，保持窗口"],
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
            NativeEffects.boost(world, actor, "atk", gift);
            MobEffects.apply(world, actor, sharpenEffect, window, gift);
            sharpenClear(world, actor);
            world.effect(sharpenMark, actor, JSON.stringify({ gift: gift, edge: edge, spikes: spikes, spread: spread, window: window }), window);
            WorldFeedback.emit(world, sharpenScene, 1, body.position(),
                { moment: "jag", actor: String(actor.ref()), gift: gift, spikes: spikes, edge: Math.round(edge), spread: spread, scale: scale,
                    intensity: Math.max(0.7, Math.min(2, 0.7 + spikes / 26 + edge / 60)) }, 28);
            WorldFeedback.keep(world, "world_combat:move_sharpen/edge/" + String(actor.ref()), sharpenScene, 1, body.position(),
                { moment: "edge", actor: String(actor.ref()), spikes: spikes, scale: scale }, Math.min(window, 560));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), sharpenText, [gift], 28);
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
        if (!CombatStatus.has(world, target, "sharpened")) return;
        const touched = DamageSemantics.read(data).contact;
        if (!touched) return;
        const attacker = event.actor();
        if (attacker === null || String(attacker.ref()) === String(target.ref())) return;
        if (!world.valid(attacker) || world.allied(target, attacker)) return;
        const marks = world.effects(target, sharpenMark);
        if (marks.length) EffectReactions.invoke(world, marks[0].id(), sharpenCounter, { attacker: String(attacker.ref()) });
    });

    // 棱角窗口走完或被清除：棱角钝去，按 amplifier 把这份物攻原样收回（只收到当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_sharpen/dull", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== sharpenEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, sharpenStage(world, actor)));
        if (loss > 0) NativeEffects.boost(world, actor, "atk", -loss);
        sharpenClear(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, sharpenScene, 1, body.position(), { moment: "dull", actor: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), sharpenDullText, [loss], 22);
    });
}
