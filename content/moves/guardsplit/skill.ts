/**
 * 防守平分 / guardsplit —— 注册与动作。
 *
 * 念头的形状：两幕。
 *   聚（windup，提交前）：两股守势读数向中央对齐，只播预告，可被打断且不花代价。
 *   平（merge，提交后）：读出双方防与特防的原始数值，各取平均后把两人都调到同一个平均值——
 *     宝可梦走共享临时属性层（NativeModifiers），其他生物把原版护甲属性按差值抬/削；挂共享身份
 *     world_combat:status/guardsplit 的平分窗口，并各留一枚记号记下这次改动由哪层效果承载。
 *   归（revert）：窗口走完或被外力（牛奶、清除效果）解除时，按记号撤掉那层改动，数值回到原来的底子。
 *
 * 与「防守互换」分开：互换交换的是已经架起来的能力等级；平分改的是底子，等级原样保留。
 */
namespace PokemonSkills {
    export const guardsplitScene = "world_combat:move_guardsplit";
    export const guardsplitWindow = "world_combat:guardsplit_window";
    export const guardsplitMark = "world_combat:guardsplit_mark";
    export const guardsplitShift = "world_combat:guardsplit_shift";
    export const guardsplitLevelText = "world_combat.move.guardsplit.text.leveled";
    export const guardsplitFlatText = "world_combat.move.guardsplit.text.flat";
    export const guardsplitBackText = "world_combat.move.guardsplit.text.reverted";
    export const guardsplitMissText = "world_combat.move.guardsplit.text.miss";

    interface GuardsplitMark { layer: number; pair: string; }

