/**
 * 喷射火焰 / flamethrower 的参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 90／命中 100／PP 15／10% 灼伤（Cobblemon 1.8 / Showdown），198 位学习者。
 *
 * 翻译：把「向对手发射烈焰」落成一道**持续向前喷出的火舌**——从身前喷出，火舌逐刻向远处伸长，
 * 沿一条走廊燎过；站在里面的人各挨一记并被点燃，火舌扫完才收。它和同族最不同的地方是「持续」：
 * 火花是一粒点，大字爆炎是一幅字，神圣之火是一次俯冲；喷射火焰是一道会自己变长的墙。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   jet        火舌威力：特攻定火多旺，等级给成长；扇面式摊薄。
 *   front      火舌推进速度：速度决定火舌铺得多急。
 *   reach      火舌长度：特攻与体型高度决定能喷多远；扇面式收短。
 *   halfWidth  集束式火舌宽度：体型高度决定。
 *   angle      扇面式张角：特攻决定扇面开多大。
 *   burnChance 点燃概率：原生 10% 起，特攻与扇面式提高。
 *   density    火量：特攻与等级派生，表现按它发射。
 *   tempo/aftercast/recharge：速度决定蓄气与冷却。
 *
 * 配置 `wide`（扇面式）双向取舍：开启＝张角大、一次罩住更多人、更易点燃，但威力摊薄、火舌更短、冷却更久；
 * 关闭（集束式）＝一条细长火舌、单体更重、射得更远——两向分别对应清场与点名。
 *
 * 伤害段 `jet` 走共享换算（原始类别 Special）；灼伤经 `hurt` 的 `status: "burn"` 落到任何目标上。
 */
namespace PokemonSkills {
    actionParameters.define("flamethrower", {
        /** 火舌威力：78 + 特攻偏移[−14,40] + 等级(≥30)偏移[0,12]；扇面 ×0.82；夹 52..170。 */
        jet: formula(
            F.base(78).plus(F.stat("specialAttack").minus(50).times(0.35).clamp(-14, 40))
                .plus(F.level().minus(30).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("wide", text("worldcombat.skill.flamethrower.preference.wide")), F.const(0.82), F.const(1)))
                .clamp(52, 170).round(1),
            "火舌威力", {
                unit: "威力",
                description: "火舌燎到每个目标时各结算一次的威力；特攻越高烧得越狠、等级越高越经烧，扇面式把力摊薄。对手特防、相性与暴击在命中时另算。"
            }),
        /** 推进速度：0.55 + 速度偏移[−0.1,0.35]；夹 0.4..1.1。 */
        front: formula(
            F.base(0.55).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.1, 0.35)).clamp(0.4, 1.1).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "火舌每刻向远处推进多少；速度快的个体铺得更急，目标更难在火到之前走开。"
            }),
        /** 火舌长度：10 + 特攻偏移[−1.5,2.5] + 高度偏移[−0.5,1.2]；扇面 ×0.78；夹 6..15。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(50).times(0.03).clamp(-1.5, 2.5))
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.5, 1.2))
                .times(F.when(F.pref("wide", text("worldcombat.skill.flamethrower.preference.wide")), F.const(0.78), F.const(1)))
                .clamp(6, 15).round(2),
            "火舌长度", {
                unit: "格",
                description: "火舌最长能喷到多远；特攻高、体型大的个体喷得更远，扇面式收得短一些。它也是本招的实际射程。"
            }),
        /** 集束宽度：0.7 + 高度偏移[−0.1,0.4]；夹 0.55..1.1。 */
        halfWidth: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.15).clamp(-0.1, 0.4)).clamp(0.55, 1.1).round(2),
            "集束宽度", {
                unit: "格",
                description: "集束式火舌的横向半径；身板越大火柱越粗。扇面式不用它，改用张角。"
            }),
        /** 扇面张角：30 + 特攻偏移[−6,10]；夹 20..44。 */
        angle: formula(
            F.base(30).plus(F.stat("specialAttack").minus(50).times(0.06).clamp(-6, 10)).clamp(20, 44).round(0),
            "扇面张角", {
                unit: "度",
                description: "扇面式火焰在身前张开的整角；特攻越高扇面越开。集束式不用它。"
            }),
        /** 点燃概率：0.10 + 特攻偏移[−0.03,0.09] + 扇面 0.05；夹 0.06..0.28。 */
        burnChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(50).times(0.0015).clamp(-0.03, 0.09))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.flamethrower.preference.wide")), F.const(0.05), F.const(0)))
                .clamp(0.06, 0.28).round(3),
            "点燃概率", "被火舌燎到的目标陷入灼伤的概率；特攻越高、扇面式越容易点着。"),
        /** 火量：60 + 特攻偏移[−12,60] + 等级(≥30)偏移[0,30]；夹 40..150。 */
        density: formula(
            F.base(60).plus(F.stat("specialAttack").minus(50).times(0.6).clamp(-12, 60))
                .plus(F.level().minus(30).times(1.2).clamp(0, 30))
                .clamp(40, 150).round(0),
            "火量", {
                unit: "股/秒",
                description: "火舌每秒喷出的火焰量，也驱动表现的密度；特攻与等级越高火越密。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.flamethrower.preference.wide")), F.const(2), F.const(0)))
                .clamp(6, 13).round(0),
            "蓄气", "喷出火舌前把气与火攒到喉间的时间；速度越快越短，扇面式多攒一点。"),
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 12).round(0),
            "收招", "火舌喷完收势的时间；速度越快越利落。"),
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.flamethrower.preference.wide")), F.const(6), F.const(0)))
                .clamp(20, 42).round(0),
            "冷却", "再喷一道火舌前的等待；速度越快回得越快，扇面式蓄得更久。"),
        maxTargets: hidden(6)
    });

    defineDamage("flamethrower", "jet", {});

    stages("flamethrower", [
        { level: 43, values: { jet: 104, reach: 11 } },
        { level: 60, values: { jet: 118, reach: 11.5, density: 100 } }
    ]);

    describe("flamethrower", [
        { key: "description.0", values: ["jet","reach","front"] },
        { key: "description.1", values: ["burnChance"] },
        { key: "description.limit", values: ["maxTargets"] },
        { key: "description.stand", values: [] },
        { key: "wide.on", values: ["angle"], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: ["halfWidth"], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jet", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jet", "tier.1.reach"] }
    ]);
}
