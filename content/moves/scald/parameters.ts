/**
 * 热水 / scald 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 80／命中 100／PP 15／30% 灼伤；`defrost` 解除自身冰冻，`thawsTarget` 解除目标冰冻。
 * 翻译：把「喷射煮得翻滚的开水」翻成一团**被兜手抛出的沸水**——掌中先翻起白汽，水弹沿浅弧飞出，命中炸开成
 *   一片滚烫的水花；落点留下一摊还在翻滚的水洼，踏入的人被烫、可能被灼伤，沸水也把目标身上的冰冻化开。
 *   它是这一族里唯一用水做材料的一招：火从水里来，湿身的目标被沸水浇得更狠（命中时对湿身目标 ×1.18）。
 * 与同族分开：热风是一道推人的热浪、热沙大地是一把烫沙、炼狱是一根必灼的火柱；只有热水会把「湿」与「烫」
 *   同时留在原地，并解开冰冻。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数）：
 *   boil           直击威力：特攻定水有多烫、等级给成长；雨天更烫、烈日更淡；久沸式收力。
 *   globSpeed      水弹速度：速度决定抛得多急。
 *   slickRadius    水洼半径：特攻与体型高度决定摊开多大。
 *   slickTicks     水洼持续：等级与特攻决定烫多久；雨天更久、烈日更快蒸发。
 *   seethe         水洼每跳伤害：特攻打底。
 *   seetheInterval 水洼两跳间隔：速度。
 *   burnChance     直击灼伤概率：原生 30% 起，特攻与等级提高。
 *   slickChance    踏入水洼的灼伤概率：特攻；久沸式更高。
 *   drops          水花数：特攻与等级派生，表现按它发射。
 *   steep/settle/recharge：速度决定起手、收招与冷却。
 * 配置 simmer（久沸式）双向取舍：开启＝水洼更大更久、踏入更易被烫，代价是直击威力 ×0.9、冷却 +10；
 * 关闭（急沸式）＝直击 ×1.06、冷却 −2，水洼小而短。两向各有适用局面（封地 vs 点杀）。
 *
 * 伤害段 boil（直击）与 seethe（水洼每跳）各自成段，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("scald", {
        /** 直击威力：80 + 特攻偏移[−14,40] + 等级(≥25)偏移[0,12]；久沸 ×0.9／急沸 ×1.06；雨天 ×(1+rain×0.18)；烈日 ×0.86；夹 52..158。 */
        boil: formula(
            F.base(80)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-14, 40))
                .plus(F.level().minus(25).times(0.05).clamp(0, 12))
                .times(F.when(F.pref("simmer", text("worldcombat.skill.scald.preference.simmer")), F.const(0.9), F.const(1.06)))
                .times(F.const(1).plus(F.world("rain", text("worldcombat.skill.scald.value.rain")).times(0.18))
                    .as(text("worldcombat.skill.scald.value.rain")))
                .times(F.when(F.world("sunlight", text("worldcombat.value.sunlight")).gte(0.75), F.const(0.86), F.const(1)))
                .clamp(52, 158).round(1),
            "沸水威力", {
                unit: "威力",
                description: "这团沸水直击命中时的威力；特攻越高水越烫、等级越高越经烧，雨天更烫、烈日更快凉下来。对手特防、相性与暴击在命中时另算。"
            }),
        /** 水弹速度：1.15 + 速度偏移[−0.15,0.5]；夹 0.9..1.9。 */
        globSpeed: formula(
            F.base(1.15).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.5)).clamp(0.9, 1.9).round(2),
            "水弹速度", {
                unit: "格/刻",
                description: "沸水离手的速度；速度快的个体抛得更急，目标更难侧移躲开。"
            }),
        /** 水洼半径：1.8 + 特攻偏移[−0.25,0.7] + 高度偏移[−0.15,0.5]；久沸 ×1.3／急沸 ×0.85；夹 1.2..3.0。 */
        slickRadius: formula(
            F.base(1.8)
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.25, 0.7))
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.15, 0.5))
                .times(F.when(F.pref("simmer"), F.const(1.3), F.const(0.85)))
                .clamp(1.2, 3.0).round(2),
            "水洼半径", {
                unit: "格",
                description: "沸水落地摊开多大的一摊；特攻高、体型大的个体摊得更开，久沸式更大。它也是本招水洼的作用半径。"
            }),
        /** 水洼持续：110 + 等级(≥25)偏移[0,40] + 特攻偏移[−15,35]；雨天 ×(1+rain×0.35)；烈日 ×0.78；久沸 ×1.35／急沸 ×0.8；夹 60..260。 */
        slickTicks: seconds(
            F.base(110)
                .plus(F.level().minus(25).times(1.4).clamp(0, 40))
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-15, 35))
                .times(F.const(1).plus(F.world("rain", text("worldcombat.skill.scald.value.rain")).times(0.35)))
                .times(F.when(F.world("sunlight", text("worldcombat.value.sunlight")).gte(0.75), F.const(0.78), F.const(1)))
                .times(F.when(F.pref("simmer"), F.const(1.35), F.const(0.8)))
                .clamp(60, 260).round(0),
            "水洼持续", "这摊沸水在地上翻滚多久；等级与特攻越高烫得越久，雨天更久、烈日更快蒸发，久沸式留存更久。"),
        /** 水洼每跳：12 + 特攻偏移[−4,12]；夹 6..28。 */
        seethe: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-4, 12)).clamp(6, 28).round(1),
            "水洼每跳", {
                unit: "威力",
                description: "站在水洼里的人每隔一段时间挨一次的沸水伤害；踩在还烫的水里就会再挨。"
            }),
        /** 水洼间隔：10 − 速度偏移[−2,3]；夹 7..14。 */
        seetheInterval: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.012).clamp(-2, 3)).clamp(7, 14).round(0),
            "水洼间隔", "水洼两跳之间隔多久；速度快的个体把水搅得更勤、烫得更密。"),
        /** 灼伤概率：0.30 + 特攻偏移[−0.06,0.14] + 等级(≥25)偏移[0,0.06]；夹 0.15..0.50。 */
        burnChance: percent(
            F.base(0.30)
                .plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.06, 0.14))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.06))
                .clamp(0.15, 0.50).round(3),
            "灼伤概率", "沸水直击命中后把目标烫到灼伤的概率；原生 30% 起，特攻越高、等级越高越容易。"),
        /** 水洼灼伤：0.16 + 特攻偏移[−0.05,0.10]；久沸 ×1.25／急沸 ×0.8；夹 0.06..0.32。 */
        slickChance: percent(
            F.base(0.16)
                .plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.05, 0.10))
                .times(F.when(F.pref("simmer"), F.const(1.25), F.const(0.8)))
                .clamp(0.06, 0.32).round(3),
            "水洼灼伤", "踏入水洼的一刻被烫到灼伤的概率；久沸式的水更烫、更容易烫伤。"),
        /** 水花数：14 + 特攻偏移[−4,22] + 等级(≥25)偏移[0,8]；夹 10..48。 */
        drops: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-4, 22))
                .plus(F.level().minus(25).times(0.15).clamp(0, 8))
                .clamp(10, 48).round(0),
            "水花数", {
                unit: "个",
                description: "沸水炸开时迸出的水花数量，也驱动表现里的水花与白汽密度；特攻与等级越高溅得越多。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2] + 久沸 3；夹 5..14。 */
        steep: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("simmer"), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "把水烧滚、团在掌心的准备时间；速度越快越短，久沸式多滚一会儿。"),
        /** 收招：7 − 速度偏移[−1.2,1.5]；夹 4..10。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.2, 1.5)).clamp(4, 10).round(0),
            "收招", "抛出沸水后收回手的时间；速度越快越利落。"),
        /** 冷却：26 − 速度偏移[−3,4] + 久沸 10／急沸 −2；夹 18..44。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("simmer"), F.const(10), F.const(-2)))
                .clamp(18, 44).round(0),
            "冷却", "再烧一壶沸水前的等待；速度越快回得越快，久沸式重新攒水更久。"),
        /** 射程：12 + 特攻偏移[−1,3]；夹 9..16。 */
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 3)).clamp(9, 16).round(1),
            "射程", {
                unit: "格",
                description: "沸水能被抛到多远；特攻高抛得远。它也是本招的实际射程来源。"
            })
    });

    defineDamage("scald", "boil", {});
    defineDamage("scald", "seethe", {});

    stages("scald", [
        { level: 36, values: { boil: 96, burnChance: 0.36 } },
        { level: 50, values: { boil: 112, slickRadius: 2.2, slickChance: 0.22 } }
    ]);

    describe("scald", [
        { key: "description.0", values: ["boil"] },
        { key: "description.1", values: ["reach","globSpeed"] },
        { key: "description.2", values: ["burnChance","slickRadius"] },
        { key: "description.3", values: ["slickTicks","seethe","seetheInterval","slickChance"] },
        { key: "rule.thaw", values: [] },
        { key: "rule.wet", values: [] },
        { key: "simmer.on", values: [], when: function (context) { return read(context.detail.values, ["simmer"]) === true; } },
        { key: "simmer.off", values: [], when: function (context) { return read(context.detail.values, ["simmer"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.boil", "tier.0.burnChance"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.boil", "tier.1.slickRadius", "tier.1.slickChance"] }
    ]);
}
