/**
 * 污泥炸弹 / sludgebomb —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／特殊／威力 90／命中 100／PP 10／单体／bullet flag／30% 令目标中毒。
 *
 * 翻译：把「用污泥投掷对手」落成一记**掷出后落在目标脚边、插着引信、过一小会儿才炸的污泥炸弹**。
 *   炸弹落在哪，哪就是爆心：引信烧完的一刻，爆心周围一圈的敌人一起挨毒泥、被沿离爆心方向推开、
 *   按概率中毒。爆心是活的——对手在引信烧完前走开就能少挨一下，这让「剩多少时间」变成能读出来的东西。
 *
 * 与同族分开：污泥攻击是低弧小泥团直接糊人、垃圾射击是负重直线炮、浊雾是正前方雾锥；
 *   只有污泥炸弹是**落地插引信的延时爆弹**，反制方式是在引信烧完前离开爆心。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数上：
 *   blast        爆心威力：特攻决定毒泥的浓度；密封形态把能量摊得更开所以单体略轻。
 *   burstRadius  爆心范围：碰撞箱高度与特攻共同决定炸开多大。
 *   fuseTicks    引信时长：速度越快引信越短（出手利落），密封弹壳烧得慢一些。
 *   push         推开距离：特攻与体重共同决定冲击把人推多远。
 *   reach        投掷距离：特攻决定能扔多远。
 *   tossSpeed    投掷初速：速度决定弧线快慢。
 *   bombRadius   弹体判定：碰撞箱高度决定炸弹大小。
 *   toxinChance  中毒概率：特攻与等级决定。
 *   venomTicks   中毒时长：等级与特攻决定。
 *   fumes        毒烟数：特攻决定，同时驱动引信与炸开的画面密度。
 *   tempo/settle/recharge：速度与等级决定起手、收招与冷却。
 *
 * 配置 `sealed`（密封取向，默认关）双向取舍：开启＝爆心更大（半径 ×1.3）、推得更远、引信更长、中毒概率 ×1.2，
 *   但爆心威力 ×0.9；关闭＝一枚更密更狠的弹（威力 ×1.12）、引信更短、范围更紧。两向各有适用局面。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原生类别 Special）。中毒走共享身份 world_combat:status/poison。
 */
