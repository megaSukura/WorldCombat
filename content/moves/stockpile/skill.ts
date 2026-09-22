/**
 * 蓄力 / stockpile — 执行组织。
 *
 * 核心念头：一口口把力压进身体，身上箍起一层琥珀色的光壳——每蓄一次多箍一圈，防御与特防各 +1，最多 3 圈。
 *   它在本组里是唯一可以连放、层数会掉的一招：每一圈都是一份真东西，被击中时崩掉一圈、那份等级跟着掉。
 *
 * 两幕：
 *   压（windup 播「聚力」，提交前只观察与预告，打断不花代价）。
 *   箍（提交后）：NativeEffects.boost 写入公共能力阶梯（防御 +1、特防 +1），把层数与这次算好的破层去向写进记号，
 *     刷新共享身份 world_combat:status/stockpile 的光壳窗口（amplifier = 层数）。
 * 反制：光壳的层数被对手的攻击一口口吃掉——每次挨实一次掉一层、掉一级；壳全崩完，收益归零。
 * 破层去向由配置 break 决定：回气（少量回复）或震开（把出手者推开）。
 * 结束：光壳到期或被清除时，按记号把剩下的层数一次收回。
 */
namespace PokemonSkills {
    const stockpileScene = "world_combat:move_stockpile";
    const stockpileCharge = "world_combat:stockpile_charge";
    const stockpileMark = "world_combat:stockpile_mark";
    const stockpileStoreText = "world_combat.move.stockpile.text.store";
    const stockpileCrackText = "world_combat.move.stockpile.text.crack";
    const stockpileScatterText = "world_combat.move.stockpile.text.scatter";
    export const stockpileMaxLayers = 3;
    /** 表现里的参考半径：`data.scale = 实际层环半径 / 这个数`。 */
    const stockpileReferenceRadius = 1.2;

