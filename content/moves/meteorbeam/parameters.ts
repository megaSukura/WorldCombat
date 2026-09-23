/**
 * 流星光束 / meteorbeam —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Rock／特殊／威力 120／命中 90／PP 10／优先度 0／非接触／flags charge。
 * 第 1 回合聚集宇宙之力提高特攻，第 2 回合攻击对手。没有天气捷径，一定走两回合。
 *
 * 翻译：把「聚宇宙之力→放」翻成「把天上的碎星拉下来收进身体（原作的特攻 +1 保留为共享能力等级），
 *   再抛出一颗走抛物线的陨石」。落点炸开一圈：正面命中的目标吃 `meteor`，落点半径 `blast` 内的其他敌人吃 `splash`；
 *   被顶开的距离由 `blowback` 决定。落点地面砸出焦黑的坑（world.terrain 的 linger 租约），
 *   陨石因此既越过掩体，又在世界留下痕迹。
 *
 * 数据分散（每个参数取不同的精灵数据；公式即悬浮里展开的那一棵）：
 *   meteor  直接命中威力：特攻定重量、等级定掌握；深空形态牺牲一点抛出的分量。
 *   splash  落点溅射威力：特攻决定爆开多少。
 *   charge  聚星时间：速度决定收束快慢；深空形态要更久。
 *   boost   聚星提升的特攻等级：深空形态多 1 级（与 native +1 对应）。
 *   velocity 陨石初速：特攻越高抛得越紧。
 *   blast   落点半径：碰撞箱高度决定爆开多大；深空形态再大一点。
 *   stone   陨石判定半径：碰撞箱高度决定石头多大。
 *   starlight 星光点数：特攻与等级，驱动表现的密度。
 *   craterTicks 坑的留存：等级决定焦黑地面存在多久。
 *   blowback 落点顶开：特攻越高顶得越开。
 *
 * 配置 `deep`（深空）双向取舍：开启＝聚星多 1 级特攻（+2 级）、落点更大，但聚星更久（×1.3）、
 *   抛出的直接威力 ×0.85、冷却更久；关闭＝聚星更快、抛出更重，但只 +1 级特攻、落点较小。
 *
 * 伤害段 `meteor`（直接命中）与 `splash`（落点溅射）。
 */
