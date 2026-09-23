/**
 * 看穿 / detect 的参数。
 *
 * 原生事实：Fighting、Status、自身、优先度 +4、PP 5；完全抵挡对手的攻击，连续使出则容易失败（Cobblemon 1.8 数据）。
 * 翻译：保留“完全抵挡”与“容易失败”，把“一回合”翻成很短的读招窗口：窗口内下一次来袭被整个卸掉，
 * 并换来一段先机（默认抬速度，配置可改为抬攻击）。速度决定窗口宽窄、先机长短与凝神快慢，等级决定先机等级与冷却，
 * 碰撞箱高度决定闪光半径。配置 strike 是“走位”与“反击”的取舍。
 */
namespace PokemonSkills {
    actionParameters.define("detect", {
        /** 凝神时间：基础 6 刻，速度每比 60 快 1 少 0.02 刻，夹在 3..8。 */
        raise: formula(
            F.base(6).minus(F.stat("speed").minus(60).max(0).times(0.02)).clamp(3, 8).round(0),
            "凝神时间", {
                unit: "刻",
                description: "从起手到读招窗口打开的时间；反应快的个体凝神更快。"
            }),
        /** 读招窗口：基础 16 刻，速度每比 60 快 1 少 0.06 刻；走位 ×1.15、反击 ×0.85，夹在 6..20。 */
        readWindow: formula(
            F.base(16).minus(F.stat("speed").minus(60).max(0).times(0.06))
                .times(F.when(F.pref("strike"), F.const(0.85), F.const(1.15)))
                .clamp(6, 20).round(0),
            "读招窗口", {
                unit: "刻",
                description: "窗口内下一次来袭被完整免除；反应越快窗口越宽裕，反击取向窗口更窄。"
            }),
        /** 先机持续：基础 24 刻 + 速度 ×0.2，夹在 24..80。 */
        opening: formula(
            F.base(24).plus(F.stat("speed").times(0.2)).clamp(24, 80).round(0),
            "先机持续", {
                unit: "刻",
                description: "读中之后自己获得的先机时长；快个体吃得更久。"
            }),
        /** 先机等级：等级 45 起 2 级，否则 1 级。 */
        openingBoost: formula(
            F.when(F.level().gte(45), F.const(2), F.const(1)).round(0),
            "先机等级", {
                unit: "级",
                description: "读中后抬高速度（默认）或攻击（反击）的等级；等级 45 起为 2 级。"
            }),
        /** 读招闪光半径：基础 1.2 格，碰撞箱高度每比 1.4 高 1 格 +0.3，夹在 1.0..2.0。 */
        radius: formula(
            F.base(1.2).plus(F.body("height").minus(1.4).times(0.3)).clamp(1.0, 2.0).round(2),
            "闪光半径", {
                unit: "格",
                description: "读中时爆圈与凝神薄幕的半径；身板越大越宽。"
            }),
        /** 冷却：基础 30 刻 + 等级 ×0.2；反击取向再 +8，夹在 30..55。 */
        charge: formula(
            F.base(30).plus(F.level().times(0.2)).plus(F.when(F.pref("strike"), F.const(8), F.const(0)))
                .clamp(30, 55).round(0),
            "冷却", {
                unit: "刻",
                description: "再次读招前的等待；反击取向冷却更长。"
            }),
        /** 连用失误率：连用计数每多 1 次 +0.25，30 级起每级 −0.003，夹在 0..0.85。 */
        fizzle: percent(
            F.state(GuardEffects.stallKey, "连用计数", "stall").times(0.25)
                .minus(F.level().minus(30).max(0).times(0.003))
                .clamp(0, 0.85),
            "连用失误率", "兑现“连续使出则容易失败”：短时间连着读招，失败概率逐次升高。"),
        /** 连用计数重置：超过这么久没用就归零。 */
        stallReset: hidden(180)
    });

    describe("detect", [
        { key: "description.0", values: ["readWindow", "opening", "openingBoost"] },
        { key: "description.1", values: ["raise", "charge"] },
        { key: "description.2", values: ["fizzle", "pref.strike"] }
    ]);
}
