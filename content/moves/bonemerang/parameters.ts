/**
 * 骨头回力镖 / bonemerang 的参数与伤害段。
 *
 * 原生事实：地面、物理、威力 50、命中 90、PP 10、优先度 0、连续 2 次（`multihit: 2`）、无接触；
 * 原文「掷出手里的骨头，骨头绕一圈，去与回各打一次」。全招 3 位学习者（卡拉卡拉一族）。
 *
 * 翻译：把「去一回」翻成**同一根骨头的一次往返**——骨头从手里飞出去打到目标（`out` 段），绕到身后再飞回手里，
 *   回程再打一次（`back` 段）。两段各走共享伤害换算，所以「来回 2 次」是两次真实结算，不是把威力翻倍。
 *   骨头是留在地上的活物：它是一根能被看到、跟着走、真的会回到手里的骨头（持久实体）；投出去后目标横向走开，
 *   回程就够不到它，这是命中率 90% 的即时读法。原生的回合制两次命中被翻成一次往返里两个可躲的窗口。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距因此能看出不同）：
 *   out      去程威力：物攻定掷出的力道、速度定出手的鞭甩。
 *   back     回程威力：物攻定骨头回来的势、体重定回旋的沉。
 *   flight   骨头飞行速度：速度派生，配置让弧线更慢。
 *   throwRange 投掷距离：等级与速度决定能投多远；配置的弧线更远。
 *   overshoot 越过目标多远才折返：碰撞箱宽度；配置的弧线更远。
 *   bow      折返途中向侧面摆开多少：由配置决定（弧线的宽窄）。
 *   hitRadius 骨头判定：身高决定骨头扫到的范围。
 *   catchRadius 折返时的「擦到」半径：体型决定，保证来回两下都能算数。
 *   boneHealth 骨头耐久：等级；被打碎时骨头落地。
 *   spin     骨屑点数：物攻派生，表现按它发射。
 *   tempo/recover/recharge：速度与配置共同决定起手、收招与冷却。
 *
 * 配置 `arc`（回旋弧）双向取舍：开启＝越目标更远、向侧面摆得更开、飞得更慢、去程轻 15% / 回程重 20%、
 *   冷却更久——画出一个更明显的大回旋，回程更重但更难命中；关闭（直去直回）＝更快、更平、两段更均匀、
 *   冷却更短——更稳，但没有回程的加成。两个方向各有适用局面。
 *
 * 伤害段 `out` 与 `back` 各走共享换算（对手防御、相性、暴击在命中时另算）；两者都不是接触。
 */
