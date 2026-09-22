/**
 * 火花 / ember 的参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 40／命中 100／PP 25／10% 灼伤（Cobblemon 1.8 / Showdown），72 位学习者。
 *
 * 翻译：把「向对手发射小型火焰」落成一粒**弹指射出的火种**——最小、最快、最便宜的一口火，沿一道很浅的
 * 弧线飞到目标身上；命中碎成几粒火星，可能在目标身上留下一点火。它故意不铺开、不持续、不封地：
 * 它就是「一口火星」，在这组火系远程里身量最小、出手最勤。同族里喷射火焰是一道会变长的火舌、
 * 大字爆炎是一整幅烧出的字、神圣之火是裹着虹彩的一次俯冲；火花是唯一单粒、可连发的那一个。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   spark      火种威力：特攻定火有多旺，等级给一点成长。
 *   velocity   出膛速度：速度决定火种多急。
 *   radius     火种判定半径：体型高度决定火粒大小。
 *   reach      射程：特攻决定能弹多远。
 *   burnChance 点燃概率：原生 10% 起，特攻与蓄力式提高。
 *   sparks     碎开火星数：特攻与等级派生，表现按它发射。
 *   tempo/aftercast/recharge：速度决定出手、收招与冷却。
 *
 * 配置 `charged`（蓄力式）双向取舍：开启＝威力更高、更易点燃、火粒更大，但起手 +4 刻、冷却 +8 刻、射程略短；
 * 关闭（速射式）＝出手更快、弹得更远、冷却更短，代价是威力与引燃都低——两向各有适用局面（点杀 vs 连发）。
 *
 * 伤害段 `spark` 走共享换算（原始类别 Special）；灼伤经 `impact` 的 `status: "burn"` 落到任何目标上。
 */
namespace PokemonSkills {
    actionParameters.define("ember", {
        /** 火种威力：40 + 特攻偏移[−8,20] + 等级(≥15)偏移[0,8]；蓄力 ×1.4；夹 28..92。 */
        spark: formula(
            F.base(40).plus(F.stat("specialAttack").minus(50).times(0.12).clamp(-8, 20))
                .plus(F.level().minus(15).times(0.05).clamp(0, 8))
                .times(F.when(F.pref("charged", text("worldcombat.skill.ember.preference.charged")), F.const(1.4), F.const(1)))
                .clamp(28, 92).round(1),
            "火种威力", {
                unit: "威力",
                description: "这一粒火种命中时的威力；特攻越高火越旺、等级越高越经烧，蓄力式再抬一档。对手特防、相性与暴击在命中时另算。"
            }),
        /** 出膛速度：1.5 + 速度偏移[−0.2,0.6]；夹 1.2..2.4。 */
        velocity: formula(
            F.base(1.5).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.6)).clamp(1.2, 2.4).round(2),
            "出膛速度", {
                unit: "格/刻",
                description: "火种离开指尖的速度；速度快的个体弹得更急，目标更难侧移躲开。"
            }),
        gravity: formula(
            F.const(0.012), "下坠", {
                unit: "格/刻²",
                description: "火种沿一道很浅的弧线飞出的轻微下坠；比直线多一点「抛出去」的感觉。"
            }),
        /** 火粒半径：0.16 + 高度偏移[−0.02,0.1]；夹 0.12..0.3。 */
        radius: formula(
            F.base(0.16).plus(F.body("height").minus(1.4).times(0.03).clamp(-0.02, 0.1)).clamp(0.12, 0.3).round(2),
            "火粒半径", {
                unit: "格",
                description: "飞行途中的判定半径；体型越高火粒越大。"
            }),
        /** 射程：12 + 特攻偏移[−1.5,3] − 蓄力 1；夹 9..17。 */
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(50).times(0.03).clamp(-1.5, 3))
                .minus(F.when(F.pref("charged", text("worldcombat.skill.ember.preference.charged")), F.const(1), F.const(0)))
                .clamp(9, 17).round(1),
            "射程", {
                unit: "格",
                description: "火种能被弹到多远；特攻高弹得远，蓄力式收得更近。它也是本招的实际射程来源。"
            }),
        /** 点燃概率：0.10 + 特攻偏移[−0.02,0.05] + 蓄力 0.05；夹 0.06..0.24。 */
        burnChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(50).times(0.0008).clamp(-0.02, 0.05))
                .plus(F.when(F.pref("charged", text("worldcombat.skill.ember.preference.charged")), F.const(0.05), F.const(0)))
                .clamp(0.06, 0.24).round(3),
            "点燃概率", "命中的火种把目标点着的概率；原生 10% 起，特攻越高、蓄力式越容易。"),
        /** 火星数：6 + 特攻偏移[−2,14] + 等级(≥15)偏移[0,8]；夹 5..26。 */
        sparks: formula(
            F.base(6).plus(F.stat("specialAttack").minus(50).times(0.12).clamp(-2, 14))
                .plus(F.level().minus(15).times(0.2).clamp(0, 8))
                .clamp(5, 26).round(0),
            "碎开火星", {
                unit: "个",
                description: "火种命碎时迸出的火星数量，也驱动表现的密度；特攻与等级越高碎得越多。"
            }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("charged", text("worldcombat.skill.ember.preference.charged")), F.const(4), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "把火在指尖团起来并弹出前的准备；速度越快越短，蓄力式多团一会儿。"),
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.8, 1)).clamp(3, 7).round(0),
            "收招", "弹出火种后收回手的时间；速度越快越利落。"),
        recharge: seconds(
            F.base(18).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("charged", text("worldcombat.skill.ember.preference.charged")), F.const(8), F.const(0)))
                .clamp(12, 30).round(0),
            "冷却", "再弹一粒火种前的等待；速度越快回得越快，蓄力式蓄得更久。")
    });

    defineDamage("ember", "spark", {});

    stages("ember", [
        { level: 18, values: { spark: 50, sparks: 16 } },
        { level: 36, values: { spark: 60, burnChance: 0.14 } }
    ]);

    describe("ember", [
        { key: "description.0", values: ["spark", "velocity", "radius"] },
        { key: "description.1", values: ["reach", "burnChance", "sparks"] },
        { key: "charged.on", values: [], when: function (context) { return read(context.detail.values, ["charged"]) === true; } },
        { key: "charged.off", values: [], when: function (context) { return read(context.detail.values, ["charged"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spark", "tier.0.sparks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spark", "tier.1.burnChance"] }
    ]);
}
