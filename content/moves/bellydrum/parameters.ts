/**
 * 腹鼓 / Belly Drum —— 参数与数值来源。
 *
 * 机制：拍响腹鼓，把自己的生命压到一个下限，换取满级物攻，并把力量挂在一段可读的持续状态上；状态结束时
 *   那几级物攻一并收回。
 * 数值来源：保留的生命比例随「持久鼓劲」档位改变（爆发档留一半、持久档留四成）；力量持续随档位改变；
 *   鼓点准备随体重增长（大块头起鼓更慢）；收招随速度缩短。
 * 与原生：取原生「HP 减到最大的一半、最大限度提高物攻」的代价与回报，但在即时战斗里给力量加一个可见窗口，
 *   让对手读得懂什么时候该躲、什么时候该拼，也让永久 +6 不至于失控。
 */
namespace PokemonSkills {
    export const bellydrumId = "bellydrum";
    actionParameters.define(bellydrumId, {
        stages: formula(F.const(6), "攻击等级", { unit: " 级", description: "鼓声把物攻提高到这个能力等级；状态结束时原样收回。" }),
        keep: percent(F.when(F.pref("endure"), F.const(0.40), F.const(0.50)).as("档位"), "保留生命",
            "起鼓后保留的最大生命比例；剩下的小于它时无法起鼓。"),
        surgeTicks: seconds(F.when(F.pref("endure"), F.const(480), F.const(200)).as("档位"), "力量持续",
            "物攻提升存在的窗口；窗口结束会收回提升的等级。"),
        drumPrepare: seconds(F.base(14).plus(F.body("weight").times(0.02)).clamp(14, 26).as("体重修正"), "鼓点准备",
            "拍鼓所需的准备时间，越重越慢；准备被打断不花 PP。"),
        drumRecover: seconds(F.base(12).minus(F.stat("speed").times(0.04)).clamp(5, 12).as("速度修正"), "收招",
            "起鼓后的收招时间，速度快的个体更快回到战斗。")
    });
    stages(bellydrumId, [
        { level: 40, values: { cooldown: 270 } },
        { level: 60, values: { cooldown: 230 } }
    ]);
    describe(bellydrumId, [
        { key: "description.0", values: ["keep","stages"] },
        { key: "description.1", values: ["surgeTicks","drumPrepare","drumRecover"] },
        { key: "stance.endure", values: [], when: function (context) { return read(context.detail.values, ["endure"]) === true; } },
        { key: "stance.frenzy", values: [], when: function (context) { return read(context.detail.values, ["endure"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
