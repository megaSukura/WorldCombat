/**
 * 虫咬 / bugbite —— 第 072 组「以对手的持有物为材料的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 60、虫、物理、命中 100、PP 20、接触、咬击；
 *   命中时若目标携带树果，把它咬下来吃掉，并获得那颗树果的效果。
 * - 即时战斗翻译：一口咬住，顺势把对手身上的树果咬下来当场吞掉，果子的效果落到自己身上
 *   （回复 / 解除异常 / 提升能力等级），咀嚼要花几刻、期间停在原地。与同为“吃果”的啄食分开：
 *   虫咬更短更重、贴近咬合、咀嚼后吸收更充分（效果 ×吸收系数），啄食则够得远、够得高、吞得快而浅。
 * - 参数分散到精灵数据：威力取物攻（牙口）与体重（压得住），贴近距离取物攻，每刻位移取速度，
 *   判定半径取体型高度，轻推取体重；咀嚼时间取速度，吸收系数取物攻（咬得碎、吸收好），
 *   粒子数量取物攻。树果是什么、吃下有什么基本效果，统一读 `NativeItems` 的共享树果注册库
 *   （原生标签 cobblemon:berries 定身份，onEat 效果只有一份表）；本招只决定吸收系数、咀嚼时机与额外收益。
 * 配置 devour（狼吞）：咀嚼更久、吸收 ×1.25、能力等级提升多 1 级，代价是本击 ×0.9；关闭则吸收 ×0.8、本击 ×1.08。
 *
 * 伤害段名 gnaw：这一咬随精灵数据变化的那部分。树果效果在命中并成功吃掉后结算。
 */
namespace PokemonSkills {
    /** 目标手里的树果；不是树果（或没持有物）时返回 null（这一咬就没有果子可吃）。 */
    export function bugbiteBerryOf(world: CombatWorld, actor: CombatActor): NativeItems.Berry | null {
        return NativeItems.berryFrom(NativeItems.heldOf(world, actor));
    }
    /** 把咬下的树果效果落到自己身上；返回本次实际发生的事，供表现与浮字读取。虫咬取尖刺反噬。 */
    export function bugbiteAbsorb(current: CombatAction, berry: NativeItems.Berry, absorb: number, extraStage: number): NativeItems.EatResult {
        return NativeItems.eat(current.world(), current.actor(), berry, absorb, extraStage, "bugbite_berry", true, "bugbite_spike");
    }

