/**
 * 速度互换 / speedswap —— 执行组织与可逆交换。
 *
 * 核心念头：把两个人的速度在一条线上对调——你快我慢的次序，从碰到的一刻起倒过来。
 *
 * 三幕：
 *   读（windup，提交前）：两道速度读数在两人之间对齐，只播预告。
 *   换（cross，提交后）：读出双方的有效速度（宝可梦读原生速度与速度等级，其他生物读移动速度与公共速度等级，
 *     同一套刻度），按配置把速度等级各自调到「拿到对方那一档」的位置；挂上共享身份 world_combat:status/speedswap
 *     的交换窗口，并各留一枚记号记下原来的等级与对方是谁。
 *   归（revert）：窗口走完或被外力（牛奶、清除效果）解除时，按记号把速度等级换回原来的位置，画面静收。
 *
 * 为什么换的是等级而不是原始数值：原生换 `storedStats.spe`；但这个世界里决定你跑多快、出手多快的是
 *   基础速度 × 速度等级乘出来的**有效速度**，而等级阶梯对宝可梦、原版生物、玩家是同一条路。换等级 =
 *   换有效速度，且换完真的会改变移动速度与出手节奏，也能精确换回。
 *
 * 与力量转换分开：力量转换交换**同一个身体**上的攻与防；速度互换交换**两个人之间**的速度，并把交换落在窗口里。
 */
namespace PokemonSkills {
    export const speedswapId = "speedswap";
    export const speedswapShift = "world_combat:speedswap_shift";
    export const speedswapMark = "world_combat:speedswap_mark";
    export const speedswapScene = "world_combat:move_speedswap";
    export const speedswapShiftText = "world_combat.move.speedswap.text.shift";
    export const speedswapRevertText = "world_combat.move.speedswap.text.revert";
    export const speedswapEqualText = "world_combat.move.speedswap.text.equal";

    interface SpeedReading { actor: CombatActor; base: number; stage: number; reference: number; }

    WorldCombat.effect(speedswapMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.at !== "number" || !isFinite(value.at)) throw new Error("Invalid speed swap stage");
        if (typeof value.pair !== "string") throw new Error("Invalid speed swap partner");
        if (typeof value.threads !== "number" || !isFinite(value.threads) || value.threads < 1) throw new Error("Invalid speed swap threads");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(speedswapMark, "start", function () { });
    WorldCombat.effectHandler(speedswapMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 一名战斗者当前的速度等级（宝可梦读原生阶梯，其他生物读公共阶梯）。 */
    export function speedswapStageOf(world: CombatWorld, actor: CombatActor): number {
        if (String(actor.domain()) === "cobblemon") return NativeEffects.stage(NativeEffects.read(world, actor), "spe");
        return CombatStages.stage(world, actor, "spe");
    }

    /** 一名战斗者的速度读数：基础速度（不含等级）、当前速度等级、以及把两个物种放在同一把尺上的参考量。 */
    export function speedswapReading(world: CombatWorld, actor: CombatActor): SpeedReading {
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
            return { actor: actor, base: Math.max(1, NativeEffects.stat(pokemon, state, "spe")),
                stage: NativeEffects.stage(state, "spe"), reference: 100 };
        }
        const attribute = world.attributeValue(actor, "minecraft:generic.movement_speed");
        const stage = CombatStages.stage(world, actor, "spe"), mult = CombatStages.multiplier(stage);
        const value = attribute === null ? 0 : attribute.value();
        return { actor: actor, base: mult > 0 ? value / mult : value, stage: stage, reference: 0.23 };
    }

    /** 有效速度读数（同一刻度）：基础速度 × 等级倍率 ÷ 参考量。 */
    export function speedswapRating(reading: SpeedReading): number {
        return reading.base * NativeEffects.multiplier(reading.stage) / reading.reference;
    }
    /** 要让有效速度读数变成 r，需要把速度等级调到哪一档（-6..6，取整到最近的整数级）。 */
    function speedswapStageFor(r: number): number {
        if (!(r > 0) || !isFinite(r)) return -6;
        const stage = r >= 1 ? 2 * r - 2 : 2 - 2 / r;
        return Math.max(-6, Math.min(6, Math.round(stage)));
    }
    /** 把一方的速度调到目标读数，返回实际改变的等级；无法改变（基础速度为 0）返回 0。 */
    function speedswapApply(world: CombatWorld, reading: SpeedReading, target: number): number {
        if (!(reading.base > 0)) return 0;
        const want = speedswapStageFor(target * reading.reference / reading.base);
        const delta = want - reading.stage;
        if (delta !== 0) NativeEffects.boost(world, reading.actor, "spe", delta);
        return delta;
    }

