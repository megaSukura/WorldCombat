/**
 * 防守互换 / guardswap —— 注册与动作。
 *
 * 念头的形状：三幕。
 *   读（windup，提交前）：两片守势弧在两人身侧对齐，只播预告，可被打断且不花代价。
 *   换（cross，提交后）：把两人防/特防的能力等级对调——宝可梦走原生阶梯，其他生物走公共阶梯，
 *     同一套刻度；挂共享身份 world_combat:status/guardswap 的交换窗口，并各留一枚记号记下原来的等级与对方是谁。
 *   归（revert）：窗口走完或被外力（牛奶、清除效果）解除时，按记号把等级换回原位，画面静收。
 *
 * 与「防守平分」分开：平分把两人原始防/特防拉向同一个平均值、不碰等级；本招交换的是已经架起来的那几级。
 */
namespace PokemonSkills {
    export const guardswapScene = "world_combat:move_guardswap";
    export const guardswapWindow = "world_combat:guardswap_window";
    export const guardswapMark = "world_combat:guardswap_mark";
    export const guardswapSwapText = "world_combat.move.guardswap.text.swapped";
    export const guardswapEvenText = "world_combat.move.guardswap.text.even";
    export const guardswapBackText = "world_combat.move.guardswap.text.reverted";
    export const guardswapMissText = "world_combat.move.guardswap.text.miss";

    interface GuardsuwapMark { def: number; spd: number; pair: string; }

