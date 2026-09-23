/**
 * 火之舞 / fierydance —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Fire／特殊／威力 80／命中 100／PP 10／单体；命中后有 50% 让自身特攻 +1。
 * 翻译：把「让火焰覆盖全身，振翅攻击对手，有时提高自己的特攻」落成**一支贴着身体展开的两拍火舞**——
 *   火焰先裹住全身，第一拍把身边一圈点着，第二拍振翅把外圈再卷开一截；被卷到的人各吃一记火焰，
 *   舞到兴头时火焰更旺、特攻随之提升。它是四式里唯一以自身为中心、分两拍向外展开的一记。
 *
 * 与同族分开：充电光束是远远一点直线过去、命中回灌；火之舞是贴着自己跳、覆盖全身、把身边分两圈扫开，
 *   越靠近越先被点着，往外退一步还能再吃一拍的外圈。
 *
 * 数值分散（每项依赖不同的精灵数据）：
 *   blaze         每一拍威力：特攻给出火势、速度给出振翅的节奏；旋舞式每一拍更轻。
 *   inner         内圈半径：体型；身板越大第一拍铺得越开。
 *   outer         外圈半径：体型与速度；旋舞式再卷出去一截。
 *   beat          两拍间隔：速度；越快两拍接得越紧。
 *   spin          火焰团数：特攻；表现里的火焰团数量。
 *   blazeChance   涨特攻几率：特攻与等级；原生 50% 的即时化。
 *   blazeStages   涨特攻级数：旋舞式一次升两级。
 *   push          击退：特攻；把命中的人向外推开。
 *   tempo/aftercast/recharge 速度与等级决定起手、收招与冷却；旋舞式以更慢更贵换更大的一支舞。
 *
 * 配置 `spiral`（旋舞）双向取舍：开启＝外圈更大、一次升两级特攻，但每一拍更轻、起手与冷却更久；
 * 关闭（聚焰）＝两拍更重、更快更便宜、外圈略小，命中只升一级。两个方向对应「跳开一圈铺场」与「贴着点杀」。
 */
namespace PokemonSkills {
    actionParameters.define("fierydance", {
        /** 每一拍威力：80 + 特攻偏移[−14,44] + 速度偏移[−6,12]；旋舞 ×0.90 / 聚焰 ×1.12；夹 44..152。 */
        blaze: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-14, 44))
                .plus(F.stat("speed").minus(60).times(0.05).clamp(-6, 12))
                .times(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(0.90), F.const(1.12)))
                .clamp(44, 152).round(1),
            "每拍威力", {
                unit: "威力",
                description: "每一拍火焰卷到人身上时那一下的威力；特攻越高火越旺、振翅越快越重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 内圈半径：1.6 + 身高偏移[−0.2,0.6]；夹 1.20..2.60。 */
        inner: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.18).clamp(-0.2, 0.6)).clamp(1.20, 2.60).round(2),
            "内圈半径", {
                unit: "格",
                description: "第一拍火焰先点着的身周范围；身板越大铺得越开，贴在这个圈里就会被第一拍卷到。"
            }),
        /** 外圈半径：2.8 + 身高偏移[−0.3,0.9] + 速度偏移[−0.3,0.7]；旋舞 ×1.20；夹 2.20..5.00。 */
        outer: formula(
            F.base(2.8).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.3, 0.9))
                .plus(F.stat("speed").minus(60).times(0.012).clamp(-0.3, 0.7))
                .times(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(1.20), F.const(1)))
                .clamp(2.20, 5.00).round(2),
            "外圈半径", {
                unit: "格",
                description: "第二拍振翅把火焰再卷出去的范围；退到内圈之外、外圈之内的人会被第二拍追上，旋舞式卷得更开。"
            }),
        /** 两拍间隔：5 − 速度偏移[−2,2]；夹 3..8。 */
        beat: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(3, 8).round(0),
            "两拍间隔", "第一拍与第二拍之间振翅的间隔；速度越快两拍接得越紧。"),
        /** 火焰团数：18 + 特攻偏移[0,16]；旋舞 ×1.20；夹 12..52。 */
        spin: formula(
            F.base(18).plus(F.stat("specialAttack").minus(60).times(0.10).clamp(0, 16))
                .times(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(1.20), F.const(1)))
                .clamp(12, 52).round(0),
            "火焰团数", {
                unit: "团",
                description: "整支火舞扬起的火焰团数量；特攻越高舞得越盛，旋舞式再铺一层。粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 涨特攻几率：0.50 + 特攻偏移[0,0.15] + 等级偏移[0,0.10]；旋舞 ×1.15；夹 0.30..0.80。 */
        blazeChance: percent(
            F.base(0.50).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(0, 0.15))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.10))
                .times(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(1.15), F.const(1)))
                .clamp(0.30, 0.80).round(3),
            "涨特攻几率", "舞到兴头、火焰更旺而特攻提升的几率；原生约 50%，特攻与等级把它抬得更稳，旋舞式更足。"),
        /** 涨特攻级数：固定 1，旋舞式 2；夹 1..2。 */
        blazeStages: formula(
            F.base(1).plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "涨特攻级数", {
                unit: "级",
                description: "一次火舞提升的特攻级数；旋舞式多升一级，聚焰式只升一级。"
            }),
        /** 击退：0.20 + 特攻偏移[0,0.25]；夹 0.10..0.50。 */
        push: formula(
            F.base(0.20).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(0, 0.25)).clamp(0.10, 0.50).round(2),
            "击退", {
                unit: "格",
                description: "命中后把每个人沿背离施法者的方向推开多远；火势越旺推得越开。"
            }),
        /** 起手：10 − 速度偏移[−2,3] + 旋舞 3；夹 6..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "火焰裹住全身、张开双翼的起势；速度越快越短，旋舞式多起一拍。"),
        /** 收招：8 + 旋舞 3；夹 6..14。 */
        aftercast: seconds(
            F.base(8).plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(3), F.const(0))).clamp(6, 14).round(0),
            "收招", "两拍跳完、火焰收拢的收势；旋舞式收得久一点。"),
        /** 冷却：30 − 等级(≥20)偏移[0,6] + 旋舞 6；夹 18..44。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(20).times(0.10).clamp(0, 6))
                .plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(6), F.const(0)))
                .clamp(18, 44).round(0),
            "冷却", "两支火舞之间的等待；等级越高回得越快，旋舞式缓得更久。")
    });

    defineDamage("fierydance", "blaze", {});

    stages("fierydance", [
        { level: 40, values: { blaze: 90 } },
        { level: 60, values: { blaze: 100, blazeStages: 2 } }
    ]);

    describe("fierydance", [
        { key: "description.0", values: ["blaze", "inner"] },
        { key: "description.1", values: ["outer","beat","push"] },
        { key: "description.2", values: ["blazeChance","blazeStages"] },
        { key: "spiral.on", values: [], when: function (context) { return read(context.detail.values, ["spiral"]) === true; } },
        { key: "spiral.off", values: [], when: function (context) { return read(context.detail.values, ["spiral"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level","tier.0.blaze"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.blaze","tier.1.blazeStages"] }
    ]);
}
