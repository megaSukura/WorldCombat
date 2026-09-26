/** Narrow thrust keeps the existing segment power budget and exhaustion tradeoff. */
namespace PokemonSkills {
    actionParameters.define("meteorassault", {
        /** 单段威力：攻击每比 60 多 1 加 0.5（上限 +30），速度每比 60 快 1 加 0.2（上限 +16）；夹在 34..92。 */
        smash: formula(
            F.base(52)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-12, 30))
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-8, 16))
                .clamp(34, 92).round(1),
            "单段威力", {
                unit: "威力",
                description: "每一伸段的基础威力；总伤害是它乘以伸枪段数。对手防御、相性与暴击在命中时另算。"
            }),
        /** 伸枪段数：配置值 2..5，直接作为参数。 */
        swings: formula(
            F.pref("swings").clamp(2, 5).round(),
            "伸枪段数", {
                unit: "段",
                description: "兵端分几段伸到最远处；各段预算合并为每个目标的一次主伤，段数越多力竭越久。"
            }),
        /** 刺击距离：基础 3.0，碰撞箱每比 1.4 高 1 格加 0.4；夹在 2.4..4.6。 */
        reach: formula(
            F.base(3.0).plus(F.body("height").minus(1.4).times(0.4)).clamp(2.4, 4.6).round(2),
            "刺击距离", {
                unit: "格",
                description: "长兵最远伸到多远；驱动目标接受范围。"
            }),
        /** Body height controls the narrow spear half-width. */
        arc: formula(
            F.base(110).plus(F.body("height").minus(1.4).times(14)).div(360).clamp(.22, .5).round(2),
            "刺面半宽", {
                unit: "格",
                description: "兵尖扫掠的判定半宽；体型决定兵端粗细，沿同一条直线贯过目标。"
            }),
        /** 段间隔：基础 9 tick，速度每比 60 快 1 减 0.02 tick；夹在 6..12 tick。 */
        interval: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02)).clamp(6, 12).round(),
            "段间隔", "兵端相邻两次伸长的间隔。"),
        /** 晃晕力竭：基础 50 tick，每比 3 段多 1 段加 9 tick，速度每比 60 快 1 加 0.1 tick（上限 +12）；夹在 34..120 tick。 */
        exhaust: seconds(
            F.base(50)
                .plus(F.pref("swings").minus(3).times(9))
                .plus(F.stat("speed").minus(60).times(0.1).clamp(-4, 12))
                .clamp(34, 120).round(),
            "晃晕力竭", "收枪后无法行动和移动的时间；伸枪段数越多越久。"),
        /** 起手：基础 8 tick，速度每比 60 快 1 减 0.02 tick；夹在 5..12 tick。 */
        charge: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02)).clamp(5, 12).round(),
            "起手", "站稳并举起长兵的准备时间。")
    });

    stages("meteorassault", [
        { level: 40, values: { smash: 62 } },
        { level: 60, values: { smash: 72 } }
    ]);

    defineDamage("meteorassault", "smash", { defenceCoefficient: 0.0052, rationale: "格斗重击对防御穿透略强，伸段预算合并为一次主伤结算。" }, {});

    describe("meteorassault", [
        { key: "description.0", values: ["smash","swings"] },
        { key: "description.1", values: ["reach", "arc", "interval"] },
        { key: "description.2", values: ["exhaust"] },
        { key: "description.3", values: ["charge"] }
    ]);
}
