/**
 * 爱心印章 / heartstamp —— 参数与伤害段。
 *
 * 原生事实：Psychic／物理／威力 60／命中 100／PP 25／目标单体／30% 畏缩／contact。
 *
 * 翻译：把「以可爱的动作使对手疏忽，乘机给出强烈的一击」拆成两拍——先认真卖一次萌，让目标进入一段
 * 破绽窗口（本单元发明的共享身份 `world_combat:status/offguard`，物品栏可见），再扑上去补一记重击；
 * 如果补击时目标还在窗口里，就「乘机」打得更重、更容易把它震懵。窗口很短，离得远等冲过去就过期了。
 *
 * 与同族的区分：麻麻刺刺是一路带着电撞上去（电荷在位移里积累）；爱心印章是先骗、再打，
 *   胜负手在于那一记补击有没有落在破绽窗口里。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   stamp        基础一击威力 52 + 物攻偏移 + 体重偏移；心机 ×0.86 / 直球 ×1.16。
 *   seize        乘机威力倍率 1.30 + 等级偏移；心机 +0.25；命中时若目标仍带疏忽则乘上它。
 *   startle      乘机畏缩倍率 1.50 + 心机 +0.5；乘机命中时乘在畏缩几率上。
 *   charmTicks   疏忽窗口 32 刻 + 心机 +24 + 等级偏移（窗口越长越能等，也越容易被躲开）。
 *   feint        卖萌到扑击之间的间隔 7 刻 − 速度偏移 + 心机 3；它也是起手时长的来源。
 *   lunge        扑击距离 3.4 格 + 物攻偏移 + 等级偏移；它决定这一记能追上的目标。
 *   pace         扑击速度 0.75 格/刻 + 速度偏移（手快的补击更急）。
 *   radius       接触判定 0.55 格 + 体型高度偏移。
 *   flinchChance 畏缩几率 0.30（原生）+ 物攻偏移；心机 ×0.85（心机把收益放进乘机项）。
 *   flinchTicks  畏缩持续 15 刻 + 等级偏移。
 *   settle       收招 7 刻，扑完站定。
 *   recharge     冷却 22 刻 − 速度偏移 + 心机 4。
 *
 * 配置 `guile`（心机）：开启＝把力气花在骗上——卖萌更久、窗口更长、乘机加成更高，但基础一击更轻；
 *   关闭＝直球，基础一击更重、起手更快，但乘机收益更小。两向各有适用局面。
 *
 * 伤害段 `stamp` 与参数同名，走共享换算（原生类别 Physical，Psychic 属性）。畏缩由本单元的
 * `world_combat:heartstamp_flinch` 承载，带共享身份 `world_combat:status/flinch`。
 */
