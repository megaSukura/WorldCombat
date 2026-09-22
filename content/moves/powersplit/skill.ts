/**
 * 力量平分 / powersplit —— 注册与动作。
 *
 * 念头的形状：两幕。
 *   聚（windup，提交前）：两股攻势读数沿一条平线向中央靠拢，只播预告，可被打断且不花代价。
 *   平（merge，提交后）：读出双方攻与特攻的原始数值，各取平均后把两人都调到同一个平均值——
 *     宝可梦走共享临时属性层（NativeModifiers），其他生物把原版攻击属性按差值抬/压；挂共享身份
 *     world_combat:status/powersplit 的平分窗口，并各留一枚记号记下这次改动由哪层效果承载。
 *   归（revert）：窗口走完或被外力（牛奶、清除效果）解除时，按记号撤掉那层改动，数值回到原来的底子。
 *
 * 与「力量互换」分开：互换交换的是已经攒起来的能力等级；平分改的是底子，等级原样保留。
 */
namespace PokemonSkills {
    export const powersplitScene = "world_combat:move_powersplit";
    export const powersplitWindow = "world_combat:powersplit_window";
    export const powersplitMark = "world_combat:powersplit_mark";
    export const powersplitShift = "world_combat:powersplit_shift";
    export const powersplitLevelText = "world_combat.move.powersplit.text.leveled";
    export const powersplitFlatText = "world_combat.move.powersplit.text.flat";
    export const powersplitBackText = "world_combat.move.powersplit.text.reverted";
    export const powersplitMissText = "world_combat.move.powersplit.text.miss";

    interface PowersplitMark { layer: number; pair: string; }