    define({
        id: speedswapId,
        name: "Speed Swap",
        description: "把自己的有效速度与目标对调一段时间：换完你快我慢的次序倒过来，窗口走完自动换回。",
        uses: ["从比自己快的对手身上借速度", "把比自己慢的对手拖到自己的节奏", "在对手先手压制的开局把次序倒过来"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 75,
        style: "swap",
        defaults: { mode: 1, ai: { maxChase: 12, minEdge: 1.15, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[speedswapId], detail: { values: config } };
            return { radius: p(speedswapId, "reach", context), geometry: "line", style: "swap", color: 0x7FD8E8,
                label: config && config.mode === 0 ? "速度互换·拉平" : "速度互换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[speedswapId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(speedswapId, "tempo", context)),
                recover: Math.round(p(speedswapId, "aftercast", context)),
                cooldown: Math.round(p(speedswapId, "recharge", context)),
                active: 1,
                range: p(speedswapId, "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, actor, "speedswap") || CombatStatus.has(world, target, "speedswap")) return "already-swapped";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(speedswapId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_speedswap:read", speedswapScene, 1, action.origin(),
                JSON.stringify({ moment: "read", target: action.target() === null ? "" : String(action.target()!.ref()),
                    path: [String(action.actor().ref()), action.target() === null ? String(action.actor().ref()) : String(action.target()!.ref())],
                    threads: Math.max(1, Math.round(p(speedswapId, "threads", action))) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) {
                WorldFeedback.emit(world, speedswapScene, 1, body.position(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const mode = config && config.mode === 0 ? 0 : 1;
            const span = Math.max(60, Math.round(p(speedswapId, "span", action)));
            const threads = Math.max(1, Math.round(p(speedswapId, "threads", action)));
            const mine = speedswapReading(world, actor), theirs = speedswapReading(world, target);
            const ratingMine = speedswapRating(mine), ratingTheirs = speedswapRating(theirs);
            const middle = (ratingMine + ratingTheirs) / 2;
            const targetMine = mode === 1 ? ratingTheirs : middle;
            const targetTheirs = mode === 1 ? ratingMine : middle;
            const movedMine = speedswapApply(world, mine, targetMine);
            const movedTheirs = speedswapApply(world, theirs, targetTheirs);
            // 谁快谁慢由机制算出：画面沿「快→慢」那条线画出速度的转移方向，玩家一眼看出谁把速度给了谁。
            const fast = ratingMine >= ratingTheirs ? String(actor.ref()) : String(target.ref());
            const slow = ratingMine >= ratingTheirs ? String(target.ref()) : String(actor.ref());
            const path: string[] = [fast, slow];
            const gap = Math.round(Math.abs(ratingMine - ratingTheirs) * 100) / 100;
            if (movedMine !== 0 || movedTheirs !== 0) {
                MobEffects.apply(world, actor, speedswapShift, span, 0);
                MobEffects.apply(world, target, speedswapShift, span, 0);
                world.effect(speedswapMark, actor, JSON.stringify({ at: mine.stage, pair: String(target.ref()), threads: threads }), span);
                world.effect(speedswapMark, target, JSON.stringify({ at: theirs.stage, pair: String(actor.ref()), threads: threads }), span);
            }
            WorldFeedback.emit(world, speedswapScene, 1, body.position(),
                { moment: "cross", target: String(target.ref()), path: path, fast: fast, slow: slow, threads: threads,
                    gap: gap, scale: 1, intensity: Math.max(0.7, Math.min(2.2, gap + 0.6)), equal: movedMine === 0 && movedTheirs === 0 ? 1 : 0 }, 32);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)),
                movedMine === 0 && movedTheirs === 0 ? speedswapEqualText : speedswapShiftText, [Math.round(span / 20)], 32);
            world.sound("minecraft:block.beacon.power_select", body.position(), 14, "{}");
            done(action);
        }
    });

    // 交换存续期：每 20 刻续一次两人的对流画面，让玩家读出现在还在换着、还剩多久。
    WorldCombat.on("world_combat:move_speedswap/hum", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== speedswapShift) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const marks = world.effects(actor, speedswapMark);
        if (!marks.length) return;
        const mark = JSON.parse(String(marks[0].data()));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_speedswap/hum/" + String(actor.ref()), speedswapScene, 1, body.position(),
            { moment: "hum", target: String(actor.ref()), pair: String(mark.pair), threads: Math.max(2, Math.round(mark.threads)),
                path: [String(actor.ref()), String(mark.pair)], remaining: marks[0].remaining() }, 40);
    });

    // 窗口走完或被清除：按记号把速度等级换回原处，画面静收；其余修饰不受影响。
    WorldCombat.on("world_combat:move_speedswap/revert", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== speedswapShift) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, speedswapMark);
        let partner = "";
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            const back = Math.round(mark.at) - speedswapStageOf(world, actor);
            if (back !== 0) NativeEffects.boost(world, actor, "spe", back);
            partner = String(mark.pair);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, speedswapScene, 1, body.position(),
            { moment: "revert", target: String(actor.ref()), pair: partner, path: [String(actor.ref()), partner] }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), speedswapRevertText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
}
