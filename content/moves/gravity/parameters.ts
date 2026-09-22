/**
 * 重力 / gravity 的参数与数值来源。
 *
 * 原生事实：Ground／变化／威力 —／命中 必中／PP 5／场上 pseudoweather 5 回合：飘浮特性与飞行属性的宝可梦
 *   会被地面属性招式击中；飞向空中的招式无法使用；开始时会打断并清掉 bounce／fly／skydrop／magnetrise／
 *   telekinesis。本招用同一套原生化事实：招式 flag `gravity` 是「凌空」的机读键，浮空身份是共享 tag。
 *
 * 世界化：把「5 回合的全局重力」翻成一口真的压在地上的重力井（WorldEffects.field）。井里的活体被拽向地面、
 *   身上的浮空身份（fly／bounce／magnetrise／telekinesis）被拔掉、带重力标记的凌空招式无法起手；
 *   对双方一视同仁，所以「趁对手还站在地上、自己先落地」才有意义。它是一片地，走出去就恢复。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather     起手：基础 14 刻，速度每快 1 点减 0.03 刻，夹在 9..22。
 *   settle     收招：基础 10 刻，速度每快 1 点减 0.02 刻，夹在 6..15。
 *   reach      施放距离：基础 12 格，20 级起每级 +0.08，夹在 10..18。
 *   wellRadius 井半径：基础 3.4 格 + 体重（夹 10..220kg）÷110 +（防御超过 50）×0.006，再乘压法系数，夹 2.4..6.2；
 *              越重越大的身体压出越宽的重力井。
 *   wellTicks  井持续：基础 300 刻 + 等级 ×2，再乘压法系数，夹 200..560。
 *   pull       拽落速度：基础 0.32 格/刻 + 体重 ÷700 +（攻击超过 60）×0.0015，再乘压法系数，夹 0.15..0.9。
 *   pinTicks   贴地余量：基础 30 刻 + 速度 ×0.4，夹 20..80；离开井后仍被压住、浮空身份仍被拔的时长。
 *   density    重力尘密度：基础 22 + 特攻 ÷8，再乘压法系数，夹 12..56；直接驱动粒子数量。
 *   shock      落点冲击：基础 8 + 特攻 ÷14，夹 5..20；踩进井里时身上崩出的尘点。
 * 配置 crush 在「小而深、拽得狠、压得久的重压」和「大而浅、起手与冷却都更短的广域」之间取舍。
 */
namespace PokemonSkills {
    export const gravityId = "gravity";
    export const gravityField = "world_combat:field/gravity";
    export const gravityWell = "world_combat:gravity_well";
    export const gravityScene = "world_combat:move_gravity";
    export const gravityStatus = "gravity";
    export const gravityFallText = "world_combat.move.gravity.text.fall";
    export const gravityPinText = "world_combat.move.gravity.text.pin";

    actionParameters.define(gravityId, {
        gather: seconds(F.base(14).plus(F.stat("speed").minus(40).max(0).times(0.03).clamp(0, 5)).clamp(9, 22),
            "起手", "把重力压进地面需要多少时间；速度越快压得越早。"),
        settle: seconds(F.base(10).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 15),
            "收招", "重力井成型后收势需要多少时间。"),
        reach: formula(F.base(12).plus(F.level().minus(20).max(0).times(0.08)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面压下重力井；等级越高够得越远。" }),
        wellRadius: formula(
            F.base(3.4).plus(F.body("weight").clamp(10, 220).div(110)).plus(F.stat("defence").minus(50).max(0).times(0.006))
                .times(F.when(F.pref("crush"), F.const(0.8), F.const(1.3)))
                .clamp(2.4, 6.2).round(2),
            "重力井半径", { unit: " 格", description: "重力井覆盖多大的一片地；体重越大、防御越高越广，重压 ×0.8、广域 ×1.3。" }),
        wellTicks: seconds(
            F.base(300).plus(F.level().times(2))
                .times(F.when(F.pref("crush"), F.const(1.15), F.const(0.8)))
                .clamp(200, 560),
            "重力持续", "这口井压多久；重压更久（×1.15）、广域更短（×0.8），等级提升会延长。"),
        pull: formula(
            F.base(0.32).plus(F.body("weight").clamp(10, 220).div(700)).plus(F.stat("attack").minus(60).max(0).times(0.0015))
                .times(F.when(F.pref("crush"), F.const(1.4), F.const(0.75)))
                .clamp(0.15, 0.9).round(3),
            "拽落速度", { unit: " 格/刻", description: "井里离地活体每刻被向下拽的速度；体重与攻击越大越狠，重压 ×1.4、广域 ×0.75。" }),
        pinTicks: seconds(F.base(30).plus(F.stat("speed").times(0.4)).clamp(20, 80),
            "贴地余量", "离开重力井后仍被压住、浮空身份仍被拔的时长；速度越快余势散得越慢。"),
        density: formula(
            F.base(22).plus(F.stat("specialAttack").div(8))
                .times(F.when(F.pref("crush"), F.const(0.9), F.const(1.2))).clamp(12, 56).round(),
            "重力尘密度", { unit: " 点", description: "井里被拽落的尘点数量；特攻越高越密，粒子直接按它发射。" }),
        shock: formula(F.base(8).plus(F.stat("specialAttack").div(14)).clamp(5, 20).round(),
            "落点冲击", { unit: " 点", description: "踩进井里时身上崩出的尘点；特攻越高越猛。" })
    });

    stages(gravityId, [{ level: 40, values: { cooldown: 190 } }, { level: 55, values: { cooldown: 165 } }]);
    describe(gravityId, [
        { key: "description.0", values: ["wellRadius", "wellTicks"] },
        { key: "description.1", values: ["pull", "pinTicks"] },
        { key: "description.3", values: ["gather", "settle"] },
        { key: "description.4", values: [] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.crush); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.crush); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