    WorldCombat.effect(guardswapMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["def", "spd"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid guard swap stage: " + key);
        });
        if (typeof value.pair !== "string") throw new Error("Invalid guard swap partner");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(guardswapMark, "start", function () { });
    WorldCombat.effectHandler(guardswapMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 一位战斗者某个能力当前的等级（宝可梦读原生阶梯，其他生物读公共阶梯）。 */
    export function guardswapStageOf(world: CombatWorld, actor: CombatActor, stat: string): number {
        if (!world.valid(actor)) return 0;
        if (String(actor.domain()) === "cobblemon") return NativeEffects.stage(NativeEffects.read(world, actor), stat);
        return CombatStages.stage(world, actor, stat);
    }
    /** 守势合计（防 + 特防的等级），供本招 AI 判断值不值得换。 */
    export function guardswapGuard(world: CombatWorld, actor: CombatActor): number {
        return guardswapStageOf(world, actor, "def") + guardswapStageOf(world, actor, "spd");
    }
    function guardswapStages(world: CombatWorld, actor: CombatActor): number[] {
        return [guardswapStageOf(world, actor, "def"), guardswapStageOf(world, actor, "spd")];
    }
    function guardswapSet(world: CombatWorld, actor: CombatActor, from: number[], to: number[]): void {
        if (to[0] !== from[0]) NativeEffects.boost(world, actor, "def", to[0] - from[0]);
        if (to[1] !== from[1]) NativeEffects.boost(world, actor, "spd", to[1] - from[1]);
    }
    function guardswapRestore(world: CombatWorld, actor: CombatActor, mark: GuardsuwapMark): boolean {
        const current = guardswapStages(world, actor);
        const changed = mark.def !== current[0] || mark.spd !== current[1];
        guardswapSet(world, actor, current, [mark.def, mark.spd]);
        return changed;
    }

    define({
        id: "guardswap",
        name: "防守互换",
        description: "利用超能力把双方防御与特防的能力变化对调一段窗口：换完你拿走对方架起来的守势，窗口走完自动换回。",
        uses: ["把对手涨起来的防/特防夺过来", "在自己防御被破后把漏洞甩给对手", "把对手的铜墙铁壁借来硬扛一轮"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 70,
        style: "ward",
        stationary: true,
        defaults: { ai: { maxChase: 12, margin: 1, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["guardswap"], detail: { values: config } };
            return { radius: p("guardswap", "reach", context), geometry: "line", style: "ward", color: 0x6FA8C8, label: "防守互换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["guardswap"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("guardswap", "tempo", context)),
                recover: Math.round(p("guardswap", "aftercast", context)),
                cooldown: Math.round(p("guardswap", "recharge", context)),
                active: 1,
                range: p("guardswap", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, actor, "guardswap") || CombatStatus.has(world, target, "guardswap")) return "already-swapped";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("guardswap", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:guardswap:" + action.id(), guardswapScene, 1, action.origin(),
                JSON.stringify({ moment: "read", target: action.target() === null ? "" : String(action.target()!.ref()),
                    path: [String(action.actor().ref()), action.target() === null ? String(action.actor().ref()) : String(action.target()!.ref())],
                    threads: Math.max(1, Math.round(p("guardswap", "threads", action))) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) {
                WorldFeedback.emit(world, guardswapScene, 1, body.position(), { moment: "fizzle" }, 16);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), guardswapMissText, [], 22);
                done(action);
                return;
            }
            const foe = world.observe(target);
            if (foe === null) { done(action); return; }
            const window = Math.max(80, Math.round(p("guardswap", "span", action)));
            const threads = Math.max(1, Math.round(p("guardswap", "threads", action)));
            const scale = (body.width() + body.height()) / 2.3;
            const mine = guardswapStages(world, actor), theirs = guardswapStages(world, target);
            const gap = Math.abs(theirs[0] - mine[0]) + Math.abs(theirs[1] - mine[1]);
            const spread = Math.max(0.5, Math.min(1.5, 0.6 + gap * 0.14));
            guardswapSet(world, actor, mine, theirs);
            guardswapSet(world, target, theirs, mine);
            const changed = mine[0] !== theirs[0] || mine[1] !== theirs[1];
            if (changed) {
                MobEffects.apply(world, actor, guardswapWindow, window, 0);
                MobEffects.apply(world, target, guardswapWindow, window, 0);
                world.effect(guardswapMark, actor, JSON.stringify({ def: mine[0], spd: mine[1], pair: String(target.ref()) }), window + 60);
                world.effect(guardswapMark, target, JSON.stringify({ def: theirs[0], spd: theirs[1], pair: String(actor.ref()) }), window + 60);
            }
            const intensity = Math.max(0.7, Math.min(2.2, gap / 3 + 0.6));
            WorldFeedback.emit(world, guardswapScene, 1, body.position(),
                { moment: "cross", path: [String(actor.ref()), String(target.ref())], target: String(target.ref()),
                    threads: threads, gap: gap, spread: spread, scale: scale, intensity: intensity, even: changed ? 0 : 1 }, 34);
            WorldFeedback.emit(world, guardswapScene, 1, body.position(),
                { moment: "take", path: [String(target.ref()), String(actor.ref())], target: String(target.ref()),
                    threads: threads, gap: gap, spread: spread, scale: scale, intensity: intensity, even: changed ? 0 : 1 }, 34);
            if (changed) {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), guardswapSwapText,
                    [theirs[0] >= 0 ? "+" + theirs[0] : String(theirs[0]), theirs[1] >= 0 ? "+" + theirs[1] : String(theirs[1])], 30);
                WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), guardswapSwapText,
                    [mine[0] >= 0 ? "+" + mine[0] : String(mine[0]), mine[1] >= 0 ? "+" + mine[1] : String(mine[1])], 30);
            } else {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), guardswapEvenText, [], 26);
            }
            sound(action, "minecraft:entity.evoker.cast_spell");
            world.sound("minecraft:block.amethyst_block.resonate", body.position(), 14, "{}");
            done(action);
        }
    });

    // 交换存续期：每 20 刻续一次两人之间的守势弧，让玩家读出现在还换着、还剩多久。
    WorldCombat.on("world_combat:move_guardswap/hum", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== guardswapWindow) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const marks = world.effects(actor, guardswapMark);
        if (!marks.length) return;
        const mark = JSON.parse(String(marks[0].data()));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_guardswap/hum/" + String(actor.ref()), guardswapScene, 1, body.position(),
            { moment: "hum", target: String(actor.ref()), pair: String(mark.pair), threads: 3,
                path: [String(actor.ref()), String(mark.pair)], remaining: marks[0].remaining() }, 40);
    });

    // 窗口走完或被清除：按记号把守势等级换回原处，画面静收；其余修饰不受影响。
    WorldCombat.on("world_combat:move_guardswap/revert", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== guardswapWindow) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, guardswapMark);
        let pair = "";
        if (marks.length) {
            const mark: GuardsuwapMark = JSON.parse(String(marks[0].data()));
            guardswapRestore(world, actor, mark);
            pair = String(mark.pair);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, guardswapScene, 1, body.position(),
            { moment: "revert", target: String(actor.ref()), pair: pair, path: [String(actor.ref()), pair] }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), guardswapBackText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
}