namespace PokemonSkills {
    actionParameters.define("heartstamp", {
        /** 基础一击：52 + 物攻偏移[−14,28] + 体重偏移[−5,9]；心机 ×0.86 / 直球 ×1.16；夹 32..100。 */
        stamp: formula(
            F.base(52)
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-14, 28))
                .plus(F.body("weight").minus(300).times(0.004).clamp(-5, 9))
                .times(F.when(F.pref("guile"), F.const(0.86), F.const(1.16)))
                .clamp(32, 100).round(1),
            "基础一击", {
                unit: "威力",
                description: "扑上去那一下的基础威力；物攻越高、身体越沉越重。若命中时目标仍处在卖萌的疏忽窗口里，会再乘上乘机倍率；对手防御、相性与暴击在命中时另算。"
            }),
        /** 乘机威力倍率：1.30 + 等级偏移[0,0.25] + 心机 0.25；夹 1.15..1.9。 */
        seize: percent(
            F.base(1.30).plus(F.level().minus(30).times(0.006).clamp(0, 0.25))
                .plus(F.when(F.pref("guile"), F.const(0.25), F.const(0))).clamp(1.15, 1.9).round(2),
            "乘机威力倍率", "命中时目标仍带着「疏忽」的话，这一击的威力乘上这个倍率；等级越高、心机越足乘得越多。"),
        /** 乘机畏缩倍率：1.50 + 心机 0.5；夹 1.2..2.2。 */
        startle: percent(
            F.base(1.50).plus(F.when(F.pref("guile"), F.const(0.5), F.const(0))).clamp(1.2, 2.2).round(2),
            "乘机畏缩倍率", "乘机命中时，畏缩几率乘上这个倍率；心机把这个优势再放大。"),
        /** 疏忽窗口：32 + 心机 24 + 等级偏移[0,20]；夹 24..90。 */
        charmTicks: seconds(
            F.base(32).plus(F.when(F.pref("guile"), F.const(24), F.const(0)))
                .plus(F.level().minus(30).times(0.5).clamp(0, 20)).clamp(24, 90).round(0),
            "疏忽窗口", "卖萌后目标放开警惕的时间；窗口里扑到才算乘机。心机把它拉长，等级也让它更久。"),
        /** 起手：8 − 速度偏移[−2,3] + 心机 2；夹 5..14。 */
        wink: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("guile"), F.const(2), F.const(0))).clamp(5, 14).round(0),
            "起手", "从读出招式到放出爱心的时间；速度快的个体更快出手，心机多花一点。"),
        /** 卖萌间隔：7 − 速度偏移[−1,2] + 心机 3；夹 5..14。 */
        feint: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("guile"), F.const(3), F.const(0))).clamp(5, 14).round(0),
            "卖萌间隔", "从放出爱心到扑上去之间的时间；这段时间里目标可以走开或先出手打断。"),
        /** 扑击距离：3.4 + 物攻偏移[−0.5,1.4] + 等级偏移[0,1];夹 2.4..6。 */
        lunge: formula(
            F.base(3.4).plus(F.stat("attack").minus(60).times(0.02).clamp(-0.5, 1.4))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1)).clamp(2.4, 6).round(2),
            "扑击距离", {
                unit: "格",
                description: "卖萌后能扑出多远去补这一记；物攻与等级越高追得越远，也是本招的实际射程来源。"
            }),
        /** 扑击速度：0.75 + 速度偏移[−0.12,0.35]；夹 0.5..1.3。 */
        pace: formula(
            F.base(0.75).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.12, 0.35)).clamp(0.5, 1.3).round(2),
            "扑击速度", {
                unit: "格/刻",
                description: "扑上去每刻移动的距离；速度快的个体补击更急，目标更难在窗口里走开。"
            }),
        /** 接触判定：0.55 + 身高偏移[−0.1,0.35]；夹 0.4..1.2。 */
        radius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.35)).clamp(0.4, 1.2).round(2),
            "接触判定", {
                unit: "格",
                description: "扑击途中能撞到多大一圈；个子大的个体扑得更宽。"
            }),
        /** 畏缩几率：0.30 + 物攻偏移[−0.05,0.10]；心机 ×0.85；夹 0.15..0.45。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.05, 0.10))
                .times(F.when(F.pref("guile"), F.const(0.85), F.const(1))).clamp(0.15, 0.45),
            "畏缩几率", "命中的基础畏缩几率（原生 30%）；物攻越高越容易把人拍懵，心机把收益移到了乘机项。"),
        /** 畏缩持续：15 + 等级偏移[0,5]；夹 12..22。 */
        flinchTicks: seconds(
            F.base(15).plus(F.level().minus(30).times(0.12).clamp(0, 5)).clamp(12, 22).round(0),
            "畏缩持续", "被拍懵的人在这段时间内无法开始新动作；等级越高愣得越久。"),
        /** 收招：7 刻；扑完站定。 */
        settle: seconds(F.base(7).clamp(4, 12).round(0), "收招", "扑击结束后收住的时间。"),
        /** 冷却：22 − 速度偏移[−2,4] + 心机 4；夹 14..34。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.08).clamp(-2, 4))
                .plus(F.when(F.pref("guile"), F.const(4), F.const(0))).clamp(14, 34).round(0),
            "冷却", "这一次补击之后多久能再卖一次萌；速度快的个体回得更快，心机更费。")
    });

    defineDamage("heartstamp", "stamp", {});

    stages("heartstamp", [
        { level: 30, values: { stamp: 66 } },
        { level: 45, values: { stamp: 78, lunge: 4.2, flinchChance: 0.38 } }
    ]);

    describe("heartstamp", [
        { key: "description.0", values: ["stamp","seize"] },
        { key: "description.1", values: ["flinchChance","flinchTicks","startle"] },
        { key: "description.2", values: ["charmTicks","feint"] },
        { key: "description.3", values: ["lunge","pace","radius"] },
        { key: "guile.on", values: [], when: function (context) { return read(context.detail.values, ["guile"]) === true; } },
        { key: "guile.off", values: [], when: function (context) { return read(context.detail.values, ["guile"]) !== true; } },
        { key: "timing", values: ["range", "wink", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.stamp"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.stamp", "tier.1.lunge", "tier.1.flinchChance"] }
    ]);
}