namespace PokemonSkills {
    actionParameters.define("meteorbeam", {
        /** 直接命中威力：120 + (特攻−60)×1.0（夹 −30..70）+ (等级−24)×0.45（夹 0..26）；深空 ×0.85；夹 70..240。 */
        meteor: formula(
            F.base(120)
                .plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-30, 70))
                .plus(F.level().minus(24).times(0.45).clamp(0, 26))
                .times(F.when(F.pref("deep", text("worldcombat.skill.meteorbeam.preference.deep")), F.const(0.85), F.const(1)))
                .clamp(70, 240).round(1),
            "直接命中威力", { base: 120,
                unit: "威力",
                description: "被陨石正面砸中的那个目标承受的威力；特攻越高星越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 落点溅射威力：56 + (特攻−60)×0.45（夹 −14..32）；夹 30..120。 */
        splash: formula(
            F.base(56).plus(F.stat("specialAttack").minus(60).times(0.45).clamp(-14, 32)).clamp(30, 120).round(1),
            "落点溅射威力", { base: 56,
                unit: "威力",
                description: "落点半径内、不是正面命中的敌人承受的那一份；特攻越高爆得越重。"
            }),
        /** 聚星时间：(30 − (速度−50)×0.06（夹 0..14）)× 深空倍率（1.3／1）；夹 14..40 刻。 */
        charge: seconds(
            F.base(30).minus(F.stat("speed").minus(50).times(0.06).clamp(0, 14))
                .times(F.when(F.pref("deep", text("worldcombat.skill.meteorbeam.preference.deep")), F.const(1.3), F.const(1)))
                .clamp(14, 40).round(0),
            "聚星时间", "站定把碎星收进身体的时间；速度快的收束更快，深空形态要拉得更久。"),
        /** 提升特攻等级：1 + 深空 +1；夹 1..2 级。 */
        boost: formula(
            F.base(1).plus(F.when(F.pref("deep", text("worldcombat.skill.meteorbeam.preference.deep")), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "特攻提升", {
                unit: "级",
                description: "聚星完成时提升的特攻能力等级（原生 +1）；深空形态多 1 级。这份提升在抛出后仍然留着。"
            }),
        /** 陨石初速：0.85 + (特攻−60)×0.004（夹 −0.15..0.4）；夹 0.6..1.35 格/刻。 */
        velocity: formula(
            F.base(0.85).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.15, 0.4)).clamp(0.6, 1.35).round(2),
            "陨石初速", {
                unit: "格/刻",
                description: "陨石抛出时的初速；特攻越高抛得越紧、越快。它走抛物线，所以掩体不一定救得了人。"
            }),
        /** 落点半径：1.9 + (碰撞箱高度−1.4)×0.4 + 深空 0.35；夹 1.4..3.2 格。 */
        blast: formula(
            F.base(1.9).plus(F.body("height").minus(1.4).times(0.4))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.meteorbeam.preference.deep")), F.const(0.35), F.const(0)))
                .clamp(1.4, 3.2).round(2),
            "落点半径", {
                unit: "格",
                description: "陨石落地时溅射与砸坑的半径；身板越大爆得越开，深空形态再大一点。"
            }),
        /** 陨石判定半径：0.45 + (碰撞箱高度−1.4)×0.12；夹 0.4..0.9 格。 */
        stone: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.4, 0.9).round(2),
            "陨石判定半径", {
                unit: "格",
                description: "飞行途中的判定半径；体型越大石头越大，越不容易从目标身边擦过。"
            }),
        /** 星光点数：12 + (特攻−60)×0.2（夹 −4..14）+ (等级−24)×0.3（夹 0..12）；夹 10..50 簇。 */
        starlight: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-4, 14))
                .plus(F.level().minus(24).times(0.3).clamp(0, 12))
                .clamp(10, 50).round(0),
            "星光点数", {
                unit: "簇",
                description: "聚星与落地时迸出的星点数，也驱动画面密度；特攻与等级越高越密。"
            }),
        /** 坑的留存：80 + (等级−20)×0.5（夹 0..50）刻；夹 50..130 刻。 */
        craterTicks: seconds(
            F.base(80).plus(F.level().minus(20).times(0.5).clamp(0, 50)).clamp(50, 130).round(0),
            "坑的留存", "落点砸出的焦黑地面存留的时长，时间一到原方块自己放回；等级越高留得越久。"),
        /** 落点顶开：0.3 + (特攻−60)×0.004（夹 0..0.45）；夹 0.2..0.8 格。 */
        blowback: formula(
            F.base(0.3).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(0, 0.45)).clamp(0.2, 0.8).round(2),
            "落点顶开", {
                unit: "格",
                description: "落点半径内被冲击顶开的距离；特攻越高顶得越开。"
            })
    });

    defineDamage("meteorbeam", "meteor", { defenceCoefficient: 0.005, rationale: "正面砸中的分量最重，让特攻差距在场上最直观。" }, {});
    defineDamage("meteorbeam", "splash", { defenceCoefficient: 0.0055, rationale: "溅射偏钝，对高特防目标的削减更明显。" }, {});

    stages("meteorbeam", [
        { level: 34, values: { meteor: 110 } },
        { level: 54, values: { meteor: 130, splash: 64 } },
        { level: 70, values: { cooldown: 40 } }
    ]);

    describe("meteorbeam", [
        { key: "description.0", values: ["meteor","splash"] },
        { key: "description.1", values: ["charge", "boost"] },
        { key: "description.2", values: ["velocity","blast","stone"] },
        { key: "description.3", values: ["blowback","craterTicks"] },
        { key: "stance.deep", values: [], when: function (context) { return !!read(context.detail.values, ["deep"]); } },
        { key: "stance.light", values: [], when: function (context) { return !read(context.detail.values, ["deep"]); } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level"], when: function (context) { return context.pokemon.level() >= 34; } },
        { key: "growth.1", values: ["tier.1.level"], when: function (context) { return context.pokemon.level() >= 54; } },
        { key: "growth.2", values: ["tier.2.level","tier.2.cooldown"], when: function (context) { return context.pokemon.level() >= 70; } }
    ]);
}
