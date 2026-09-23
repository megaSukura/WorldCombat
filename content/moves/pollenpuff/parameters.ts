/**
 * 花粉团 / pollenpuff 的参数与伤害段。
 *
 * 原生事实：Bug／特殊／威力 90／命中 100／PP 15／优先度 0／flags bullet 等／target normal；
 *   onTryHit 对同伴把 basePower 归零并回满一半最大生命——「对敌人使用是会爆炸的团子。对我方使用则是
 *   给予回复的团子」。
 *
 * 翻译：把「同一团花粉按对象给出两种结果」翻成**一团抛出去、落在谁身上就由谁决定结果的花粉球**——
 *   抛到敌人身边就炸开成刺人的花粉（Bug 特殊伤害），抛到同伴身边就散成能喝的花粉（按最大生命恢复）。
 *   因为要同时能点同伴与敌人，本招用「选一个落点」的输入：把团子扔到同伴脚边就是救助，扔到敌人身边
 *   就是行凶。团子是真实飞行物（低弧），撞到第一个活体或落点即散开。
 *   与同族分开：
 *     毒粉（poisonpowder）—— 抛出的粉尘只毒敌人、不留回复；
 *     帮助（helpinghand）  —— 只能点同伴、只强化下一次命中；
 *     花粉团（本招）      —— 同一团花粉，同伴喝了回血、敌人炸伤，一次施放同时照顾圈内两类人。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   blast       爆炸威力 82 + 特攻偏移 + 等级偏移（花粉越浓炸得越重）；偏回复 ×0.8 / 偏伤害 ×1.25。
 *   mend        回复比例 0.46 + 亲密度偏移 + 特攻偏移（感情越好、花粉越滋养，回得越多）；偏回复 ×1.3 / 偏伤害 ×0.75。
 *   burstRadius 散开半径 1.9 格 + 身高偏移 + 等级偏移（身量大的个体甩出的团子散得开）；偏回复 ×1.05。
 *   reach       投掷射程 7 + 等级偏移 + 特攻偏移（等级与特攻越高扔得越远）。
 *   throwSpeed  飞行速度 0.8 + 速度偏移（腿快的个体扔得急）。
 *   tempo／settle／recharge 起手／收招／冷却随速度；偏回复冷却略长。
 *
 * 配置 `nurture`（偏回复）：开启＝回复比例 ×1.3、散开半径 ×1.05，代价爆炸威力 ×0.8、冷却更长；
 *   关闭（偏伤害）＝爆炸威力 ×1.25，代价回复比例 ×0.75。
 * 配置 `helpFriends`（照看同伴）：开启时伙伴 AI 会把团子扔向受伤的同伴；关闭则只顾自己与敌人。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原生类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("pollenpuff", {
        /** 爆炸威力：82 + 特攻偏移[−20,55] + 等级(≥30)偏移[0,12]；偏回复 ×0.8 / 偏伤害 ×1.25；夹 50..220。 */
        blast: formula(
            F.base(82)
                .plus(F.stat("specialAttack").minus(70).times(0.35).clamp(-20, 55))
                .plus(F.level().minus(30).times(0.2).clamp(0, 12))
                .times(F.when(F.pref("nurture"), F.const(0.8), F.const(1.25)))
                .clamp(50, 220).round(1),
            "爆炸威力", {
                unit: "威力",
                description: "花粉团落在敌人身上时炸开的基础威力；特攻越高、等级越高越重，偏伤害取向更高。对手特防、相性与暴击在命中时另算。"
            }),
        /** 回复比例：0.46 + 亲密度偏移[−0.06,0.12] + 特攻偏移[−0.05,0.1]；偏回复 ×1.3 / 偏伤害 ×0.75；夹 0.2..0.75。 */
        mend: percent(
            F.base(0.46)
                .plus(F.individual("friendship").minus(70).times(0.0006).clamp(-0.06, 0.12))
                .plus(F.stat("specialAttack").minus(70).times(0.0006).clamp(-0.05, 0.1))
                .times(F.when(F.pref("nurture"), F.const(1.3), F.const(0.75)))
                .clamp(0.2, 0.75).round(3),
            "回复比例", "花粉团落在同伴（或自己）身上时，恢复其最大生命的这个比例；亲密度越高、特攻越强，花粉越滋养。满血的人不再受益。"),
        /** 散开半径：1.9 + 身高偏移[−0.3,1.0] + 等级(≥30)偏移[0,0.6]；偏回复 ×1.05 / 偏伤害 ×1.0；夹 1.4..3.2。 */
        burstRadius: formula(
            F.base(1.9)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("nurture"), F.const(1.05), F.const(1.0)))
                .clamp(1.4, 3.2).round(2),
            "散开半径", {
                unit: "格",
                description: "团子落地散开多大一圈；圈内敌人挨炸、同伴回血。身形高、等级高的个体散得开，偏回复时略大。"
            }),
        /** 投掷射程：7 + 等级(≥30)偏移[0,2.4] + 特攻偏移[−1,1.8]；夹 5..11。 */
        reach: formula(
            F.base(7).plus(F.level().minus(30).times(0.08).clamp(0, 2.4))
                .plus(F.stat("specialAttack").minus(70).times(0.015).clamp(-1, 1.8)).clamp(5, 11).round(2),
            "投掷射程", {
                unit: "格",
                description: "花粉团最远能扔到哪里；等级高、特攻强的个体扔得更远。它也是本招的实际射程与指示圈半径。"
            }),
        /** 飞行速度：0.8 + 速度偏移[−0.15,0.35]；夹 0.6..1.4。 */
        throwSpeed: formula(
            F.base(0.8).plus(F.stat("speed").minus(60).times(0.003).clamp(-0.15, 0.35)).clamp(0.6, 1.4).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "团子飞行每刻走多远；腿快的个体扔得急，飞得平而快。"
            }),
        /** 起手：8 刻 − 速度偏移[−2,4]；夹 5..12。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4)).clamp(5, 12).round(0),
            "起手", "把花粉团拢起来、甩出去之前的准备；速度快的个体起得更利落。"),
        /** 收招：7 刻；夹 4..12。 */
        settle: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(0.5).clamp(-1, 2)).clamp(4, 12).round(0),
            "收招", "甩出团子之后收势的时间；身板大的个体收得稍慢。"),
        /** 冷却：24 刻 − 速度偏移[−4,6] + 偏回复 6 刻；夹 16..38。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.1).clamp(-4, 6))
                .plus(F.when(F.pref("nurture"), F.const(6), F.const(0))).clamp(16, 38).round(0),
            "冷却", "两次花粉团之间的等待；速度快的个体回得更快，偏回复更费。"),
        collisionRadius: hidden(0.24),
        maxTargets: hidden(5)
    });

    defineDamage("pollenpuff", "blast", {});

    stages("pollenpuff", [
        { level: 50, values: { blast: 118, mend: 0.6, reach: 8.6 } }
    ]);

    describe("pollenpuff", [
        { key: "description.0", values: ["blast","mend"] },
        { key: "description.1", values: ["burstRadius","reach","maxTargets"] },
        { key: "description.2", values: ["throwSpeed","tempo"] },
        { key: "nurture.on", values: [], when: function (context) { return read(context.detail.values, ["nurture"]) === true; } },
        { key: "nurture.off", values: [], when: function (context) { return read(context.detail.values, ["nurture"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.mend", "tier.0.reach"] }
    ]);
}
