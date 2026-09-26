/**
 * 拦堵 / obstruct 的参数。
 *
 * 原生事实：Dark、Status、自身、优先度 +4、PP 10；完全抵挡对手的攻击，连续使出则容易失败，
 * 一旦触碰，防御就会大幅降低（Cobblemon 1.8 数据）。
 * 翻译：把“完全抵挡”翻成一块比守住更薄、更短的**拒马**，把“接触降防”翻成对所有战斗者生效的能力等级下降。
 * 数值分散到：防御决定拒马量、当前生命参与拒马量、体重决定立起快慢、身高决定贴身桩环大小、等级决定降防级数与冷却；
 * 连用失误率读本招自己的连用计数。配置 barbs 在“带刺”与“加固”之间取舍。
 */
namespace PokemonSkills {
    actionParameters.define("obstruct", {
        /** 立起时间：基础 8 刻 + 体重 ×0.002，夹在 6..16。 */
        raise: formula(
            F.base(8).plus(F.body("weight").times(0.002)).clamp(6, 16).round(0),
            "立起时间", {
                unit: "刻",
                description: "从起手到拒马成形的时间；重身板立得更慢。"
            }),
        /** 拒马持续：基础 24 刻，防御每比 60 高 1 +0.14 刻；带刺 ×0.85、加固 ×1.15，夹在 12..48。 */
        window: formula(
            F.base(24).plus(F.stat("defence").minus(60).max(0).times(0.14))
                .times(F.when(F.pref("barbs"), F.const(0.85), F.const(1.15)))
                .clamp(12, 48).round(0),
            "拒马持续", {
                unit: "刻",
                description: "拒马从立起到崩解的时间；防御越高撑得越久，带刺取向更短。"
            }),
        /** 拒马量：基础 18 点，当前生命 ×0.28、防御 ×0.4；带刺 ×0.75、加固 ×1.2，夹在 10..120。 */
        capacity: formula(
            F.base(18)
                .plus(F.actor("health").times(0.28))
                .plus(F.stat("defence").times(0.4))
                .times(F.when(F.pref("barbs"), F.const(0.75), F.const(1.2)))
                .clamp(10, 120).round(1),
            "拒马量", {
                unit: "点",
                description: "拒马能完整挡下的伤害总量；比守住低，换来接触惩罚。"
            }),
        /** 降防级数：等级 50 起 3 级否则 2 级，带刺再 +1，夹在 1..4。 */
        drop: formula(
            F.when(F.level().gte(50), F.const(3), F.const(2))
                .plus(F.when(F.pref("barbs"), F.const(1), F.const(0)))
                .clamp(1, 4).round(0),
            "接触降防", {
                unit: "级",
                description: "接触攻击撞上拒马时，攻击者下降的防御等级；等级越高、带刺取向降得越多。"
            }),
        /** 桩环半径：基础 0.75 格，身高每比 1.4 高 1 格 +0.2，夹在 0.55..1.5；只驱动贴身画面，不构成额外判定范围。 */
        radius: formula(
            F.base(0.75).plus(F.body("height").minus(1.4).times(0.2)).clamp(0.55, 1.5).round(2),
            "桩环半径", {
                unit: "格", visible: false,
                description: "内部：贴住身体的尖桩环半径，只用来画画面，不构成额外的受击范围；身高越大环略宽。"
            }),
        /** 冷却：基础 80 刻 + 等级 ×0.5，夹在 80..130。 */
        charge: formula(
            F.base(80).plus(F.level().times(0.5)).clamp(80, 130).round(0),
            "冷却", {
                unit: "刻",
                description: "再次立拒马前的等待；等级越高成本越大。"
            }),
        /** 连用失误率：连用计数每多 1 次 +0.25，30 级起每级 −0.003，夹在 0..0.85。 */
        fizzle: percent(
            F.state(GuardEffects.stallKey, "连用计数", "stall").times(0.25)
                .minus(F.level().minus(30).max(0).times(0.003))
                .clamp(0, 0.85),
            "连用失误率", "兑现“连续使出则容易失败”：短时间内反复立拒马会越来越容易失败。"),
        /** 连用计数重置：超过这么久没用就归零。 */
        stallReset: hidden(240),
        /** 每个攻击者每个窗口最多被扎一次。 */
        punishLimit: hidden(1)
    });

    describe("obstruct", [
        { key: "description.0", values: ["window","capacity","drop"] },
        { key: "description.hold", values: [] },
        { key: "description.1", values: ["raise", "charge"] },
        { key: "description.2", values: ["fizzle"] }
    ]);
}
