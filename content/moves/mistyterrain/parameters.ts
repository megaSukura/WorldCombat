/**
 * 薄雾场地 / mistyterrain 的参数与数值来源。
 *
 * 原生事实：Fairy／变化／威力 —／命中 必中／PP 10／场上场地 5 回合：地面上的宝可梦不会陷入异常状态
 *   （含混乱）；龙属性招式的伤害减半。
 * 世界化：把「5 回合的场地」翻成一片真的铺在地上的薄雾——施法者把雾压到地面，雾贴着地皮漫开；站在地上的活体
 *   被薄雾裹住：异常状态落不下来，龙属性的来招被雾削掉一半。开启净化时，雾还会把场上已经中的异常洗掉。
 *   对双方一视同仁。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather       起手：基础 14 刻，速度每快 1 点减 0.04 刻，夹 10..22。
 *   settle       收招：基础 10 刻，速度每快 1 点减 0.02 刻，夹 6..15。
 *   reach        施放距离：基础 15 格，20 级起每级 +0.08，夹 11..19。
 *   fieldRadius  薄雾半径：基础 3.2 格 +（特攻超过 60）×0.012 +（身高超过 1.4）×0.5，再乘雾法系数，夹 2.2..6.0。
 *   fieldTicks   薄雾持续：基础 300 刻 + 20 级起每级 5 刻，再乘雾法系数，夹 220..560。
 *   markTicks    离场余量：基础 60 刻 + 速度 ×0.5，夹 40..160；离开薄雾后身份仍保留的时长。
 *   dragonFactor 龙伤系数：固定 0.5（原生规则）；龙属性招式打在场上的活体时乘上的系数。
 *   density      雾点密度：基础 26 + 特攻 ÷8，再乘雾法系数，夹 14..60；直接驱动粒子数量。
 *   surge        入场絮雾：基础 10 + 特攻 ÷12，夹 6..22；踩进薄雾时身上腾起的雾絮。
 * 配置 purify 在「小而久、会把已有异常洗掉的净化雾」和「宽而省、只挡新异常的薄幕」之间取舍。
 */
namespace PokemonSkills {
    export const mistyterrainId = "mistyterrain";
    export const mistyterrainField = "world_combat:field/mistyterrain";
    export const mistyterrainGround = "world_combat:mistyterrain_ground";
    export const mistyterrainScene = "world_combat:move_mistyterrain";
    export const mistyterrainStatus = "mistyterrain";
    export const mistyterrainWardText = "world_combat.move.mistyterrain.text.ward";
    export const mistyterrainCleanseText = "world_combat.move.mistyterrain.text.cleanse";

    actionParameters.define(mistyterrainId, {
        gather: seconds(F.base(14).plus(F.stat("speed").minus(40).max(0).times(0.04).clamp(0, 6)).clamp(10, 22),
            "起手", "把雾压到地面需要多少时间；速度越快漫得越早。"),
        settle: seconds(F.base(10).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 15),
            "收招", "薄雾漫开后收势需要多少时间。"),
        reach: formula(F.base(15).plus(F.level().minus(20).max(0).times(0.08)).clamp(11, 19).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面铺开薄雾；等级越高够得越远。" }),
        fieldRadius: formula(
            F.base(3.2).plus(F.stat("specialAttack").minus(60).max(0).times(0.012))
                .plus(F.body("height").minus(1.4).max(0).times(0.5))
                .times(F.when(F.pref("purify"), F.const(0.85), F.const(1.25)))
                .clamp(2.2, 6.0).round(2),
            "薄雾半径", { unit: " 格", description: "薄雾覆盖多大的一片地；特攻越高、体型越大越广，净化 ×0.85、薄幕 ×1.25。" }),
        fieldTicks: seconds(
            F.base(300).plus(F.level().minus(20).max(0).times(5))
                .times(F.when(F.pref("purify"), F.const(1.2), F.const(0.8)))
                .clamp(220, 560),
            "薄雾持续", "这片薄雾留多久；净化雾更久（×1.2）、薄幕更短（×0.8），等级提升会延长。"),
        markTicks: seconds(F.base(60).plus(F.stat("speed").times(0.5)).clamp(40, 160),
            "离场余量", "离开薄雾后身份仍保留、异常仍落不下来的时长；速度越快余雾散得越慢。"),
        dragonFactor: formula(F.base(0.5).round(2),
            "龙伤系数", { unit: " 倍", format: function (value) { return "×" + (Math.round(value * 100) / 100); },
                description: "龙属性招式打在场上的活体时乘上的系数；原生规则固定为 ×0.5。" }),
        density: formula(
            F.base(26).plus(F.stat("specialAttack").div(8))
                .times(F.when(F.pref("purify"), F.const(1.3), F.const(0.9))).clamp(14, 60).round(),
            "雾点密度", { unit: " 点", description: "薄雾里滚动的雾点数量；特攻越高铺得越密，粒子直接按它发射。" }),
        surge: formula(F.base(10).plus(F.stat("specialAttack").div(12)).clamp(6, 22).round(),
            "入场絮雾", { unit: " 点", description: "踩进薄雾时身上腾起的雾絮；特攻越高越浓。" })
    });

    stages(mistyterrainId, [{ level: 40, values: { cooldown: 150 } }, { level: 55, values: { cooldown: 130 } }]);
    describe(mistyterrainId, [
        { key: "description.0", values: ["fieldRadius", "fieldTicks"] },
        { key: "description.1", values: ["dragonFactor"] },
        { key: "description.2", values: ["markTicks"] },
        { key: "description.4", values: ["gather", "settle"] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.purify); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.purify); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
