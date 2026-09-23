/**
 * 琉光冲激 / luminacrash —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 80／命中 100／PP 10／target normal／追加 100% 令目标特防 −2。
 * （Cobblemon 1.8，正式学习者：铁头壳 / Iron Crown。）
 *
 * 翻译：把「放出连精神都能影响到的奇妙怪光」落成一道**从目标头顶引下的怪光柱**——光柱在半空聚起、
 * 坠落时沿着目标的方向拐弯（追踪 `leash` 以内），砸中时在目标脚下炸开一圈；被砸的人精神受创、
 * 特防狠狠掉两级，圈里被卷进的人各挨一记溅射。它是四式里唯一从天而降、唯一单点重击带小范围溅射的
 * 那个：不是扑向目标的一束，而是「等它落下来」。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          光柱威力：特攻定光压，等级给成长。
 *   splash        溅射威力：特攻定脚下光圈卷到人的力道。
 *   castRange     施放距离：等级与身高决定能在多远的头顶引下光柱。
 *   pillarHeight  引下高度：等级与身高决定光柱从多高落下。
 *   pillarRadius  光柱半径：体型与特攻决定光柱多粗。
 *   burstRadius   炸落半径：体型与特攻决定脚下光圈多大。
 *   fallTicks     坠落时间：速度决定光砸得多快。
 *   leash         逃逸距离：特攻决定光柱追得紧不紧。
 *   dazzleTicks   残影时长：等级与特攻决定命中后目标身上怪光残影留多久。
 *   rays          光束数：特攻与等级派生，也驱动表现。
 *   sunderStages  碾防级数：固定 2 级，与原生一致。
 *   tempo         起手：速度决定引流出手的快慢。
 *
 * 配置 `disperse`（弥散式）双向取舍：开启＝炸落半径 ×1.5、溅射 ×1.3，但光柱单发 ×0.85、起手 +2 刻、冷却 +5；
 * 关闭（聚焦式）＝一道细光柱、单点更重。两向分别对应「砸一群」与「点一个」。
 *
 * 伤害段 `core`（光柱直击）与 `splash`（脚下炸落）各自成段，走共享换算（原生类别 Special）。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -2)。
 */