    // 非宝可梦的平分载体：把原版攻击属性按存下来的差值抬/压；修饰随这个效果结束一起撤销。
    WorldCombat.effect(powersplitShift, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.attack !== "number" || !isFinite(value.attack)) throw new Error("Invalid power split carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powersplitShift, "start", function (effect) {
        const world = effect.world(), actor = effect.target();
        const data = JSON.parse(String(effect.state()));
        const attribute = world.attributeValue(actor, "minecraft:generic.attack_damage");
        if (attribute !== null) world.attribute(actor, "minecraft:generic.attack_damage", data.attack, "add_value");
    });
    WorldCombat.effectHandler(powersplitShift, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 记号：记录这次平分的改动由哪层效果承载，窗口提前结束时照它精确撤掉（其余修饰效果不受影响）。
    WorldCombat.effect(powersplitMark, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.layer !== "number" || !isFinite(value.layer)) throw new Error("Invalid power split mark");
        if (typeof value.pair !== "string") throw new Error("Invalid power split partner");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powersplitMark, "start", function () { });
    WorldCombat.effectHandler(powersplitMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 一位战斗者某一项能力的原始数值：宝可梦读共享临时层后的原生培养值，其他生物读原版属性的基础值。 */
    export function powersplitRawStat(world: CombatWorld, actor: CombatActor, stat: string): number {
        if (!world.valid(actor)) return 0;
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor);
            return Math.max(0, NativeEffects.stat(CobblemonCombat.pokemon(actor), state, stat));
        }
        const attribute = world.attributeValue(actor, "minecraft:generic.attack_damage");
        return attribute === null ? 0 : Math.max(0, attribute.base());
    }
    /** 攻势底子合计（攻 + 特攻的原始值），供本招 AI 判断值不值得平。 */
    export function powersplitPower(world: CombatWorld, actor: CombatActor): number {
        return powersplitRawStat(world, actor, "atk") + powersplitRawStat(world, actor, "spa");
    }
    /** 把一位战斗者的攻/特攻底子调到 atk/spa；宝可梦走共享临时属性层，其他生物走原版攻击属性载体。返回承载这次改动的效果 id。 */
    function powersplitSettle(world: CombatWorld, actor: CombatActor, atk: number, spa: number, ticks: number): number {
        if (String(actor.domain()) === "cobblemon")
            return NativeModifiers.apply(world, actor, { stats: { atk: Math.max(1, Math.round(atk)), spa: Math.max(1, Math.round(spa)) } }, ticks);
        const current = powersplitRawStat(world, actor, "atk");
        const value = Math.max(1, Math.round((atk + spa) / 2));
        return world.effect(powersplitShift, actor, JSON.stringify({ attack: value - current }), ticks);
    }

    define({
        id: "powersplit",
        name: "力量平分",
        description: "利用超能力把双方攻击与特攻的数值相加再平分一段时间：强的被压下来、弱的被抬上去，两人落在同一刻度上。",
        uses: ["把自己的低攻抬到对手的水平", "把对手的高攻压到自己的水平", "在对手攻击远高于自己时抹平差距"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 10,
        active: 1,
        recover: 6,
        cooldown: 95,
        style: "split",
        stationary: true,
        defaults: { ai: { maxChase: 12, edge: 1.15, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["powersplit"], detail: { values: config } };
            return { radius: p("powersplit", "reach", context), geometry: "line", style: "split", color: 0xFFB060, label: "力量平分" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["powersplit"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("powersplit", "tempo", context)),
                recover: Math.round(p("powersplit", "aftercast", context)),
                cooldown: Math.round(p("powersplit", "recharge", context)),
                active: 1,
                range: p("powersplit", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, actor, "powersplit") || CombatStatus.has(world, target, "powersplit")
                || world.effects(actor, powersplitMark).length > 0 || world.effects(target, powersplitMark).length > 0) return "already-split";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("powersplit", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:powersplit:" + action.id(), powersplitScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", target: action.target() === null ? "" : String(action.target()!.ref()),
                    path: [String(action.actor().ref()), action.target() === null ? String(action.actor().ref()) : String(action.target()!.ref())],
                    motes: Math.max(1, Math.round(p("powersplit", "motes", action))) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) {
                WorldFeedback.emit(world, powersplitScene, 1, body.position(), { moment: "fizzle" }, 16);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), powersplitMissText, [], 22);
                done(action);
                return;
            }
            const foe = world.observe(target);
            if (foe === null) { done(action); return; }
            const window = Math.max(100, Math.round(p("powersplit", "span", action)));
            const motes = Math.max(1, Math.round(p("powersplit", "motes", action)));
            const scale = (body.width() + body.height()) / 2.3;
            const mineAtk = powersplitRawStat(world, actor, "atk"), mineSpa = powersplitRawStat(world, actor, "spa");
            const theirAtk = powersplitRawStat(world, target, "atk"), theirSpa = powersplitRawStat(world, target, "spa");
            const avgAtk = Math.max(1, Math.round((mineAtk + theirAtk) / 2));
            const avgSpa = Math.max(1, Math.round((mineSpa + theirSpa) / 2));
            const gap = Math.abs(theirAtk - mineAtk) + Math.abs(theirSpa - mineSpa);
            const reference = Math.max(1, Math.max(mineAtk + mineSpa, theirAtk + theirSpa));
            const gauge = Math.max(0, Math.min(1, gap / reference));
            const flow = Math.max(4, Math.min(96, Math.round(motes * (0.4 + gauge * 1.6))));
            const changed = mineAtk !== avgAtk || mineSpa !== avgSpa || theirAtk !== avgAtk || theirSpa !== avgSpa;
            if (changed) {
                const layerSelf = powersplitSettle(world, actor, avgAtk, avgSpa, window + 40);
                const layerFoe = powersplitSettle(world, target, avgAtk, avgSpa, window + 40);
                MobEffects.apply(world, actor, powersplitWindow, window, 0);
                MobEffects.apply(world, target, powersplitWindow, window, 0);
                world.effect(powersplitMark, actor, JSON.stringify({ layer: layerSelf, pair: String(target.ref()) }), window + 60);
                world.effect(powersplitMark, target, JSON.stringify({ layer: layerFoe, pair: String(actor.ref()) }), window + 60);
            }
            WorldFeedback.emit(world, powersplitScene, 1, body.position(),
                { moment: "merge", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                    motes: motes, flow: flow, gauge: gauge, average: avgAtk, scale: scale,
                    intensity: Math.max(0.7, Math.min(2.2, gauge * 1.6 + 0.6)), even: changed ? 0 : 1 }, 36);
            if (changed) {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), powersplitLevelText,
                    [avgAtk, avgSpa], 30);
                WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), powersplitLevelText,
                    [avgAtk, avgSpa], 30);
            } else {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), powersplitFlatText, [], 26);
            }
            sound(action, "minecraft:entity.evoker.cast_spell");
            world.sound("minecraft:block.enchantment_table.use", body.position(), 14, "{}");
            done(action);
        }
    });

    // 平分存续期：每 20 刻续一次中央的平分光，让玩家读出现在还平着、还剩多久。
    WorldCombat.on("world_combat:move_powersplit/hum", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== powersplitWindow) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const marks = world.effects(actor, powersplitMark);
        if (!marks.length) { MobEffects.consume(world, actor, powersplitWindow); return; }
        const mark = JSON.parse(String(marks[0].data()));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_powersplit/hum/" + String(actor.ref()), powersplitScene, 1, body.position(),
            { moment: "hum", target: String(actor.ref()), pair: String(mark.pair), flow: 4,
                path: [String(actor.ref()), String(mark.pair)], remaining: marks[0].remaining() }, 40);
    });

    // 窗口走完或被清除：按记号撤掉那层改动，数值回到原来的底子；其余修饰不受影响。
    WorldCombat.on("world_combat:move_powersplit/revert", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== powersplitWindow) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, powersplitMark);
        let pair = "";
        if (MobEffects.read(world, actor, powersplitWindow) !== null) return;
        for (const own of marks) {
            const mark: PowersplitMark = JSON.parse(String(own.data()));
            if (typeof mark.layer === "number" && mark.layer >= 0) world.operation(mark.layer, "world_combat:dispel", "{}");
            pair = String(mark.pair);
            world.operation(own.id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, powersplitScene, 1, body.position(),
            { moment: "revert", target: String(actor.ref()), pair: pair, path: [String(actor.ref()), pair] }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), powersplitBackText, [], 26);
        world.sound("minecraft:block.amethyst_block.chime", body.position(), 12, "{}");
    });
}