namespace PokemonSkills {
    actionParameters.define("bonemerang", {
        /** 去程威力：22 + 物攻偏移[−4,14] + 速度偏移[−2,6]；弧线 ×0.85；夹 14..44。 */
        out: formula(
            F.base(22)
                .plus(F.stat("attack").minus(45).times(0.09).clamp(-4, 14))
                .plus(F.stat("speed").minus(45).times(0.04).clamp(-2, 6))
                .times(F.when(F.pref("arc", text("worldcombat.skill.bonemerang.preference.arc")), F.const(0.85), F.const(1)))
                .clamp(14, 44).round(1),
            "去程威力", {
                unit: "威力",
                description: "骨头飞出时那一下的威力；物攻定掷出的力道、速度定出手的鞭甩。弧线配置把它摊薄，因为力气分给了绕行。对手防御、相性与暴击在命中时另算。"
            }),
        /** 回程威力：25 + 物攻偏移[−5,16] + 体重偏移[−2,8]；弧线 ×1.2；夹 16..52。 */
        back: formula(
            F.base(25)
                .plus(F.stat("attack").minus(45).times(0.10).clamp(-5, 16))
                .plus(F.body("weight").minus(40).times(0.02).clamp(-2, 8))
                .times(F.when(F.pref("arc", text("worldcombat.skill.bonemerang.preference.arc")), F.const(1.2), F.const(1)))
                .clamp(16, 52).round(1),
            "回程威力", {
                unit: "威力",
                description: "骨头绕回来那一下的威力；物攻定回来的势、体重让回旋更沉。弧线配置把回程加重，因为绕行一圈攒了力。两段都命中时约等于一次完整的骨头回力镖。"
            }),
        /** 飞行速度：0.95 + 速度偏移[−0.12,0.3]；弧线 ×0.82；夹 0.65..1.35。 */
        flight: formula(
            F.base(0.95).plus(F.stat("speed").minus(45).times(0.006).clamp(-0.12, 0.3))
                .times(F.when(F.pref("arc", text("worldcombat.skill.bonemerang.preference.arc")), F.const(0.82), F.const(1)))
                .clamp(0.65, 1.35).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "骨头飞出去的速度；速度快的个体掷得更急、更难躲。弧线配置飞得更慢，给对手更多走位余地。"
            }),
        /** 投掷距离：7.5 + 等级≥25偏移[0,3] + 速度偏移[−1,1.5]；弧线 ×1.15；夹 6..14。 */
        throwRange: formula(
            F.base(7.5)
                .plus(F.level().minus(25).times(0.1).clamp(0, 3))
                .plus(F.stat("speed").minus(45).times(0.03).clamp(-1, 1.5))
                .times(F.when(F.pref("arc", text("worldcombat.skill.bonemerang.preference.arc")), F.const(1.15), F.const(1)))
                .clamp(6, 14).round(2),
            "投掷距离", {
                unit: "格",
                description: "骨头能投多远；等级越高、出手越快投得越远。它也是本招的实际射程来源。"
            }),
        /** 越过目标：0.9 + 碰撞箱宽度偏移[−0.15,0.7]；弧线 ×1.5；夹 0.6..2.2。 */
        overshoot: formula(
            F.base(0.9).plus(F.body("width").minus(0.9).times(0.5).clamp(-0.15, 0.7))
                .times(F.when(F.pref("arc", text("worldcombat.skill.bonemerang.preference.arc")), F.const(1.5), F.const(1)))
                .clamp(0.6, 2.2).round(2),
            "越过距离", {
                unit: "格",
                description: "骨头越过目标多远才开始折返；身体越宽、越长的骨头多冲一段。越远折返越晚，回程的窗口也越靠后。"
            }),
        /** 回旋摆幅：弧线 1.0 格 / 直去直回 0.3 格；夹 0..1.2。 */
        bow: formula(
            F.when(F.pref("arc", text("worldcombat.skill.bonemerang.preference.arc")), F.const(1.0), F.const(0.3)).clamp(0, 1.2).round(2),
            "回旋摆幅", {
                unit: "格",
                description: "去程越过目标时向侧面摆开多少，决定这条回旋弧有多宽；摆得越开去程越容易偏开目标，全靠折返那一下补回来。"
            }),
        /** 骨头判定：0.7 + 身高偏移[−0.05,0.35]；夹 0.55..1.1。 */
        hitRadius: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.35)).clamp(0.55, 1.1).round(2),
            "骨头判定", {
                unit: "格",
                description: "骨头擦到目标多大范围算命中；大个子掷出的骨头扫过面更大。"
            }),
        /** 折返擦到半径：1.5 + 碰撞箱宽度偏移[−0.2,0.7]；夹 1.2..2.2。 */
        catchRadius: formula(
            F.base(1.5).plus(F.body("width").minus(0.9).times(0.5).clamp(-0.2, 0.7)).clamp(1.2, 2.2).round(2),
            "折返擦到半径", {
                unit: "格",
                description: "折返点附近多大的范围算这一趟掠过了目标；保证去与回各打一下，而目标整段走开仍会两下都空。"
            }),
        /** 骨头耐久：12 + 等级≥25偏移[0,14]；夹 10..30。 */
        boneHealth: formula(
            F.base(12).plus(F.level().minus(25).times(0.45).clamp(0, 14)).clamp(10, 30).round(0),
            "骨头耐久", {
                unit: "点",
                description: "投出的骨头有多少耐久；等级越高越硬。骨头被打碎时结束飞行、落在地上。"
            }),
        /** 骨屑点数：18 + 物攻偏移[−4,18]；夹 14..40。 */
        spin: formula(
            F.base(18).plus(F.stat("attack").minus(45).times(0.14).clamp(-4, 18)).clamp(14, 40).round(0),
            "骨屑点数", {
                unit: "点",
                description: "骨头旋转与命中时迸出的骨屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：7 − 速度偏移[−1,2]；夹 4..10。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(45).times(0.02).clamp(-1, 2)).clamp(4, 10).round(0),
            "起手", "拔骨、拧身到能掷出的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−1,1.5]；夹 4..9。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(45).times(0.015).clamp(-1, 1.5)).clamp(4, 9).round(0),
            "收招", "掷出后的收势；速度越快收得越快。"),
        /** 冷却：32 − 速度偏移[−2,5]；弧线 +6；夹 20..46。 */
        recharge: seconds(
            F.base(32).minus(F.stat("speed").minus(45).times(0.05).clamp(-2, 5))
                .plus(F.when(F.pref("arc", text("worldcombat.skill.bonemerang.preference.arc")), F.const(6), F.const(0)))
                .clamp(20, 46).round(0),
            "冷却", "再接一次骨头前的等待；速度越快回得越快，弧线更久。PP 10 的代价。")
    });

    stages("bonemerang", [
        { level: 28, values: { out: 27, back: 30 } },
        { level: 46, values: { out: 33, back: 37, throwRange: 9 } }
    ]);

    defineDamage("bonemerang", "out", {}, { contact: false });
    defineDamage("bonemerang", "back", {}, { contact: false });

    describe("bonemerang", [
        { key: "description.0", values: ["out", "flight", "throwRange"] },
        { key: "description.1", values: ["back", "hitRadius", "catchRadius", "overshoot", "bow"] },
        { key: "description.2", values: ["boneHealth"] },
        { key: "arc.on", values: [], when: function (context) { return read(context.detail.values, ["arc"]) === true; } },
        { key: "arc.off", values: [], when: function (context) { return read(context.detail.values, ["arc"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.out", "tier.0.back"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.out", "tier.1.back", "tier.1.throwRange"] }
    ]);
}
