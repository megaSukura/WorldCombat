/**
 * 守住 / protect 的参数。
 *
 * 原生事实：Normal、Status、自身、优先度 +4、PP 10；完全抵挡对手的攻击，连续使出则容易失败（Cobblemon 1.8 数据）。
 * 翻译：把“本回合完全无效”翻成一块**有总量的全向穹顶**——护盾还在时每一击都被完整挡下，被多段攻击磨穿则碎裂，
 * 之后不再保护。数值分散到多类精灵数据：双防决定穹顶能撑多久、防御与当前生命决定护盾总量、速度决定起罩快慢、
 * 碰撞箱高度决定穹顶半径；“连续使出容易失败”读本招自己的连用计数与等级。配置 braced 只在“守据”与“瞬罩”之间取舍。
 *
 * 公式即最终值：取整、限幅与配置分支都写进公式，执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    actionParameters.define("protect", {
        /** 起罩时间：基础 10 刻，速度每比 60 快 1 少 0.04 刻，夹在 4..12。 */
        raise: formula(
            F.base(10).minus(F.stat("speed").minus(60).max(0).times(0.04)).clamp(4, 12).round(0),
            "起罩时间", {
                unit: "刻",
                description: "从起手到穹顶合拢的时间；反应快的个体起罩更快。"
            }),
        /** 屏障持续：基础 28 刻，防御每比 60 高 1 +0.18 刻、特防每比 60 高 1 +0.12 刻；守据 ×1.3、瞬罩 ×0.8，夹在 14..64。 */
        window: formula(
            F.base(28)
                .plus(F.stat("defence").minus(60).max(0).times(0.18))
                .plus(F.stat("specialDefence").minus(60).max(0).times(0.12))
                .times(F.when(F.pref("braced"), F.const(1.3), F.const(0.8)))
                .clamp(14, 64).round(0),
            "屏障持续", {
                unit: "刻",
                description: "穹顶从合拢到散去的时间；双防越高撑得越久，是这招最直接的个体区分来源。"
            }),
        /** 护盾量：基础 24 点，当前生命 ×0.35、防御 ×0.35；守据 ×1.15、瞬罩 ×0.8，夹在 12..160。 */
        capacity: formula(
            F.base(24)
                .plus(F.actor("health").times(0.35))
                .plus(F.stat("defence").times(0.35))
                .times(F.when(F.pref("braced"), F.const(1.15), F.const(0.8)))
                .clamp(12, 160).round(1),
            "护盾量", {
                unit: "点",
                description: "穹顶能完整挡下的伤害总量；残血时罩更薄，肉盾的罩更耐打。"
            }),
        /** 穹顶半径：基础 1.7 格，碰撞箱高度每比 1.4 高 1 格 +0.6 格，夹在 1.6..3.4。 */
        radius: formula(
            F.base(1.7).plus(F.body("height").minus(1.4).times(0.6)).clamp(1.6, 3.4).round(2),
            "穹顶半径", {
                unit: "格",
                description: "以自己为心的半球半径；身板越大罩得越宽，画面与判定同半径。"
            }),
        /** 冷却：基础 70 刻 + 等级 ×0.4；守据 ×1.15、瞬罩 ×0.85，夹在 55..110。 */
        charge: formula(
            F.base(70).plus(F.level().times(0.4))
                .times(F.when(F.pref("braced"), F.const(1.15), F.const(0.85)))
                .clamp(55, 110).round(0),
            "冷却", {
                unit: "刻",
                description: "再次撑罩前的等待；等级越高施放成本越大，守据取向冷却更长。"
            }),
        /** 连用失误率：连用计数每多 1 次 +0.25，30 级起每级 −0.003，夹在 0..0.85。 */
        fizzle: percent(
            F.state(GuardEffects.stallKey, "连用计数", "stall").times(0.25)
                .minus(F.level().minus(30).max(0).times(0.003))
                .clamp(0, 0.85),
            "连用失误率", "兑现“连续使出则容易失败”：上一次撑罩之后没多久再撑，失败概率就升高。"),
        /** 连用计数重置：超过这么久没用就归零。 */
        stallReset: hidden(240)
    });

    describe("protect", [
        { key: "description.0", values: ["window", "capacity"] },
        { key: "description.1", values: ["raise", "radius", "charge"] },
        { key: "description.2", values: ["fizzle", "pref.braced"] }
    ]);
}
