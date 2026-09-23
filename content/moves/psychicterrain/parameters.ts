/**
 * 精神场地 / psychicterrain 的参数与数值来源。
 *
 * 原生事实：Psychic／变化／威力 —／命中 必中／PP 10／场上场地 5 回合：地面上的宝可梦不会受到先制招式的
 *   攻击；超能力属性招式威力 ×1.3（Gen 8+）。
 * 世界化：把「5 回合的场地」翻成一片真的铺在地上的精神域——施法者把念力压进选定的地面，粉色纹路成圈铺开；
 *   站在地上（grounded）的活体带上 psychicterrain 身份：被先制招式指向时伤害被抹掉，超能力招式更猛。
 *   对双方一视同仁。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather       起手：基础 13 刻，速度每快 1 点减 0.04 刻，夹 9..20。
 *   settle       收招：基础 9 刻，速度每快 1 点减 0.02 刻，夹 6..14。
 *   reach        施放距离：基础 15 格，20 级起每级 +0.08，夹 11..19。
 *   fieldRadius  精神域半径：基础 3.2 格 +（特攻超过 60）×0.012 +（身高超过 1.4）×0.5，再乘主场系数，夹 2.2..6.0。
 *   fieldTicks   精神域持续：基础 300 刻 + 20 级起每级 5 刻，再乘主场系数，夹 220..560。
 *   markTicks    离场余量：基础 60 刻 + 速度 ×0.5，夹 40..160；离开精神域后身份仍保留的时长。
 *   boost        超能增幅：聚焦 1.45、护场 1.15，夹 1.1..1.5；站在场上的活体超能招式威力乘上的系数。
 *   density      纹路密度：基础 26 + 特攻 ÷8，再乘主场系数，夹 14..60；直接驱动粒子数量。
 *   surge        入场合能：基础 10 + 特攻 ÷12，夹 6..22；踩进精神域时身上迸出的念点。
 * 配置 focus 在「小而久、超能增幅高（×1.45）的聚焦主场」和「宽而省、增幅浅（×1.15）的护场」之间取舍。
 */
namespace PokemonSkills {
    export const psychicterrainId = "psychicterrain";
    export const psychicterrainField = "world_combat:field/psychicterrain";
    export const psychicterrainGround = "world_combat:psychicterrain_ground";
    export const psychicterrainScene = "world_combat:move_psychicterrain";
    export const psychicterrainStatus = "psychicterrain";
    export const psychicterrainWardText = "world_combat.move.psychicterrain.text.ward";

    actionParameters.define(psychicterrainId, {
        gather: seconds(F.base(13).plus(F.stat("speed").minus(40).max(0).times(0.04).clamp(0, 6)).clamp(9, 20),
            "起手", "把念力压进地面需要多少时间；速度越快铺得越早。"),
        settle: seconds(F.base(9).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 14),
            "收招", "精神域亮起后收势需要多少时间。"),
        reach: formula(F.base(15).plus(F.level().minus(20).max(0).times(0.08)).clamp(11, 19).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面压进念力；等级越高够得越远。" }),
        fieldRadius: formula(
            F.base(3.2).plus(F.stat("specialAttack").minus(60).max(0).times(0.012))
                .plus(F.body("height").minus(1.4).max(0).times(0.5))
                .times(F.when(F.pref("focus"), F.const(0.82), F.const(1.25)))
                .clamp(2.2, 6.0).round(2),
            "精神域半径", { unit: " 格", description: "精神域覆盖多大的一片地；特攻越高、体型越大越广，聚焦 ×0.82、护场 ×1.25。" }),
        fieldTicks: seconds(
            F.base(300).plus(F.level().minus(20).max(0).times(5))
                .times(F.when(F.pref("focus"), F.const(1.25), F.const(0.85)))
                .clamp(220, 560),
            "精神域持续", "这片精神域亮多久；聚焦更久（×1.25）、护场更短（×0.85），等级提升会延长。"),
        markTicks: seconds(F.base(60).plus(F.stat("speed").times(0.5)).clamp(40, 160),
            "离场余量", "离开精神域后身份仍保留、先制仍被挡的时长；速度越快余念散得越慢。"),
        boost: formula(
            F.when(F.pref("focus"), F.const(1.45), F.const(1.15)).clamp(1.1, 1.5).round(2),
            "超能增幅", { base: 1.3, unit: " 倍", format: function (value) { return "×" + (Math.round(value * 100) / 100); },
                description: "站在场上的活体超能力招式威力乘上的系数；聚焦 ×1.45、护场 ×1.15。" }),
        density: formula(
            F.base(26).plus(F.stat("specialAttack").div(8))
                .times(F.when(F.pref("focus"), F.const(1.35), F.const(0.85))).clamp(14, 60).round(),
            "纹路密度", { unit: " 点", description: "精神域里纹路与念点的数量；特攻越高铺得越密，粒子直接按它发射。" }),
        surge: formula(F.base(10).plus(F.stat("specialAttack").div(12)).clamp(6, 22).round(),
            "入场合能", { unit: " 点", description: "踩进精神域时身上迸出的念点；特攻越高越亮。" })
    });

    stages(psychicterrainId, [{ level: 40, values: { cooldown: 144 } }, { level: 55, values: { cooldown: 126 } }]);
    describe(psychicterrainId, [
        { key: "description.0", values: ["fieldRadius","fieldTicks"] },
        { key: "description.1", values: ["boost"] },
        { key: "description.2", values: [] },
        { key: "description.4", values: ["gather", "settle"] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.focus); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.focus); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