    // 记号：记录当前层数与这次算好的破层去向，破层与窗口结束时照数收回。amplifier 只是给图标看，真正的账在记号里。
    WorldCombat.effect(stockpileMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.layers !== "number" || typeof value.mode !== "string" || typeof value.shove !== "number" || typeof value.mend !== "number")
            throw new Error("Invalid stockpile mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(stockpileMark, "start", function () { });

    function stockpileRead(world: CombatWorld, actor: CombatActor): any | null {
        const marks = world.effects(actor, stockpileMark);
        return marks.length ? JSON.parse(String(marks[0].data())) : null;
    }
    export function stockpileLayers(world: CombatWorld, actor: CombatActor): number {
        const value = stockpileRead(world, actor);
        return value && typeof value.layers === "number" ? Math.max(0, Math.min(stockpileMaxLayers, Math.round(value.layers))) : 0;
    }
    /** 覆写记号；旧记号先结束，避免同一只身上叠出两份账。 */
    function stockpileWrite(world: CombatWorld, actor: CombatActor, state: any, ticks: number): void {
        const marks = world.effects(actor, stockpileMark);
        for (let i = 0; i < marks.length; i++) world.operation(marks[i].id(), "world_combat:dispel", "{}");
        state.layers = Math.max(0, Math.min(stockpileMaxLayers, Math.round(Number(state.layers) || 0)));
        world.effect(stockpileMark, actor, JSON.stringify(state), ticks);
    }
    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function stockpileStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    function stockpileRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = stockpileStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, stockpileStage(world, actor, stat) - before);
    }
    /** 收回一层：按当前实际持有的正等级扣，不超过 1 级。 */
    function stockpileSpend(world: CombatWorld, actor: CombatActor): void {
        const lostDef = Math.min(1, Math.max(0, stockpileStage(world, actor, "def")));
        const lostSpd = Math.min(1, Math.max(0, stockpileStage(world, actor, "spd")));
        if (lostDef > 0) NativeEffects.boost(world, actor, "def", -lostDef);
        if (lostSpd > 0) NativeEffects.boost(world, actor, "spd", -lostSpd);
    }

    define({
        id: "stockpile",
        name: "蓄力",
        description: "积蓄力量，提高自己的防御和特防。最多积蓄 3 次。",
        uses: ["开打前连蓄几层，把两项防护堆到顶", "连放三层后再接战，扛住第一轮爆发", "把层数留着当会掉的保险，让对手先花几下打碎它"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 5,
        active: 1,
        recover: 4,
        cooldown: 50,
        style: "hoard",
        stationary: true,
        defaults: { break: "mend", ai: { maxChase: 12, minGap: 2, hoardTo: 2 } },
        fields: [
            field(pathOf("break"), "破层去向", "choice", {
                options: [
                    { value: "mend", label: "回气" },
                    { value: "burst", label: "震开" }
                ],
                help: "回气：每崩掉一层按最大生命少量回复，适合拉锯续命；震开：每崩掉一层把出手者推开一段，适合拉开距离、断开连击。两向都不改变每层给的等级。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: p("stockpile", "rind", pokemon), geometry: "area", style: "hoard", color: 0xF0B23A,
                label: config && String(config.break) === "burst" ? "蓄力 · 震开" : "蓄力 · 回气" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["stockpile"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("stockpile", "tempo", context)),
                recover: Math.round(p("stockpile", "aftercast", context)),
                cooldown: Math.round(p("stockpile", "wait", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            const world = action.sense(), actor = action.actor();
            if (stockpileLayers(world, actor) >= stockpileMaxLayers) return "full-charge";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_stockpile:gather", stockpileScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", mode: config && String(config.break) === "burst" ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const layers = Math.min(stockpileMaxLayers, stockpileLayers(world, actor) + 1);
            const bond = Math.max(60, Math.round(p("stockpile", "bond", action)));
            const rind = Math.max(0.5, p("stockpile", "rind", action));
            const charge = Math.max(8, Math.round(p("stockpile", "charge", action)));
            const scale = rind / stockpileReferenceRadius;
            const state = { layers: layers, mode: config && String(config.break) === "burst" ? "burst" : "mend",
                shove: Math.max(0.5, p("stockpile", "shove", action)), mend: Math.max(0, p("stockpile", "mend", action)) };
            stockpileRaise(world, actor, "def", 1);
            stockpileRaise(world, actor, "spd", 1);
            stockpileWrite(world, actor, state, bond);
            MobEffects.apply(world, actor, stockpileCharge, bond, layers);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, stockpileScene, 1, feet,
                { moment: "store", actor: String(actor.ref()), layers: layers, layer: layers, charge: charge, rind: rind,
                    scale: scale, shellSize: 0.16 + layers * 0.07,
                    intensity: Math.max(0.7, Math.min(1.8, layers / 2 + charge / 40)) }, 30);
            WorldFeedback.keep(world, "stockpile:shell:" + String(actor.ref()), stockpileScene, 1, body.position(),
                { moment: "guard", actor: String(actor.ref()), layers: layers, rind: rind, scale: scale,
                    shellSize: 0.16 + layers * 0.07 }, Math.min(bond, 240));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), stockpileStoreText, [layers], 28);
            world.sound("minecraft:item.crossbow.loading_start", body.position(), 14, "{}");
            done(action);
        }
    });

    // 被实打一下：吃掉一层，扣掉那一层的等级；再按这次算好的去向把这一层化成回复或推力。
    WorldCombat.on("world_combat:move_stockpile/crack", "world_combat:damage_applied", "", function (event) {
        const target = event.target();
        if (target === null) return;
        const world = event.world();
        if (!world.valid(target)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const charge = MobEffects.read(world, target, stockpileCharge);
        if (charge === null) return;
        const state = stockpileRead(world, target);
        if (state === null) return;
        const layers = Math.max(0, Math.round(Number(state.layers) || 0));
        if (layers <= 0) return;
        stockpileSpend(world, target);
        const remaining = Math.max(1, charge.duration());
        const next = layers - 1;
        state.layers = next;
        stockpileWrite(world, target, state, remaining);
        if (next <= 0) world.removeMobEffect(target, stockpileCharge, charge.key());
        else MobEffects.apply(world, target, stockpileCharge, remaining, next);
        const body = world.observe(target);
        if (body === null) return;
        // 破层去向。
        if (String(state.mode) === "burst") {
            const source = event.actor();
            if (source !== null && String(source.ref()) !== String(target.ref()) && world.valid(source)) {
                const at = world.observe(source), push = Math.max(0.5, Number(state.shove) || 0.6);
                if (at !== null) {
                    const delta = at.position().minus(body.position());
                    if (delta.length() > 0.05) world.displace(source, delta.unit().scale(push));
                }
            }
        } else {
            const heal = Math.max(0, Math.round((Number(state.mend) || 0) * body.maxHealth() * 10) / 10);
            if (heal > 0 && body.health() < body.maxHealth()) world.health(target, heal, "world_combat:stockpile");
        }
        WorldFeedback.emit(world, stockpileScene, 1, body.position(),
            { moment: "crack", actor: String(target.ref()), layers: next, layer: layers, scale: Math.max(0.5, body.width() / 0.9) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), stockpileCrackText, [next], 22);
        world.sound("minecraft:block.amethyst_block.hit", body.position(), 12, "{}");
    });

    // 光壳到期或被清除：按记号把剩下的层数一次收回。
    WorldCombat.on("world_combat:move_stockpile/scatter", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== stockpileCharge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const layers = stockpileLayers(world, actor);
        for (let i = 0; i < layers; i++) stockpileSpend(world, actor);
        const marks = world.effects(actor, stockpileMark);
        for (let j = 0; j < marks.length; j++) world.operation(marks[j].id(), "world_combat:dispel", "{}");
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, stockpileScene, 1, body.position(), { moment: "scatter", actor: String(actor.ref()), layers: layers }, 22);
        if (layers > 0) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), stockpileScatterText, [layers], 22);
    });
}
