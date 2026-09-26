/**
 * 灵骚 / poltergeist —— 第 026 组「以持有物为材料的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 110、幽灵、物理、命中 90、PP 5、非接触；目标没有携带道具时招式失败。
 * - 即时战斗翻译：施法者隔空攥住对手手里的东西，让它自己脱手、绕出一段弧线再砸回主人身上；道具只是被“操纵”，
 *   并不夺走（原生也不取走），所以命中后东西仍在对方手里。目标空手时这一招无从下手，起手即失败、不花 PP。
 *   它是本族的压轴招：威力最高、PP 最少、射程最远且不接触。
 * - 参数分散到精灵数据：威力取特攻（隔空的念力）与物攻（挥出的那一下），射程、起手与飞行速度取特攻，判定半径取体型高度，
 *   顶开与碎屑取体重，缠身时长取等级。
 * 配置 bind（道具缠身）：命中后让那件道具贴着目标不放、使其减速一段时间，代价是本击 ×0.8；关闭则纯是重砸。
 *
 * 伤害段名 whip：这一甩随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    /** 一次观察到的持有物快照：id 用于外观，`expected` 是 CAS 比对的完整栈，用于复核目标是否换了／放下了它。 */
    export interface PoltergeistHeld { id: string; provider: string; slot: string; index: number; expected: string; }
    /** 一名战斗者当前的“持有物”。宝可梦取携带物、其他生物取主手，走同一原生装备读取路径，带回可复核的快照。 */
    export function poltergeistHeldOf(world: CombatWorld, actor: CombatActor): PoltergeistHeld | null {
        var held = NativeItems.heldOf(world, actor);
        return held === null ? null : { id: held.id, provider: held.slot.provider, slot: held.slot.slot,
            index: held.slot.index, expected: held.expected };
    }
    /** 两件观察是否仍指同一个槽里的同一份栈；换物、脱手或槽位变化都为假。 */
    export function poltergeistSameHeld(first: PoltergeistHeld, second: PoltergeistHeld): boolean {
        return first.id === second.id && first.provider === second.provider && first.slot === second.slot
            && first.index === second.index && first.expected === second.expected;
    }
    /** 本场对局的临时记忆：某目标在蓄力间脱手／换物让本招落空后，AI 不再反复点名该候选。 */
    var poltergeistStalled: { [key: string]: number } = Object.create(null);
    export function poltergeistStallSet(world: CombatWorld, actor: CombatActor, target: CombatActor, ticks: number): void {
        poltergeistStalled[String(actor.ref()) + "|" + String(target.ref())] = world.tick() + Math.max(20, Math.round(ticks));
    }
    export function poltergeistStalledAt(world: CombatWorld, actor: CombatActor, target: CombatActor): boolean {
        var key = String(actor.ref()) + "|" + String(target.ref()), until = poltergeistStalled[key];
        if (until === undefined) return false;
        if (world.tick() >= until) { delete poltergeistStalled[key]; return false; }
        return true;
    }

    actionParameters.define("poltergeist", {
        /** 甩击威力：特攻每比 70 多 1 加 0.34（夹 -16..+34），物攻每比 70 多 1 加 0.22（夹 -10..+24）；bind 开 ×0.8；夹在 70..175。 */
        whip: formula(
            F.base(110)
                .plus(F.stat("specialAttack").minus(70).times(0.34).clamp(-16, 34))
                .plus(F.stat("attack").minus(70).times(0.22).clamp(-10, 24))
                .times(F.when(F.pref("bind"), F.const(0.8), F.const(1.0)))
                .clamp(70, 175).round(1),
            "甩击威力", {
                base: 110, unit: "威力",
                description: "这一甩随精灵数据变化的那部分：特攻代表隔空操纵的念力，物攻是道具砸上去的重量感；bind 开启时 ×0.8。对手防御、相性与暴击在命中时另算。"
            }),
        /** 聚念时间：特攻每比 70 多 1 减 0.02 秒（下限 4 秒），夹在 4..8 秒。 */
        charge: seconds(
            F.base(7).minus(F.stat("specialAttack").minus(70).max(0).times(0.02)).clamp(4, 8).round(0),
            "聚念时间", "隔空攥住那件东西之前凝神的时间；念力强的个体起得更短。"),
        /** 操纵距离：特攻每比 70 多 1 加 0.04 格（下限 -0.5），夹在 6..9 格。 */
        reach: formula(
            F.base(7).plus(F.stat("specialAttack").minus(70).max(0).times(0.04)).clamp(6, 9).round(2),
            "操纵距离", {
                base: 7, unit: "格",
                description: "能隔多远攥住并甩出那件道具；念力越强够得越远。"
            }),
        /** 甩出速度：特攻每比 70 多 1 加 0.006 格/刻，夹在 0.9..1.5 格/刻。 */
        boltSpeed: formula(
            F.base(1.0).plus(F.stat("specialAttack").minus(70).max(0).times(0.006)).clamp(0.9, 1.5).round(2),
            "甩出速度", {
                unit: "格/刻",
                description: "道具被甩回目标时的速度；念力越强甩得越急。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.1，夹在 0.24..0.55 格。 */
        radius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.24, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "甩出物的判定半径；大个子召来的东西更大。"
            }),
        /** 起步偏距：高度每比 1.4 高 1 格加 0.1，夹在 0.6..1.4 格；道具先被扯离手再甩回。 */
        verge: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.6, 1.4).round(2),
            "起步偏距", {
                unit: "格",
                description: "道具被扯离目标手边的横向偏距，决定那条弧线张得多开。"
            }),
        /** 顶开距离：体重每比 50 多 1 加 0.003 格（夹 -0.06..+0.5），夹在 0.1..0.8 格。 */
        push: formula(
            F.base(0.22).plus(F.body("weight").minus(50).times(0.003).clamp(-0.06, 0.5)).clamp(0.1, 0.8).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中时把目标沿甩出方向推开的距离；越重推得越远。"
            }),
        /** 缠身时长：基础 60 刻，等级每比 20 高 1 加 1.5 刻；bind 关闭时为 0；夹在 40..140 刻。 */
        slowTicks: seconds(
            F.when(F.pref("bind"), F.base(60).plus(F.level().minus(20).max(0).times(1.5)).clamp(40, 140), F.const(0))
                .round(0),
            "缠身时长", "bind 开启时，命中后那件道具贴着目标不放、让它减速多久。"),
        /** 幽火数量：特攻每比 70 多 1 加 0.3（夹 -4..+16），夹在 10..30 个；驱动命中粒子。 */
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").minus(70).times(0.3).clamp(-4, 16)).clamp(10, 30).round(0),
            "幽火数量", {
                unit: "个",
                description: "幽灵之火的数量；念力越强越多，粒子按它发射。"
            })
    });

    stages("poltergeist", [
        { level: 25, values: { whip: 125 } },
        { level: 45, values: { whip: 140, reach: 8 } }
    ]);

    defineDamage("poltergeist", "whip", { defenceCoefficient: 0.0055, rationale: "隔空甩出的重物穿透略强于默认，让特攻与物攻的差别更可见。" }, { contact: false });

    describe("poltergeist", [
        { key: "description.0", values: ["whip", "radius"] },
        { key: "description.1", values: ["reach", "boltSpeed", "verge"] },
        { key: "description.2", values: ["push"] },
        { key: "description.item", values: [] },
        { key: "bind.on", values: ["slowTicks"], when: function (context) { return read(context.detail.values, ["bind"]) === true; } },
        { key: "bind.off", values: [], when: function (context) { return read(context.detail.values, ["bind"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.whip"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.whip", "tier.1.reach"] }
    ]);
}
