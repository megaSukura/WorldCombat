/**
 * 硬撑 / facade 的参数与伤害段。
 *
 * 原生事实：Normal、物理、威力 70、命中 100、PP 20、接触；自己处于异常（除睡眠外）时威力翻倍（Cobblemon 1.8）。
 * 翻译：把“身上的异常”当成燃料——撞出去这一下由**自己的中毒／剧毒、灼伤、麻痹、冰冻**翻倍，
 * 越剩不下命越狠；推进与冲撞距离交给**速度**，顶开距离交给**体重**，判定宽度交给**碰撞箱高度**。
 * 配置 brutal（变本加厉）：威力与顶开更高、冲得更远，代价是命中时按最大生命反噬自己。
 *
 * 公式即最终值：取整与限幅都写进公式，执行、AI 与悬浮说明读同一棵树。
 * 伤害段名沿用本招最简单的一段，叫 power。
 */
namespace PokemonSkills {
    actionParameters.define("facade", {
        /** 硬撑威力：带异常时 ×2；变本加厉 ×1.15；缺失生命每 1% 加 0.2 威力；夹在 45..180。 */
        power: formula(
            F.base(70)
                .times(F.when(
                    F.status("burn").plus(F.status("poison")).plus(F.status("paralysis")).plus(F.status("frozen")).gt(0),
                    F.const(2), F.const(1)).as({ key: "worldcombat.skill.facade.value.afflicted", fallback: "带伤硬顶" }))
                .times(F.when(F.pref("brutal"), F.const(1.15), F.const(1)))
                .plus(F.const(1).minus(F.actor("healthRatio")).max(0).times(20))
                .clamp(45, 180).round(1),
            "硬撑威力", {
                unit: "威力",
                description: "本段伤害的基础威力；带着异常时翻倍，越剩不下命越狠。对手防御、相性与暴击在命中时另算。"
            }),
        /** 推进速度：速度每比 60 多 1 快 0.004 格/刻，夹在 0.34..0.82。 */
        chargeSpeed: formula(
            F.base(0.52).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.34, 0.82).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "冲撞时每刻前进的距离；快个体一步迈得更大。"
            }),
        /** 冲撞距离：基础 3.6 格，速度每比 60 多 1 加 0.008，夹在 2.6..5.2。 */
        slam: formula(
            F.base(3.6).plus(F.stat("speed").minus(60).times(0.008)).clamp(2.6, 5.2).round(2),
            "冲撞距离", {
                unit: "格",
                description: "从起步到收势的总位移；一步能够到多远。"
            }),
        /** 顶开距离：基础 0.7 格，体重每比 60 多 0.1 加 0.0006，变本加厉 ×1.2，夹在 0.3..1.6。 */
        push: formula(
            F.base(0.7).plus(F.body("weight").minus(60).times(0.006))
                .times(F.when(F.pref("brutal"), F.const(1.2), F.const(1)))
                .clamp(0.3, 1.6).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中后沿冲撞方向把目标推开的距离；大个子顶得更开。"
            }),
        /** 判定半径：碰撞箱高度每比 1.4 高 1 格，判定半径加 0.12 格，夹在 0.4..0.95。 */
        collisionRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.4, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "撞上活体的横向判定半径；大个子判定更宽。"
            }),
        /** 硬顶耗损：变本加厉开启时按自身最大生命的 6% 反噬；关闭时为 0。 */
        strain: percent(
            F.base(0.06).times(F.when(F.pref("brutal"), F.const(1), F.const(0))),
            "硬顶耗损", "变本加厉开启时，命中后按自身最大生命的比例反噬；关闭时不反噬。"),
        traceAhead: hidden(1.1),
        minimumMove: hidden(0.05)
    });

    defineDamage("facade", "power", {}, { contact: true });

    describe("facade", [
        { key: "description.0", values: ["power"] },
        { key: "description.1", values: ["push", "slam"] },
        { key: "description.2", values: ["chargeSpeed", "collisionRadius"] }
    ]);
}
