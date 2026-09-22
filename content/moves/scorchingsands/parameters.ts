/**
 * 热沙大地 / scorchingsands 的参数与伤害段。
 *
 * 原生事实：Ground／特殊／威力 70／命中 100／PP 10／30% 灼伤；`defrost` 可解自身冰冻。
 * 翻译：把「将滚烫的沙子砸向对手」翻成**弯腰铲起一把被地热烤烫的沙、朝一点扬出去**——脚边的沙被热力吸起，
 *   沙幕沿弧线撒向落点，落地时整片炸开、把圈里的人一起烫伤并可能点着；落点的地表被烤成一层结实的沙壳，留一段时间。
 *   站在沙地上的施法者能铲到更多沙（地表证据驱动沙量与画面密度）；热沙粘在湿身目标身上更狠（命中 ×1.15）。
 * 与同族分开：热水是水洼、热风是一片推人的扇面、炼狱是一根必灼的火柱；只有热沙大地会把**沙本身**留在原地。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数）：
 *   grit           落点威力：特攻定沙有多烫、等级给成长；烈日更烫、雨天更淡；闷烧式收力。
 *   reach          抛沙距离：特攻决定能抛多远。
 *   flingSpeed     沙幕飞行速度：速度。
 *   spread         落点半径：特攻与体型高度决定铺开多大。
 *   burnChance     灼伤概率：原生 30% 起，特攻与等级提高。
 *   sandCells      沙壳格数：特攻与等级派生，表现与地表租借按它落。
 *   coatTicks      沙壳时长：等级与特攻；烈日更久、雨天更短、闷烧式更久。
 *   hearthPower    闷烧每跳伤害：特攻（闷烧式才使用）。
 *   hearthInterval 闷烧间隔：速度。
 *   hearthChance   踏入闷烧沙的灼伤概率：特攻。
 *   embers         火星数：特攻与落点半径派生，表现按它发射。
 *   flingTicks/settleTicks/recharge：速度决定起手、收招、冷却。
 * 配置 hearth（闷烧式）双向取舍：开启＝落点威力 ×0.88，但留下的沙持续闷烧、踏入更易被烫、留存更久、冷却 +8；
 * 关闭（赤沙式）＝落点威力 ×1.08、沙只是躺着，冷却 −3。两向各有适用局面（封地 vs 爆发）。
 *
 * 伤害段 grit（落点）与 hearth（闷烧每跳）各自成段，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("scorchingsands", {
        /** 落点威力：70 + 特攻偏移[−12,34] + 等级(≥28)偏移[0,10]；闷烧 ×0.88／赤沙 ×1.08；烈日 ×1.18；雨天 ×0.85；夹 48..140。 */
        grit: formula(
            F.base(70)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-12, 34))
                .plus(F.level().minus(28).times(0.05).clamp(0, 10))
                .times(F.when(F.pref("hearth", text("worldcombat.skill.scorchingsands.preference.hearth")), F.const(0.88), F.const(1.08)))
                .times(F.when(F.world("sunlight", text("worldcombat.value.sunlight")).gte(0.6), F.const(1.18), F.const(1)))
                .times(F.when(F.world("rain", text("worldcombat.skill.scorchingsands.value.rain")).gt(0.2), F.const(0.85), F.const(1)))
                .clamp(48, 140).round(1),
            "落点威力", {
                unit: "威力",
                description: "这把热沙在落点炸开时对圈内每人结算的威力；特攻越高、等级越高越烫，烈日更烫、雨天被浇淡。对手特防、相性与暴击在命中时另算。"
            }),
        /** 抛沙距离：12 + 特攻偏移[−1,3]；夹 9..16。 */
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 3)).clamp(9, 16).round(1),
            "抛沙距离", {
                unit: "格",
                description: "这把沙能被扬到多远；特攻高抛得远。它也是本招的实际射程来源。"
            }),
        /** 沙幕速度：0.9 + 速度偏移[−0.15,0.5]；夹 0.7..1.6。 */
        flingSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.5)).clamp(0.7, 1.6).round(2),
            "沙幕速度", {
                unit: "格/刻",
                description: "沙幕离手的速度；速度快的个体扬得更急，落点更难被提前走开。"
            }),
        /** 落点半径：2.6 + 特攻偏移[−0.4,0.9] + 高度偏移[−0.2,0.7]；夹 2.0..4.2。 */
        spread: formula(
            F.base(2.6)
                .plus(F.stat("specialAttack").minus(60).times(0.01).clamp(-0.4, 0.9))
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.7))
                .clamp(2.0, 4.2).round(2),
            "落点半径", {
                unit: "格",
                description: "热沙落地时炸开多大一片；特攻高、体型大的个体铺得更开。它也是本招的作用半径。"
            }),
        /** 灼伤概率：0.30 + 特攻偏移[−0.05,0.13] + 等级(≥28)偏移[0,0.06]；夹 0.15..0.50。 */
        burnChance: percent(
            F.base(0.30)
                .plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.05, 0.13))
                .plus(F.level().minus(28).times(0.001).clamp(0, 0.06))
                .clamp(0.15, 0.50).round(3),
            "灼伤概率", "落点内的人被热沙烫到灼伤的概率；原生 30% 起，特攻越高、等级越高越容易。"),
        /** 沙壳格数：18 + 特攻偏移[−4,24] + 等级(≥28)偏移[0,10]；夹 12..48。 */
        sandCells: formula(
            F.base(18)
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-4, 24))
                .plus(F.level().minus(28).times(0.2).clamp(0, 10))
                .clamp(12, 48).round(0),
            "沙壳格数", {
                unit: "格",
                description: "落点的地表被烤成多少格沙壳，也驱动表现里的沙量与扬尘；特攻与等级越高铺得越多。"
            }),
        /** 沙壳时长：140 + 等级(≥28)偏移[0,44] + 特攻偏移[−18,36]；烈日 ×1.15；雨天 ×0.85；闷烧 ×1.3／赤沙 ×0.9；夹 80..320。 */
        coatTicks: seconds(
            F.base(140)
                .plus(F.level().minus(28).times(1.6).clamp(0, 44))
                .plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-18, 36))
                .times(F.when(F.world("sunlight", text("worldcombat.value.sunlight")).gte(0.6), F.const(1.15), F.const(1)))
                .times(F.when(F.world("rain", text("worldcombat.skill.scorchingsands.value.rain")).gt(0.2), F.const(0.85), F.const(1)))
                .times(F.when(F.pref("hearth"), F.const(1.3), F.const(0.9)))
                .clamp(80, 320).round(0),
            "沙壳时长", "落点的沙壳留多久；等级与特攻越高留得越久，烈日烤得更久、雨天冲得更快，闷烧式留得最久。"),
        /** 闷烧每跳：10 + 特攻偏移[−3,10]；夹 5..22。 */
        hearthPower: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-3, 10)).clamp(5, 22).round(1),
            "闷烧每跳", {
                unit: "威力",
                description: "闷烧式留下的沙每隔一段时间对站在上面的人造成的伤害；踩在还烫的沙里就会再挨。"
            }),
        /** 闷烧间隔：12 − 速度偏移[−2,3]；夹 8..16。 */
        hearthInterval: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.012).clamp(-2, 3)).clamp(8, 16).round(0),
            "闷烧间隔", "闷烧的沙两跳之间隔多久；速度快的个体把沙翻得更勤、烫得更密。"),
        /** 踏入灼伤：0.18 + 特攻偏移[−0.05,0.10]；夹 0.06..0.34。 */
        hearthChance: percent(
            F.base(0.18).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.05, 0.10)).clamp(0.06, 0.34).round(3),
            "踏入灼伤", "踏入闷烧的沙时被烫到灼伤的概率；特攻越高沙越烫。"),
        /** 火星数：14 + 特攻偏移[−3,20] + 落点半径 ×6；夹 10..50。 */
        embers: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-3, 20))
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-2, 8))
                .clamp(10, 50).round(0),
            "火星数", {
                unit: "个",
                description: "热沙里夹带的火星数量，也驱动表现中的沙粒与火星密度；特攻与体型越大夹得越密。"
            }),
        /** 起手：10 − 速度偏移[−1.5,2]；夹 7..15。 */
        flingTicks: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2)).clamp(7, 15).round(0),
            "起手", "弯腰铲沙、把沙在手里焐烫的准备时间；速度越快越短。"),
        /** 收招：8 − 速度偏移[−1.2,1.5]；夹 5..11。 */
        settleTicks: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.2, 1.5)).clamp(5, 11).round(0),
            "收招", "扬完沙后收势的时间；速度越快越利落。"),
        /** 冷却：28 − 速度偏移[−3,4] + 闷烧 8／赤沙 −3；夹 20..46。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("hearth"), F.const(8), F.const(-3)))
                .clamp(20, 46).round(0),
            "冷却", "再铲一把热沙前的等待；速度越快回得越快，闷烧式重新焐沙更久。")
    });

    defineDamage("scorchingsands", "grit", {});
    defineDamage("scorchingsands", "hearth", {});

    stages("scorchingsands", [
        { level: 40, values: { grit: 84, burnChance: 0.36 } },
        { level: 52, values: { grit: 98, spread: 3.2 } }
    ]);

    describe("scorchingsands", [
        { key: "description.0", values: ["grit"] },
        { key: "description.1", values: ["reach", "flingSpeed", "spread"] },
        { key: "description.2", values: ["burnChance", "sandCells", "coatTicks"] },
        { key: "description.3", values: ["hearthPower", "hearthInterval", "hearthChance"],
            when: function (context) { return read(context.detail.values, ["hearth"]) === true; } },
        { key: "rule.sand", values: [] },
        { key: "hearth.on", values: [], when: function (context) { return read(context.detail.values, ["hearth"]) === true; } },
        { key: "hearth.off", values: [], when: function (context) { return read(context.detail.values, ["hearth"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.grit", "tier.0.burnChance"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.grit", "tier.1.spread"] }
    ]);
}