namespace PokemonSkills {
    actionParameters.define("luminacrash", {
        /** 光柱威力：68 + 特攻偏移[−12,34] + 等级(≥30)偏移[0,12]；弥散 ×0.85；夹 46..148。 */
        core: formula(
            F.base(68)
                .plus(F.stat("specialAttack").minus(55).times(0.3).clamp(-12, 34))
                .plus(F.level().minus(30).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("disperse"), F.const(0.85), F.const(1)))
                .clamp(46, 148).round(1),
            "光柱威力", {
                unit: "威力",
                description: "怪光柱砸中目标时结算一次的威力；特攻越高光压越强、等级越高越经用，弥散式把力分给周围。对手特防、相性与暴击在命中时另算。"
            }),
        /** 溅射威力：26 + 特攻偏移[−5,15]；弥散 ×1.3；夹 14..58。 */
        splash: formula(
            F.base(26).plus(F.stat("specialAttack").minus(55).times(0.12).clamp(-5, 15))
                .times(F.when(F.pref("disperse"), F.const(1.3), F.const(1)))
                .clamp(14, 58).round(1),
            "溅射威力", {
                unit: "威力",
                description: "光柱砸落时脚下光圈卷到其他敌人的威力；特攻越高越疼，弥散式更重。"
            }),
        /** 施放距离：10 + 等级(≥25)偏移[0,4] + 高度偏移[−0.3,1.2]；弥散 ×0.95；夹 7..15。 */
        castRange: formula(
            F.base(10)
                .plus(F.level().minus(25).times(0.08).clamp(0, 4))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.2))
                .times(F.when(F.pref("disperse"), F.const(0.95), F.const(1)))
                .clamp(7, 15).round(2),
            "施放距离", {
                unit: "格",
                description: "能在多远的对手头顶引下光柱；等级与身高越高引得越远。它也是本招的实际射程。"
            }),
        /** 引下高度：9 + 等级(≥30)偏移[0,4] + 高度偏移[−0.5,1.6]；夹 6..18。 */
        pillarHeight: formula(
            F.base(9)
                .plus(F.level().minus(30).times(0.12).clamp(0, 4))
                .plus(F.body("height").minus(1.4).times(0.7).clamp(-0.5, 1.6))
                .clamp(6, 18).round(1),
            "引下高度", {
                unit: "格",
                description: "怪光柱从目标头顶多高引下；等级与身高越高、光落得越远。画面从同一高度画出坠落。"
            }),
        /** 光柱半径：0.9 + 特攻偏移[−0.15,0.4] + 高度偏移[−0.1,0.5]；夹 0.7..1.8。 */
        pillarRadius: formula(
            F.base(0.9)
                .plus(F.stat("specialAttack").minus(55).times(0.004).clamp(-0.15, 0.4))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.1, 0.5))
                .clamp(0.7, 1.8).round(2),
            "光柱半径", {
                unit: "格",
                description: "坠落光柱的粗细；特攻高、体型大的个体光柱更粗，画面按它画粗细。"
            }),
        /** 炸落半径：2.0 + 高度偏移[−0.3,1.0] + 特攻偏移[−0.3,0.8]；弥散 ×1.5；夹 1.4..4.6。 */
        burstRadius: formula(
            F.base(2.0)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .plus(F.stat("specialAttack").minus(55).times(0.006).clamp(-0.3, 0.8))
                .times(F.when(F.pref("disperse"), F.const(1.5), F.const(1)))
                .clamp(1.4, 4.6).round(2),
            "炸落半径", {
                unit: "格",
                description: "光柱砸落时脚下光圈罩住多大一圈；大个子、特攻高、弥散式铺得更开。它也是指示圈半径。"
            }),
        /** 坠落时间：14 − 速度偏移[−3,5] + 等级(≥30)偏移[0,4]；夹 9..22。 */
        fallTicks: seconds(
            F.base(14)
                .minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 5))
                .plus(F.level().minus(30).times(0.1).clamp(0, 4))
                .clamp(9, 22).round(0),
            "坠落时间", "怪光柱从引下到砸中的时间；速度越快落得越急，也决定对手能躲多久。"),
        /** 逃逸距离：5 + 特攻偏移[−1,2] + 高度偏移[−0.2,0.8]；夹 4..8。 */
        leash: formula(
            F.base(5)
                .plus(F.stat("specialAttack").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.2, 0.8))
                .clamp(4, 8).round(1),
            "逃逸距离", {
                unit: "格",
                description: "光柱坠落时目标跑出这么远就砸空；特攻高、体型大的个体光柱追得更紧。"
            }),
        /** 残影时长：50 + 等级(≥30)偏移[0,24] + 特攻偏移[−5,16]；夹 30..120。 */
        dazzleTicks: seconds(
            F.base(50)
                .plus(F.level().minus(30).times(0.8).clamp(0, 24))
                .plus(F.stat("specialAttack").minus(55).times(0.25).clamp(-5, 16))
                .clamp(30, 120).round(0),
            "残影时长", "命中后目标身上怪光残影停留多久；等级与特攻越高留得越久。"),
        /** 光束数：10 + 特攻偏移[−2,6] + 等级(≥30)偏移[0,7]；夹 8..34。 */
        rays: formula(
            F.base(10)
                .plus(F.stat("specialAttack").minus(55).times(0.12))
                .plus(F.level().minus(30).times(0.26))
                .clamp(8, 34).round(),
            "光束数", {
                unit: "束",
                description: "光柱与炸落散出的怪光数量，也驱动表现密度；特攻与等级越高越密。"
            }),
        /** 碾防级数：本招固定 2 级特防，与原生一致。 */
        sunderStages: formula(
            F.base(2),
            "碾防级数", {
                unit: "级",
                description: "被光柱直击时令目标特防下降的能力等级；原生「大幅降低」即固定 2 级。"
            }),
        /** 起手：10 − 速度偏移[−? ,?] + 弥散 2；夹 6..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.04))
                .plus(F.when(F.pref("disperse"), F.const(2), F.const(0)))
                .clamp(6, 14).round(),
            "起手", "把怪光聚到头顶、引下一道光柱的时间；速度越快越短，弥散式多花一点。")
    });

    defineDamage("luminacrash", "core", {});
    defineDamage("luminacrash", "splash", {});

    stages("luminacrash", [
        { level: 40, values: { core: 74, burstRadius: 2.3 } }
    ]);

    describe("luminacrash", [
        { key: "description.0", values: ["core", "sunderStages"] },
        { key: "description.1", values: ["fallTicks", "leash"] },
        { key: "description.2", values: ["burstRadius", "splash"] },
        { key: "disperse.on", values: ["core", "burstRadius", "splash"],
            when: function (context) { return read(context.detail.values, ["disperse"]) === true; } },
        { key: "disperse.off", values: ["core", "burstRadius"],
            when: function (context) { return read(context.detail.values, ["disperse"]) !== true; } },
        { key: "timing", values: ["castRange", "tempo", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.burstRadius"] }
    ]);
}
