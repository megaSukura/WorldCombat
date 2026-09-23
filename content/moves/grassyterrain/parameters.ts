/**
 * 青草场地 / grassyterrain 的参数。
 *
 * 原生事实：Grass／变化／威力 —／命中 —／PP 10／场上场地 5 回合：地面上的宝可梦每回合回复 1/16 最大生命，
 * 草属性招式威力 ×1.3（Gen 8+），地震与震级／重踏威力减半。
 * 世界化：把「5 回合的场地」翻成一片真的长出来的青草地——施法者把草种踩进选定的地面，草叶成圈铺开；
 * 站在地上（grounded）的活体被这层草托着，缓慢回血、草招更猛、地面震招被草根卸掉一半。
 * 开启 blooming 时，这片草地还会真的去照料附近能生长的植物（WorldCultivation），代价是范围更小、更短、冷却更长。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather       起手：基础 15 刻，速度每快 1 点减 0.05 刻，夹在 10..24。
 *   settle       收招：基础 11 刻，速度每快 1 点减 0.02 刻，夹在 7..16。
 *   reach        施放距离：基础 15 格，20 级起每级 +0.08，夹在 11..19。
 *   fieldRadius  草地半径：基础 3.0 格 +（特攻超过 60）×0.012 +（身高超过 1.4）×0.5，再乘铺法系数，夹在 2.2..5.5。
 *   fieldTicks   草地持续：基础 300 刻 + 20 级起每级 5 刻，再乘铺法系数，夹在 220..560。
 *   healRatio    每段回复：基础 1/16 +（特防超过 60）×0.0006，再乘铺法系数，夹在 4%..12%（按各自最大生命）。
 *   healInterval 回复间隔：基础 42 刻 -（速度超过 40）×0.1，夹在 28..60。
 *   bloomDensity 草叶密度：基础 26 + 特攻 ÷ 8，夹在 14..60；直接驱动粒子数量。
 *   growth       照料上限：基础 4 + 特攻 ÷ 40，夹在 2..10 次；只有 blooming 会用到。
 * 配置 blooming 在「会照料植物、回血更强的密植草地」和「更广更久更省的野草地」之间取舍。
 */
namespace PokemonSkills {
    export const grassyScene = "world_combat:move_grassyterrain";
    export const grassyField = "world_combat:field/grassyterrain";
    export const grassyGround = "world_combat:grassyterrain_ground";
    export const grassyHealText = "world_combat.move.grassyterrain.text.heal";
    export const grassyGrowthText = "world_combat.move.grassyterrain.text.growth";

    actionParameters.define("grassyterrain", {
        gather: seconds(F.base(15).plus(F.stat("speed").minus(40).max(0).times(0.05).clamp(0, 6)).clamp(10, 24),
            "起手", "把草种踩进地面需要多少时间；速度越快，草长得越早。"),
        settle: seconds(F.base(11).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(7, 16),
            "收招", "草地长成后收势需要多少时间。"),
        reach: formula(F.base(15).plus(F.level().minus(20).max(0).times(0.08)).clamp(11, 19).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面种下这片草；等级越高够得越远。" }),
        fieldRadius: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).max(0).times(0.012))
                .plus(F.body("height").minus(1.4).max(0).times(0.5))
                .times(F.when(F.pref("blooming"), F.const(0.82), F.const(1.15)))
                .clamp(2.2, 5.5).round(2),
            "草地半径", { unit: " 格", description: "青草铺开多大的一片；特攻越高、体型越大越广，密植 ×0.82、野草 ×1.15。" }),
        fieldTicks: seconds(
            F.base(300).plus(F.level().minus(20).max(0).times(5))
                .times(F.when(F.pref("blooming"), F.const(0.85), F.const(1.1)))
                .clamp(220, 560),
            "草地持续", "这片草长多久；野草更久（×1.1）、密植更短（×0.85），等级提升会延长。"),
        healRatio: percent(
            F.base(0.0625).plus(F.stat("specialDefence").minus(60).max(0).times(0.0006))
                .times(F.when(F.pref("blooming"), F.const(1.25), F.const(1)))
                .clamp(0.04, 0.12),
            "每段回复", "站在草地上的活体每次回复各自最大生命的这个比例；密植 ×1.25。"),
        healInterval: seconds(F.base(42).minus(F.stat("speed").minus(40).max(0).times(0.1)).clamp(28, 60),
            "回复间隔", "同一位受益者两次回复之间隔多久；速度越快回得越勤。"),
        bloomDensity: formula(F.base(26).plus(F.stat("specialAttack").div(8)).clamp(14, 60).round(),
            "草叶密度", { unit: " 点", description: "草地里草叶与光点的数量；特攻越高铺得越密，粒子直接按它发射。" }),
        growth: formula(F.base(4).plus(F.stat("specialAttack").div(40)).clamp(2, 10).round(),
            "照料上限", { unit: " 次", description: "密植模式下这片草地最多照料几处幼苗；特攻越高照料得越多。" })
    });

    stages("grassyterrain", [{ level: 40, values: { cooldown: 150 } }, { level: 55, values: { cooldown: 130 } }]);
    describe("grassyterrain", [
        { key: "description.0", values: ["fieldRadius", "fieldTicks"] },
        { key: "description.1", values: ["healRatio", "healInterval"] },
        { key: "description.2", values: ["growth"] },
        { key: "description.3", values: ["gather", "settle"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