namespace PokemonSkills {
    actionParameters.define("sludgebomb", {
        /** 爆心威力：90 + 特攻偏移[−16,36]；密封 ×0.9 / 密封关 ×1.12；夹 60..150。 */
        blast: formula(
            F.base(90).plus(F.stat("specialAttack").minus(60).times(0.36).clamp(-16, 36))
                .times(F.when(F.pref("sealed"), F.const(0.9), F.const(1.12)))
                .clamp(60, 150).round(1),
            "爆心威力", {
                unit: "威力",
                description: "引信烧完时，爆心一圈内每个敌人各结算一次的基础威力；特攻越高毒泥越浓。密封形态把能量摊到更大的范围上，这一下略轻。对手特防、相性与暴击在命中时另算。"
            }),
        /** 爆心范围：2.4 + 高度偏移[−0.3,1.0] + 特攻偏移[−0.3,1.0]；密封 ×1.3；夹 1.6..4.6。 */
        burstRadius: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.3, 1.0))
                .times(F.when(F.pref("sealed"), F.const(1.3), F.const(1)))
                .clamp(1.6, 4.6).round(2),
            "爆心范围", {
                unit: "格",
                description: "炸弹落地后引信烧完时能够到的半径；大个子、特攻高、密封形态炸得更开。它也是指示圈与表现的范围。"
            }),
        /** 引信时长：22 − 速度偏移[−4,6] + 密封 6；夹 12..40。 */
        fuseTicks: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("sealed"), F.const(6), F.const(0)))
                .clamp(12, 40).round(0),
            "引信时长", "炸弹落地到炸开之间留给对手走开的时间；速度快的个体点得利落，密封弹壳烧得慢。"),
        /** 推开距离：0.20 + 特攻偏移[−0.06,0.3] + 体重每 10 加 0.02；密封 ×1.2；夹 0.10..0.85。 */
        push: formula(
            F.base(0.20).plus(F.stat("specialAttack").minus(60).times(0.005).clamp(-0.06, 0.3))
                .plus(F.body("weight").div(10).times(0.02).clamp(0, 0.4))
                .times(F.when(F.pref("sealed"), F.const(1.2), F.const(1)))
                .clamp(0.10, 0.85).round(2),
            "推开距离", {
                unit: "格",
                description: "炸开时沿离爆心方向把人推开多远；特攻高、体重大的个体推得更远，密封形态更明显。"
            }),
        /** 投掷距离：10 + 特攻偏移[−1.5,3] + 等级(≥30)偏移[0,0.6]；夹 8..15。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 3))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.6))
                .clamp(8, 15).round(2),
            "投掷距离", {
                unit: "格",
                description: "能把炸弹扔到多远；特攻高、熟练的个体够得更远。它也是本招的实际射程。"
            }),
        /** 投掷初速：1.0 + 速度偏移[−0.12,0.35]；密封 ×0.9；夹 0.8..1.5。 */
        tossSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.12, 0.35))
                .times(F.when(F.pref("sealed"), F.const(0.9), F.const(1.05)))
                .clamp(0.8, 1.5).round(2),
            "投掷初速", {
                unit: "格/刻",
                description: "炸弹脱手时的初速；速度快的个体抛得更急，密封弹壳更重更慢。"
            }),
        /** 弹体判定：0.24 + 高度偏移[−0.04,0.18]；密封 ×1.15；夹 0.2..0.5。 */
        bombRadius: formula(
            F.base(0.24).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.04, 0.18))
                .times(F.when(F.pref("sealed"), F.const(1.15), F.const(1)))
                .clamp(0.2, 0.5).round(2),
            "弹体判定", {
                unit: "格",
                description: "炸弹飞行与落地判定的半径；体型越高弹体越大，密封弹壳更厚。"
            }),
        /** 中毒概率：0.30 + 特攻偏移[−0.06,0.16] + 等级(≥30)偏移[0,0.06]；密封 ×1.2；夹 0.18..0.58。 */
        toxinChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.06, 0.16))
                .plus(F.level().minus(30).times(0.001).clamp(0, 0.06))
                .times(F.when(F.pref("sealed"), F.const(1.2), F.const(1)))
                .clamp(0.18, 0.58).round(3),
            "中毒概率", "被毒泥溅到后陷入中毒的概率；原生 30% 起，特攻与等级越高越容易中毒，密封形态再抬一档。"),
        /** 中毒时长：280 + 等级(≥30)偏移[0,120] + 特攻偏移[−20,70]；夹 220..500。 */
        venomTicks: seconds(
            F.base(280).plus(F.level().minus(30).times(4).clamp(0, 120))
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-20, 70))
                .clamp(220, 500).round(0),
            "中毒时长", "毒如果没有立刻被解掉会持续多久；等级与特攻（毒液分泌量）越高挂得越久。"),
        /** 毒烟数：16 + 特攻偏移[−5,20]；密封 ×1.25；夹 12..44。 */
        fumes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.14).clamp(-5, 20))
                .times(F.when(F.pref("sealed"), F.const(1.25), F.const(1)))
                .clamp(12, 44).round(0),
            "毒烟数", {
                unit: "股",
                description: "引信冒烟与炸开时迸出的毒泥股数，随特攻增长；粒子按它发射，画面密度与机制一致。"
            }),
        /** 起手：13 − 速度偏移[−2,3] + 密封 2；夹 8..18。 */
        tempo: seconds(
            F.base(13).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 3))
                .plus(F.when(F.pref("sealed"), F.const(2), F.const(0))).clamp(8, 18).round(0),
            "起手", "把毒泥塞进弹壳、点着引信再掷出的时间；速度越快越短，密封装药多花一点。"),
        /** 收招：9；密封 ×1.15 / 密封关 ×0.95；夹 5..14。 */
        settle: seconds(
            F.base(9).times(F.when(F.pref("sealed"), F.const(1.15), F.const(0.95))).clamp(5, 14).round(0),
            "收招", "掷完把引信工具收回架势的时间；密封弹壳收得更慢。"),
        /** 冷却：34 − 等级(≥30)偏移[0,6]；夹 18..42。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(30).times(0.2).clamp(0, 6)).clamp(18, 42).round(0),
            "冷却", "两枚炸弹之间的等待；等级越高回得越快。"),
        maxTargets: hidden(7)
    });

    defineDamage("sludgebomb", "blast", {});

    stages("sludgebomb", [
        { level: 35, values: { blast: 98, burstRadius: 2.7 } },
        { level: 50, values: { blast: 108, toxinChance: 0.42 } }
    ]);

    describe("sludgebomb", [
        { key: "description.0", values: ["blast","burstRadius","maxTargets"] },
        { key: "description.1", values: ["fuseTicks", "push"] },
        { key: "description.2", values: ["toxinChance","venomTicks"] },
        { key: "sealed.on", values: [], when: function (context) { return read(context.detail.values, ["sealed"]) === true; } },
        { key: "sealed.off", values: [], when: function (context) { return read(context.detail.values, ["sealed"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level","tier.0.blast","tier.0.burstRadius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blast", "tier.1.toxinChance"] }
    ]);
}
