/**
 * 热风 / heatwave 的参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 95／命中 90／PP 10／10% 灼伤／target allAdjacentFoes（身边所有对手），带 wind 旗标。
 * 翻译：把「将炎热的气息吹向对手」翻成**一口朝前吹出的灼热扇风**——施法者嗓子与胸口先透出热光，随后一道扇形
 *   热浪从身前贴着地面整片推出去，掠过的敌人一起挨烧、被风沿离身方向推离原位，并可能被点着。
 *   它不是火舌（喷射火焰）、不是弹丸（火花）、不是火柱（炼狱）：热风没有本体，只有一片会推人的热，吹完不留东西。
 *   烈日让这口风更干更烈，雨天把它压下去；风越大推得越远、扇面越宽，代价是热得更淡。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数）：
 *   gust          热风威力：特攻定热得多旺、等级给成长；烈日更烈、雨天更淡；疾风式收力。
 *   reach         吹程：特攻与速度决定热风能推多远。
 *   angle         扇面张角：体型高度与体重决定这口气多宽。
 *   push          推力：体重与特攻决定把命中者推离多远。
 *   igniteChance  灼伤概率：原生 10% 起，特攻与日光提高。
 *   sweepTicks    扇面推开的时间：速度。
 *   embers        火星数：特攻与吹程派生，表现按它发射。
 *   inhale/exhale/recharge：速度决定起手、收招、冷却。
 * 配置 gale（疾风式）双向取舍：开启＝扇面更宽、推得更远、扫得更快，代价是威力 ×0.88、灼伤 ×0.85、冷却 −2；
 * 关闭（灼热式）＝威力 ×1.12、灼伤 ×1.15，代价是扇面更窄、推得更近、冷却 +4。两向各有适用局面（驱散 vs 灼烧）。
 *
 * 伤害段 gust 走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("heatwave", {
        /** 热风威力：95 + 特攻偏移[−16,44] + 等级(≥30)偏移[0,12]；疾风 ×0.88／灼热 ×1.12；烈日 ×1.22；雨天 ×0.8；夹 62..170。 */
        gust: formula(
            F.base(95)
                .plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-16, 44))
                .plus(F.level().minus(30).times(0.06).clamp(0, 12))
                .times(F.when(F.pref("gale", text("worldcombat.skill.heatwave.preference.gale")), F.const(0.88), F.const(1.12)))
                .times(F.when(F.world("sunlight", text("worldcombat.value.sunlight")).gte(0.5), F.const(1.22), F.const(1)))
                .times(F.when(F.world("rain", text("worldcombat.skill.heatwave.value.rain")).gt(0.2), F.const(0.8), F.const(1)))
                .clamp(62, 170).round(1),
            "热风威力", {
                unit: "威力",
                description: "这口热风扫过每人时结算的威力；特攻越高、等级越高越烫，烈日更烈、雨天更淡。对手特防、相性与暴击在命中时另算。"
            }),
        /** 吹程：9.5 + 特攻偏移[−0.8,2.6] + 速度偏移[−0.4,1.2]；夹 7..14。 */
        reach: formula(
            F.base(9.5)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.8, 2.6))
                .plus(F.stat("speed").minus(55).times(0.01).clamp(-0.4, 1.2))
                .clamp(7, 14).round(1),
            "吹程", {
                unit: "格",
                description: "热风从身前能推到多远；特攻高、速度快的个体吹得更远。它也是本招的实际射程与扇面长度。"
            }),
        /** 扇面张角：96 + 高度偏移[−10,34] + 体重偏移[−6,14]；疾风 ×1.15／灼热 ×0.9；夹 78..150。 */
        angle: formula(
            F.base(96)
                .plus(F.body("height").minus(1.4).times(22).clamp(-10, 34))
                .plus(F.body("weight").minus(80).times(0.06).clamp(-6, 14))
                .times(F.when(F.pref("gale"), F.const(1.15), F.const(0.9)))
                .clamp(78, 150).round(0),
            "扇面张角", {
                unit: "度",
                description: "热风吹出的扇形有多宽；体型越高、体重越大的个体张口越宽，疾风式再张开。"
            }),
        /** 推力：0.5 + 体重偏移[−0.08,0.3] + 特攻偏移[−0.05,0.2]；疾风 ×1.35／灼热 ×0.7；夹 0.25..1.0。 */
        push: formula(
            F.base(0.5)
                .plus(F.body("weight").minus(80).times(0.002).clamp(-0.08, 0.3))
                .plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.05, 0.2))
                .times(F.when(F.pref("gale"), F.const(1.35), F.const(0.7)))
                .clamp(0.25, 1.0).round(2),
            "推力", {
                unit: "格",
                description: "被热风扫到的人沿离身方向被推离多远；体重越大推得越远，疾风式推得更猛。"
            }),
        /** 灼伤概率：0.10 + 特攻偏移[−0.03,0.10] + 日光 ×0.05；疾风 ×0.85／灼热 ×1.15；夹 0.05..0.30。 */
        igniteChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.03, 0.10))
                .plus(F.world("sunlight", text("worldcombat.value.sunlight")).times(0.05))
                .times(F.when(F.pref("gale"), F.const(0.85), F.const(1.15)))
                .clamp(0.05, 0.30).round(3),
            "灼伤概率", "被热风扫到的人被点着的概率；原生 10% 起，特攻越高、日光越烈越容易，灼热式更高。"),
        /** 推开时间：7 − 速度偏移[−1.5,2.5]；疾风 ×0.8；夹 4..10。 */
        sweepTicks: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.012).clamp(-1.5, 2.5))
                .times(F.when(F.pref("gale"), F.const(0.8), F.const(1)))
                .clamp(4, 10).round(0),
            "推开时间", "热风从身前铺到最外圈要多久；速度快的个体吹得更急，疾风式更快。"),
        /** 火星数：16 + 特攻偏移[−3,20] + 吹程 ×2；夹 12..54。 */
        embers: formula(
            F.base(16)
                .plus(F.stat("specialAttack").minus(60).times(0.16).clamp(-3, 20))
                .plus(F.stat("speed").minus(55).times(0.15).clamp(-2, 8))
                .clamp(12, 54).round(0),
            "火星数", {
                unit: "个",
                description: "热风里夹带的火星数量，也驱动表现中的火星与热浪密度；特攻与速度越高夹得越密。"
            }),
        /** 起手：9 − 速度偏移[−1.5,2]；夹 7..14。 */
        inhale: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2)).clamp(7, 14).round(0),
            "起手", "把胸腹间那口气热起来、鼓足了再吹的准备时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−1.2,1.5]；夹 4..9。 */
        exhale: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.2, 1.5)).clamp(4, 9).round(0),
            "收招", "吹完之后收住气的时间；速度越快越利落。"),
        /** 冷却：24 − 速度偏移[−3,4]；疾风 −2／灼热 +4；夹 16..40。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("gale"), F.const(-2), F.const(4)))
                .clamp(16, 40).round(0),
            "冷却", "再吹出一道热风前的等待；速度越快回得越快，灼热式重新蓄热更久。")
    });

    defineDamage("heatwave", "gust", {}, { flags: { wind: true } });

    stages("heatwave", [
        { level: 40, values: { gust: 112, igniteChance: 0.16 } },
        { level: 55, values: { gust: 128, reach: 11.2 } }
    ]);

    describe("heatwave", [
        { key: "description.0", values: ["gust"] },
        { key: "description.1", values: ["reach", "angle", "sweepTicks"] },
        { key: "description.2", values: ["igniteChance", "push"] },
        { key: "gale.on", values: [], when: function (context) { return read(context.detail.values, ["gale"]) === true; } },
        { key: "gale.off", values: [], when: function (context) { return read(context.detail.values, ["gale"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gust", "tier.0.igniteChance"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gust", "tier.1.reach"] }
    ]);
}
