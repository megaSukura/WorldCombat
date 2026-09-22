/**
 * 暴风 / hurricane 的参数与伤害段。
 *
 * 原生事实：Flying、特殊、威力 110、命中 70（雨/大暴雨必中、大晴天降到 50）、PP 10、目标 any、风类，
 * 30% 使对手混乱（Cobblemon 1.8，71 位学习者）。
 * 翻译：把“用强烈的风席卷对手”落成一道**横掠战场的大风旋**：它不从施法者身上爆开，而是从施法者处生成、
 * 沿瞄准方向一路卷过去，涡心经过的地方把范围内的敌人卷起、抛出去，并可能把目标卷得晕头转向。
 * 它不是一颗弹丸、也不是原地不动的区域，而是一堵会走的、有宽度的风墙——玩家能从涡心走过的路线读懂它会扫到哪。
 *
 * 天气是材料：**下雨**时风旋更稳、更宽、更快、更容易把人卷晕（对应原生必中）；**晴天**（白天且见天）
 * 风旋会左右飘移、半径收小、混乱概率下降，能不能卷到人由走位与风的行踪共同决定（对应原生 50 命中）。
 *
 * 与同族分开：青草搅拌器是在落点固定成形的切割旋风；暴风是会移动、会左右飘、把人卷起来抛出去的风墙。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   gale          风威：特攻决定这一卷的伤害，雨天再抬一截。
 *   vortexRadius  涡径：碰撞箱高度与特攻决定风墙多宽；雨天更宽、晴天更窄、收束式更小。
 *   travel        行进距离：特攻决定风能走多远（本招射程）。
 *   advance       行进速度：特攻与天气决定每刻前进多少。
 *   toss          抛掷距离：特攻给出风的力量，目标越轻被抛得越远。
 *   lift          抬升高度：目标越轻被抬得越高。
 *   confuseChance 混乱概率：特攻、天气与配置共同决定。
 *   confuseTicks  混乱时长：特攻与等级决定晕多久。
 *   drift         晴天飘移：晴天时风旋左右摆动的最大幅度。
 *   swathes       风带数：特攻与等级决定每刻卷起的风带，也驱动表现密度。
 *   tempo/aftercast/recharge  速度决定起手、收招与冷却。
 * 配置 tight（收束式）双向取舍：涡径更小，但风威更高、走得更快、混乱概率更高、冷却更长；
 * 广域式（默认）覆盖更宽、抛得更远，但单点更轻。
 *
 * 伤害段 gale：这一卷随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("hurricane", {
        /** 风威：特攻每比 60 多 1 加 0.45（上限 +54）；雨天 ×1.12；收束 ×1.12 / 广域 ×0.92；夹在 60..190。 */
        gale: formula(
            F.base(95).plus(F.stat("specialAttack").minus(60).times(0.45).clamp(-16, 54))
                .times(F.when(F.world("rain").gt(0.2), F.const(1.12), F.const(1)))
                .times(F.when(F.pref("tight"), F.const(1.12), F.const(0.92)))
                .clamp(60, 190).round(1),
            "风威", {
                unit: "威力",
                description: "被风旋卷入时那一下的基础威力；特攻越高风越狠，雨天风更重，收束式更集中。对手特防、相性与暴击在命中时另算。"
            }),
        /** 涡径：基础 2.6 格加碰撞箱高度 ×0.5，特攻每比 60 多 1 加 0.01；雨天 ×1.15、晴天 ×0.82；收束 ×0.72 / 广域 ×1.2；夹在 1.5..5.0。 */
        vortexRadius: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.5))
                .plus(F.stat("specialAttack").minus(60).times(0.01).clamp(-0.3, 0.8))
                .times(F.when(F.world("rain").gt(0.2), F.const(1.15),
                    F.when(F.world("day").gt(0).times(F.world("skyVisible").gt(0)).times(F.world("rain").lt(0.2)), F.const(0.82), F.const(1))))
                .times(F.when(F.pref("tight"), F.const(0.72), F.const(1.2)))
                .clamp(1.5, 5.0).round(2),
            "涡径", {
                unit: "格",
                description: "风旋横截面的半径，也是判定与画面的范围；大个子、特攻高更宽，雨天更宽、晴天更窄，收束式收得更小。"
            }),
        /** 行进距离：基础 11 格，特攻每比 60 多 1 加 0.04；夹在 10..18。 */
        travel: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 5)).clamp(10, 18).round(1),
            "行进距离", {
                unit: "格",
                description: "风旋从施法者出发能走多远；特攻越高风势越远。它也是本招的实际射程来源。"
            }),
        /** 行进速度：基础 0.55 格/刻，特攻每比 60 多 1 加 0.001；雨天 ×1.2、晴天 ×0.85；收束 ×1.15；夹在 0.35..0.95。 */
        advance: formula(
            F.base(0.55).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.05, 0.15))
                .times(F.when(F.world("rain").gt(0.2), F.const(1.2),
                    F.when(F.world("day").gt(0).times(F.world("skyVisible").gt(0)).times(F.world("rain").lt(0.2)), F.const(0.85), F.const(1))))
                .times(F.when(F.pref("tight"), F.const(1.15), F.const(1)))
                .clamp(0.35, 0.95).round(2),
            "行进速度", {
                unit: "格/刻",
                description: "风旋每刻向前推进多少；雨天风急更快、晴天迟滞更慢，收束式更利落。"
            }),
        /** 抛掷距离：基础 1.4 格，特攻每比 60 多 1 加 0.01（上限 +0.8），目标体重每比 60 多 1 减 0.004（上限 ±0.6）；收束 ×0.85 / 广域 ×1.2；夹在 0.6..2.8。 */
        toss: formula(
            F.base(1.4).plus(F.stat("specialAttack").minus(60).times(0.01).clamp(0, 0.8))
                .minus(F.target("body.weight").minus(60).times(0.004).clamp(-0.6, 0.6))
                .times(F.when(F.pref("tight"), F.const(0.85), F.const(1.2)))
                .clamp(0.6, 2.8).round(2),
            "抛掷距离", {
                unit: "格",
                description: "被卷入的目标沿风的行进方向被抛出多远；目标越轻抛得越远，广域式抛得更狠。"
            }),
        /** 抬升高度：基础 0.6 格，目标体重每比 60 多 1 减 0.001；夹在 0.3..1.0。 */
        lift: formula(
            F.base(0.6).minus(F.target("body.weight").minus(60).times(0.001).clamp(-0.2, 0.3)).clamp(0.3, 1.0).round(2),
            "抬升高度", {
                unit: "格",
                description: "被卷入的目标被风抬离地面的高度；目标越轻抬得越高，落地时还要再摔一下。"
            }),
        /** 混乱概率：基础 0.30，特攻每比 60 多 1 加 0.0008；雨天 +0.1、晴天 −0.05、收束 +0.08；夹在 0.15..0.55。 */
        confuseChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).times(0.0008).clamp(-0.06, 0.1))
                .plus(F.when(F.world("rain").gt(0.2), F.const(0.1),
                    F.when(F.world("day").gt(0).times(F.world("skyVisible").gt(0)).times(F.world("rain").lt(0.2)), F.const(-0.05), F.const(0))))
                .plus(F.when(F.pref("tight"), F.const(0.08), F.const(0)))
                .clamp(0.15, 0.55).round(3),
            "混乱概率", "被卷入后陷入混乱的概率；特攻越高、雨天风越乱越容易卷晕，收束式更集中。"),
        /** 混乱时长：基础 160 刻，特攻每比 60 多 1 加 0.5 刻，等级每比 30 高 1 加 0.8 刻；夹在 100..320。 */
        confuseTicks: seconds(
            F.base(160).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-20, 50))
                .plus(F.level().minus(30).times(0.8).clamp(0, 30))
                .clamp(100, 320).round(0),
            "混乱时长", "被卷晕后陷入混乱的时长；特攻越高、等级越高晕得越久。"),
        /** 晴天飘移：基础 0.9 格。 */
        drift: formula(
            F.base(0.9).clamp(0.4, 1.6).round(2),
            "晴天飘移", {
                unit: "格",
                description: "晴天（白天且见天）时风旋左右摆动的最大幅度；越飘越难正好罩住目标，也越容易被走位躲开。"
            }),
        /** 风带数：基础 8 加特攻偏移与等级偏移；夹在 6..30 并取整。 */
        swathes: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(-2, 8))
                .plus(F.level().minus(30).times(0.3).clamp(0, 8)).clamp(6, 30).round(0),
            "风带数", {
                unit: "条",
                description: "风旋每刻卷起的风带数量，也驱动画面密度；特攻与等级越高越多。"
            }),
        /** 起手：基础 12 刻，速度每比 60 快 1 减 0.03 刻，收束 +2 刻；夹在 6..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 5))
                .plus(F.when(F.pref("tight"), F.const(2), F.const(0))).clamp(6, 18).round(0),
            "起手", "聚起这阵风需要多久；速度越快越短，收束式多蓄一会儿。"),
        /** 收招：基础 12 刻，速度每比 60 快 1 减 0.02 刻；夹在 6..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(6, 18).round(0),
            "收招", "风散尽后的收势；速度越快越短。"),
        /** 冷却：基础 52 刻，速度每比 60 快 1 减 0.06 刻，收束 +8 刻；夹在 30..84。 */
        recharge: seconds(
            F.base(52).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 12))
                .plus(F.when(F.pref("tight"), F.const(8), F.const(0))).clamp(30, 84).round(0),
            "冷却", "两次起风之间的等待；速度越快回得越快，收束式缓得更久。")
    });

    stages("hurricane", [
        { level: 36, values: { gale: 104 } },
        { level: 56, values: { gale: 118, vortexRadius: 3.2 } }
    ]);

    defineDamage("hurricane", "gale", {}, { flags: { wind: true } });

    describe("hurricane", [
        { key: "description.0", values: ["gale", "travel"] },
        { key: "description.1", values: ["vortexRadius", "advance", "toss", "lift"] },
        { key: "description.2", values: ["confuseChance", "confuseTicks"] },
        { key: "weather", values: [] },
        { key: "tight.on", values: [], when: function (context) { return read(context.detail.values, ["tight"]) === true; } },
        { key: "tight.off", values: [], when: function (context) { return read(context.detail.values, ["tight"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gale"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gale", "tier.1.vortexRadius"] }
    ]);
}
