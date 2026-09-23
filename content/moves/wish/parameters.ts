/**
 * 祈愿 / Wish —— 参数与数值来源。
 *
 * 机制：把一颗愿星送上高空，延迟一段时间后落回原处，为施法者回复最大生命的一个比例；开启分享时，圈内
 *   每个友善战斗者也各按同一比例回复（比例被摊薄）。愿望独立于施法动作存在，施法者被收回也仍在原地等待。
 * 数值来源：回复比例随特攻增长（许愿者越强，愿力越足）；祝福半径与悬停高度随体型高度增长（大个子撑起更
 *   大的圈）；落下延迟随速度缩短（快的个体更快兑现）。
 * 与原生：取原生「下一回合回复最大HP的一半」的延迟兑现，放弃回合制；回复按受益者自身最大生命计算，并允许
 *   分享给落在圈里的伙伴。
 */
namespace PokemonSkills {
    export const wishId = "wish";
    actionParameters.define(wishId, {
        wishHeal: percent(F.base(0.45).plus(F.stat("specialAttack").times(0.0006)).clamp(0.35, 0.65).as("特攻转化"), "回复比例",
            "愿星落下时，每个受益者按其最大生命回复的比例。"),
        shareScale: percent(F.when(F.pref("share"), F.const(0.6), F.const(1)).as("分享折算"), "分享比例",
            "基础治疗量的折算比例；开启分享时自己与圈内伙伴分别获得折算后的治疗，关闭时自己获得完整基础治疗量。"),
        wishRadius: formula(F.base(2.6).plus(F.body("height").times(0.35)).clamp(2, 4).as("体型修正"), "祝福半径",
            { unit: " 格", description: "愿星落下时治疗圈的作用半径。" }),
        delayTicks: seconds(F.base(70).minus(F.stat("speed").times(0.15)).clamp(40, 80).as("速度修正"), "落下延迟",
            "从放出到愿星落地的时间；可被准备好的一方避开或利用。"),
        hangHeight: formula(F.base(3).plus(F.body("height").times(0.5)).clamp(2.5, 5).as("体型修正"), "悬停高度",
            { unit: " 格", description: "愿星从多高落下。" })
    });
    stages(wishId, [
        { level: 40, values: { cooldown: 220 } },
        { level: 60, values: { cooldown: 180 } }
    ]);
    describe(wishId, [
        { key: "description.0", values: ["delayTicks", "wishHeal"] },
        { key: "description.1", values: ["wishRadius","shareScale"] },
        { key: "description.payout", values: [] },
        { key: "stance.share", values: ["shareScale"], when: function (context) { return read(context.detail.values, ["share"]) === true; } },
        { key: "stance.self", values: [], when: function (context) { return read(context.detail.values, ["share"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
