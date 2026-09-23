/**
 * 鬼火 / willowisp 的参数。
 *
 * 原生事实：Fire、变化、威力 0、命中 85、PP 15、单体，命中后目标陷入灼伤（Cobblemon 1.8）。
 * 翻译：把“放出怪异的火焰”翻成一粒**会追人的鬼火**——它自施法者身前飞出，沿弧线扑向目标，
 * 但转向有限，跑得够快或绕开仍能甩掉（命中 85 落成“能不能跟上”而不是一次掷骰）。
 * 命中后把共享的灼伤身份挂上去：宝可梦那一层由共享默认效果同步成原生灼伤（物攻减半、队伍界面可见）。
 * 数据分散：射程随**等级**、鬼火速度随**速度**、判定随**碰撞箱高度**、追踪转向随**特攻**、
 * 灼伤时长随**等级**。配置 swift（迅捷取向）用更短的灼伤换更快的扑击与更紧的追踪。
 *
 * 公式即最终值，执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    actionParameters.define("willowisp", {
        /** 施放距离：基础 12 格，30 级起每级 +0.12，夹在 10..16。 */
        reach: formula(
            F.base(12).plus(F.level().minus(30).times(0.12)).clamp(10, 16).round(1),
            "施放距离", {
                unit: "格",
                description: "鬼火能够追到的最大距离；等级越高够得越远。"
            }),
        /** 鬼火速度：基础 0.75 格/刻，速度每比 40 快 1 加 0.002；迅捷 ×1.35 / 盘绕 ×0.9；夹在 0.4..1.7。 */
        wispSpeed: formula(
            F.base(0.75).plus(F.stat("speed").minus(40).times(0.002).clamp(-0.2, 0.45))
                .times(F.when(F.pref("swift"), F.const(1.35), F.const(0.9)))
                .clamp(0.4, 1.7).round(2),
            "鬼火速度", {
                unit: "格/刻",
                description: "鬼火扑向目标的飞行速度；快个体追得更急，迅捷取向更是如此。"
            }),
        /** 判定半径：碰撞箱高度每比 1.4 高 1 格加 0.1，夹在 0.2..0.6。 */
        wispRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.2, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "鬼火的横向判定半径；大个子判定更宽。"
            }),
        /** 追踪转向：基础 10 度/刻，特攻每比 80 高 1 加 0.12 度；迅捷 ×1.25；夹在 6..28 度。 */
        wispTurn: formula(
            F.base(10).plus(F.stat("specialAttack").minus(80).times(0.12).clamp(-4, 10))
                .times(F.when(F.pref("swift"), F.const(1.25), F.const(1)))
                .clamp(6, 28).round(1),
            "追踪转向", {
                unit: "度/刻",
                description: "鬼火每刻最多朝目标转多少度；转得越紧越难甩开。特攻越高越黏人。"
            }),
        /** 灼伤时长：基础 600 刻，30 级起每级 +8；迅捷 ×0.7 / 盘绕 ×1.15；夹在 380..900。 */
        burnTicks: seconds(
            F.base(600).plus(F.level().minus(30).max(0).times(8))
                .times(F.when(F.pref("swift"), F.const(0.7), F.const(1.15)))
                .clamp(380, 900).round(0),
            "灼伤时长", "命中后目标灼伤持续多久；盘绕取向烧得更久。")
    });

    describe("willowisp", [
        { key: "description.0", values: ["reach", "wispSpeed"] },
        { key: "description.1", values: ["burnTicks", "wispTurn"] },
        { key: "description.3", values: [] },
        { key: "description.2", values: ["wispRadius"] }
    ]);
}