    // 非宝可梦的平分载体：把原版护甲属性按存下来的差值抬/削；修饰随这个效果结束一起撤销。
    WorldCombat.effect(guardsplitShift, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.armour !== "number" || !isFinite(value.armour)) throw new Error("Invalid guard split carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(guardsplitShift, "start", function (effect) {
        const world = effect.world(), actor = effect.target();
        const data = JSON.parse(String(effect.state()));
        const attribute = world.attributeValue(actor, "minecraft:generic.armor");
        if (attribute !== null) world.attribute(actor, "minecraft:generic.armor", data.armour, "add_value");
    });
    WorldCombat.effectHandler(guardsplitShift, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 记号：记录这次平分的改动由哪层效果承载，窗口提前结束时照它精确撤掉（其余修饰效果不受影响）。
    WorldCombat.effect(guardsplitMark, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.layer !== "number" || !isFinite(value.layer)) throw new Error("Invalid guard split mark");
        if (typeof value.pair !== "string") throw new Error("Invalid guard split partner");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(guardsplitMark, "start", function () { });
    WorldCombat.effectHandler(guardsplitMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 一位战斗者某一项能力的原始数值：宝可梦读共享临时层后的原生培养值，其他生物读原版护甲的基础值。 */
    export function guardsplitRawStat(world: CombatWorld, actor: CombatActor, stat: string): number {
        if (!world.valid(actor)) return 0;
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor);
            return Math.max(0, NativeEffects.stat(CobblemonCombat.pokemon(actor), state, stat));
        }
        const attribute = world.attributeValue(actor, "minecraft:generic.armor");
        return attribute === null ? 0 : Math.max(0, attribute.base());
    }
    /** 守势底子合计（防 + 特防的原始值），供本招 AI 判断值不值得平。 */
    export function guardsplitGuard(world: CombatWorld, actor: CombatActor): number {
        return guardsplitRawStat(world, actor, "def") + guardsplitRawStat(world, actor, "spd");
    }
    /** 把一位战斗者的防/特防底子调到 def/spd；宝可梦走共享临时属性层，其他生物走原版护甲载体。返回承载这次改动的效果 id。 */
    function guardsplitSettle(world: CombatWorld, actor: CombatActor, def: number, spd: number, ticks: number): number {
        if (String(actor.domain()) === "cobblemon")
            return NativeModifiers.apply(world, actor, { stats: { def: Math.max(1, Math.round(def)), spd: Math.max(1, Math.round(spd)) } }, ticks);
        const current = guardsplitRawStat(world, actor, "def");
        const value = Math.max(1, Math.round((def + spd) / 2));
        return world.effect(guardsplitShift, actor, JSON.stringify({ armour: value - current }), ticks);
    }

    define({
        id: "guardsplit",
        cooldownParameter: "recharge",
        name: "防守平分",
        description: "利用超能力把双方防御与特防的数值相加再平分一段时间：厚的被削薄、薄的被加厚，两人扛在同一条线上。",
        uses: ["把自己的薄防抬到对手的厚度", "把对手的厚壁削到自己的水平", "在对手防御远高于自己时抹平差距"],
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
            const context: NumberContext = { pokemon: pokemon!, skill: skills["guardsplit"], detail: { values: config } };
            return { radius: p("guardsplit", "reach", context), geometry: "line", style: "split", color: 0x70C8C0, label: "防守平分" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["guardsplit"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("guardsplit", "tempo", context)),
                recover: Math.round(p("guardsplit", "aftercast", context)),
                cooldown: Math.round(p("guardsplit", "recharge", context)),
                active: 1,
                range: p("guardsplit", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, actor, "guardsplit") || CombatStatus.has(world, target, "guardsplit")) return "already-split";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("guardsplit", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:guardsplit:" + action.id(), guardsplitScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", target: action.target() === null ? "" : String(action.target()!.ref()),
                    path: [String(action.actor().ref()), action.target() === null ? String(action.actor().ref()) : String(action.target()!.ref())],
                    motes: Math.max(1, Math.round(p("guardsplit", "motes", action))) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) {
                WorldFeedback.emit(world, guardsplitScene, 1, body.position(), { moment: "fizzle" }, 16);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), guardsplitMissText, [], 22);
                done(action);
                return;
            }
            const foe = world.observe(target);
            if (foe === null) { done(action); return; }
            const window = Math.max(100, Math.round(p("guardsplit", "span", action)));
            const motes = Math.max(1, Math.round(p("guardsplit", "motes", action)));
            const scale = (body.width() + body.height()) / 2.3;
            const mineDef = guardsplitRawStat(world, actor, "def"), mineSpd = guardsplitRawStat(world, actor, "spd");
            const theirDef = guardsplitRawStat(world, target, "def"), theirSpd = guardsplitRawStat(world, target, "spd");
            const avgDef = Math.max(1, Math.round((mineDef + theirDef) / 2));
            const avgSpd = Math.max(1, Math.round((mineSpd + theirSpd) / 2));
            const gap = Math.abs(theirDef - mineDef) + Math.abs(theirSpd - mineSpd);
            const reference = Math.max(1, Math.max(mineDef + mineSpd, theirDef + theirSpd));
            const gauge = Math.max(0, Math.min(1, gap / reference));
            const flow = Math.max(4, Math.min(96, Math.round(motes * (0.4 + gauge * 1.6))));
            const changed = mineDef !== avgDef || mineSpd !== avgSpd || theirDef !== avgDef || theirSpd !== avgSpd;
            if (changed) {
                const layerSelf = guardsplitSettle(world, actor, avgDef, avgSpd, window + 40);
                const layerFoe = guardsplitSettle(world, target, avgDef, avgSpd, window + 40);
                MobEffects.apply(world, actor, guardsplitWindow, window, 0);
                MobEffects.apply(world, target, guardsplitWindow, window, 0);
                world.effect(guardsplitMark, actor, JSON.stringify({ layer: layerSelf, pair: String(target.ref()) }), window + 60);
                world.effect(guardsplitMark, target, JSON.stringify({ layer: layerFoe, pair: String(actor.ref()) }), window + 60);
            }
            WorldFeedback.emit(world, guardsplitScene, 1, body.position(),
                { moment: "merge", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                    motes: motes, flow: flow, gauge: gauge, average: avgDef, scale: scale,
                    intensity: Math.max(0.7, Math.min(2.2, gauge * 1.6 + 0.6)), even: changed ? 0 : 1 }, 36);
            if (changed) {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), guardsplitLevelText,
                    [avgDef, avgSpd], 30);
                WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), guardsplitLevelText,
                    [avgDef, avgSpd], 30);
            } else {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), guardsplitFlatText, [], 26);
            }
            sound(action, "minecraft:entity.illusioner.cast_spell");
            world.sound("minecraft:block.beacon.activate", body.position(), 14, "{}");
            done(action);
        }
    });

    // 平分存续期：每 20 刻续一次中央的平分护罩，让玩家读出现在还平着、还剩多久。
    WorldCombat.on("world_combat:move_guardsplit/hum", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== guardsplitWindow) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const marks = world.effects(actor, guardsplitMark);
        if (!marks.length) return;
        const mark = JSON.parse(String(marks[0].data()));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_guardsplit/hum/" + String(actor.ref()), guardsplitScene, 1, body.position(),
            { moment: "hum", target: String(actor.ref()), pair: String(mark.pair), flow: 4,
                path: [String(actor.ref()), String(mark.pair)], remaining: marks[0].remaining() }, 40);
    });

    // 窗口走完或被清除：按记号撤掉那层改动，数值回到原来的底子；其余修饰不受影响。
    WorldCombat.on("world_combat:move_guardsplit/revert", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== guardsplitWindow) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, guardsplitMark);
        let pair = "";
        if (marks.length) {
            const mark: GuardsplitMark = JSON.parse(String(marks[0].data()));
            if (typeof mark.layer === "number" && mark.layer >= 0) world.operation(mark.layer, "world_combat:dispel", "{}");
            pair = String(mark.pair);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, guardsplitScene, 1, body.position(),
            { moment: "revert", target: String(actor.ref()), pair: pair, path: [String(actor.ref()), pair] }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), guardsplitBackText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
}