    actionParameters.define("bugbite", {
        /** 咬击威力：基础 50；物攻每比 60 多 1 加 0.32（夹 -12..+34），体重每比 50 多 1 加 0.04（夹 -2..+12），
         *  等级每比 30 多 1 加 0.4（夹 -6..+12）；devour 开 ×0.9、关 ×1.08；夹在 34..104。 */
        gnaw: formula(
            F.base(50)
                .plus(F.stat("attack").minus(60).times(0.32).clamp(-12, 34))
                .plus(F.body("weight").minus(50).times(0.04).clamp(-2, 12))
                .plus(F.level().minus(30).times(0.4).clamp(-6, 12))
                .times(F.when(F.pref("devour"), F.const(0.9), F.const(1.08)))
                .clamp(34, 104).round(1),
            "咬击威力", {
                unit: "威力",
                description: "这一口随精灵数据变化的那部分：物攻给出牙口的狠度，体重把它压得更实，等级给出咬合的深度。对手防御、相性与暴击在命中时另算。"
            }),
        /** 贴近距离：基础 2.6 格，物攻每比 60 多 1 加 0.012（夹 -0.3..+1.0），夹在 2.2..4.0 格。 */
        reach: formula(
            F.base(2.6).plus(F.stat("attack").minus(60).times(0.012).clamp(-0.3, 1.0)).clamp(2.2, 4.0).round(2),
            "贴近距离", {
                unit: "格",
                description: "从起步到咬合的总位移；牙口大的个体扑得更远。它也是本招的实际射程来源。"
            }),
        /** 每刻位移：基础 0.45 格，速度每比 60 多 1 加 0.005（夹 -0.1..+0.4），夹在 0.35..0.9 格/刻。 */
        step: formula(
            F.base(0.45).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.1, 0.4)).clamp(0.35, 0.9).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑出去咬合时每刻前进的距离；这一口偏短，靠牙口而不是速度。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.12，夹在 0.28..0.64 格。 */
        radius: formula(
            F.base(0.36).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.28, 0.64).round(2),
            "判定半径", {
                unit: "格",
                description: "咬合够到活体的横向判定半径；身板越大张口越大。"
            }),
        /** 轻推距离：体重每比 50 多 1 加 0.002（夹 -0.04..+0.3），夹在 0.06..0.5 格。 */
        push: formula(
            F.base(0.14).plus(F.body("weight").minus(50).times(0.002).clamp(-0.04, 0.3)).clamp(0.06, 0.5).round(2),
            "顶开距离", {
                unit: "格",
                description: "咬住后把目标挤开的方向距离；越重挤得越远。"
            }),
        /** 起手：基础 6 刻，速度每比 60 多 1 减 0.02（夹 -1.5..+3），夹在 3..10 刻。 */
        charge: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 3)).clamp(3, 10).round(0),
            "起手时间", "张口压低、扑出去咬合要多久；快的个体起得越短。"),
        /** 咀嚼时间：基础 10 刻，速度每比 60 多 1 减 0.03（夹 -2..+5）；devour 开 +6；夹在 5..20 刻。 */
        chew: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 5))
                .plus(F.when(F.pref("devour"), F.const(6), F.const(0)))
                .clamp(5, 20).round(0),
            "咀嚼时间", "把咬下来的树果嚼碎、吸收要多久；快的个体咬得早，狼吞式嚼得更久。"),
        /** 吸收系数：基础 0.9，物攻每比 60 多 1 加 0.003（夹 0..0.4）；devour 开 ×1.25、关 ×0.8；夹在 0.6..1.6。 */
        absorb: formula(
            F.base(0.9).plus(F.stat("attack").minus(60).times(0.003).clamp(0, 0.4))
                .times(F.when(F.pref("devour"), F.const(1.25), F.const(0.8)))
                .clamp(0.6, 1.6).round(3),
            "吸收系数", {
                unit: "倍",
                description: "咬碎后吸收得多完整：物攻越高吸收越好，狼吞式再乘 1.25，回血与尖刺反噬都按它缩放。"
            }),
        /** 果屑数量：基础 12，物攻每比 60 多 1 加 0.1（夹 -3..+18），夹在 8..30 个；驱动命中与咀嚼粒子。 */
        motes: formula(
            F.base(12).plus(F.stat("attack").minus(60).times(0.1).clamp(-3, 18)).clamp(8, 30).round(0),
            "果屑数量", {
                unit: "个",
                description: "咬开与咀嚼时迸出的果屑数量；牙口越大越多，粒子按它发射。"
            }),
        /** 收招：基础 7 刻，速度每比 60 多 1 减 0.02（夹 -1..+2），夹在 5..10 刻。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(5, 10).round(0),
            "收招", "咽下与收口的时间；快的个体收得干脆。"),
        /** 冷却：基础 26 刻，速度每比 60 多 1 减 0.06（夹 -2..+5），夹在 18..38 刻。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.06).clamp(-2, 5)).clamp(18, 38).round(0),
            "冷却", "两次虫咬之间的等待；比啄食略长，换来更重的一口与更充分的吸收。"),
        traceAhead: hidden(1.1),
        minimumMove: hidden(0.05)
    });

    stages("bugbite", [
        { level: 22, values: { gnaw: 64 } },
        { level: 40, values: { gnaw: 74, absorb: 1.05 } }
    ]);

    defineDamage("bugbite", "gnaw", { defenceCoefficient: 0.005, rationale: "咬合对防御的穿透接近默认，突出物攻与体重的差别。" }, { contact: true, bite: true });

    describe("bugbite", [
        { key: "description.0", values: ["gnaw", "radius"] },
        { key: "description.1", values: ["reach", "step", "push"] },
        { key: "description.2", values: ["chew", "absorb", "motes"] },
        { key: "devour.on", values: [], when: function (context) { return read(context.detail.values, ["devour"]) === true; } },
        { key: "devour.off", values: [], when: function (context) { return read(context.detail.values, ["devour"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gnaw"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gnaw", "tier.1.absorb"] }
    ]);
}
