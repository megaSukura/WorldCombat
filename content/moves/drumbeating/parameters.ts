/** Finite ground roots travel to each beat; the final successful beat briefly binds. */
namespace PokemonSkills {
    actionParameters.define("drumbeating", {
        /** 每拍威力：22 + 物攻偏移[−3,10]；深根 ×0.85；夹 14..38。 */
        beat: formula(
            F.base(22).plus(F.stat("attack").minus(70).times(0.13).clamp(-3, 10))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drumbeating.preference.deep")), F.const(0.85), F.const(1)))
                .clamp(14, 38).round(1),
            "每拍威力", {
                unit: "威力",
                description: "前几拍根须破土的基础威力；物攻越高越重，深根把力道分给之后的地面控制。对手防御、相性与暴击在命中时另算。"
            }),
        /** 末拍威力：40 + 物攻偏移[−6,20] + 等级(≥30)偏移[0,10]；深根 ×0.85；夹 28..92。 */
        final: formula(
            F.base(40).plus(F.stat("attack").minus(70).times(0.28).clamp(-6, 20))
                .plus(F.level().minus(30).times(0.4).clamp(0, 10))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drumbeating.preference.deep")), F.const(0.85), F.const(1)))
                .clamp(28, 92).round(1),
            "末拍威力", {
                unit: "威力",
                description: "最后一拍根须缠上腿脚时的威力；物攻与等级共同决定。对手防御、相性与暴击在命中时另算。"
            }),
        /** 拍数：3 + 速度 ≥ 120；夹 3..4。 */
        beats: formula(
            F.base(3).plus(F.stat("speed").gte(120)).clamp(3, 4).round(0),
            "鼓点拍数", {
                unit: "拍",
                description: "这一轮敲几下鼓；速度足够快的个体多敲一拍。每一拍都是一道独立的根须波峰。"
            }),
        /** 拍间隔：8 − 速度偏移[−1,3]；夹 5..10。 */
        interval: seconds(
            F.base(8).minus(F.stat("speed").minus(70).times(0.02).clamp(-1, 3)).clamp(5, 10).round(0),
            "拍间隔", "鼓点之间的间隔；速度越快敲得越密。它也是这一招的节奏。"),
        /** 根须距离：10.5 + 物攻偏移[−1,1.5] + 等级(≥30)偏移[0,1.5]；夹 10.3..12.6。 */
        reach: formula(
            F.base(10.5).plus(F.stat("attack").minus(70).times(0.02).clamp(-1, 1.5))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1.5)).clamp(10.3, 12.6).round(1),
            "根须距离", {
                unit: "格",
                description: "根须的波峰能沿地面冲到多远的目标；物攻与等级越高走得越远。它也是本招的实际射程来源。"
            }),
        /** 波峰速度：0.6 + 速度偏移[−0.1,0.3]；夹 0.5..0.9。 */
        wavePace: formula(
            F.base(0.6).plus(F.stat("speed").minus(70).times(0.004).clamp(-0.1, 0.3)).clamp(0.5, 0.9).round(2),
            "波峰速度", {
                unit: "格/刻",
                description: "根须波峰沿地面推进的速度；速度快的个体冲得更急，目标更难在波峰到达前走开。"
            }),
        /** 破土半径：1.1 + 等级(≥30)偏移[0,0.4]；深根 ×1.35；夹 1.0..2.2。 */
        beatRadius: formula(
            F.base(1.1).plus(F.level().minus(30).times(0.02).clamp(0, 0.4))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drumbeating.preference.deep")), F.const(1.35), F.const(1)))
                .clamp(1.0, 2.2).round(2),
            "破土半径", {
                unit: "格",
                description: "根须在目标脚下破土、波及旁人的半径；等级越高、深根越宽。它也是指示圈与判定环的半径。"
            }),
        /** 末拍掉速等级：1 + 深根 1；夹 1..2。 */
        slowStages: formula(
            F.base(1).plus(F.when(F.pref("deep", text("worldcombat.skill.drumbeating.preference.deep")), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "掉速等级", {
                unit: "级",
                description: "末拍根须缠住腿脚后下降的速度能力等级；深根多压一级（对其他战斗者落到移动速度属性）。"
            }),
        /** rootbound 时长：60 + 等级(≥30)偏移[0,40] + 物攻偏移[−4,10]；深根 ×1.35；夹 50..200。 */
        bindTicks: seconds(
            F.base(60).plus(F.level().minus(30).times(1.4).clamp(0, 40)).plus(F.stat("attack").minus(70).times(0.3).clamp(-4, 10))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drumbeating.preference.deep")), F.const(1.35), F.const(1)))
                .clamp(50, 200).round(0),
            "缠根时长", "rootbound 身份挂多久，也是腿脚被根须缠住画面的持续时间；等级与物攻越高缠得越久，深根更久。"),
        /** 缠腿定身：8 + 深根 5；夹 6..20。 */
        rootTicks: seconds(
            F.base(8).plus(F.when(F.pref("deep", text("worldcombat.skill.drumbeating.preference.deep")), F.const(5), F.const(0)))
                .clamp(6, 20).round(0),
            "缠腿定身", "末拍破土时目标腿脚被根须别住一瞬（rooted）；深根更久。"),
        /** 根块数：6 + 等级(≥30)偏移[0,6]；深根 ×1.3；夹 4..16。 */
        rootCells: formula(
            F.base(6).plus(F.level().minus(30).times(0.2).clamp(0, 6))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drumbeating.preference.deep")), F.const(1.3), F.const(1)))
                .clamp(4, 16).round(0),
            "短根纹数量", {
                unit: "块",
                description: "束缚期间可见的短根纹数量；等级和深根选项决定细节密度。"
            }),
        /** 鼓点粒数：10 + 物攻偏移[−1,6] + 等级(≥30)偏移[0,6]；夹 8..28。 */
        notes: formula(
            F.base(10).plus(F.stat("attack").minus(70).times(0.15).clamp(-1, 6))
                .plus(F.level().minus(30).times(0.15).clamp(0, 6)).clamp(8, 28).round(0),
            "鼓点粒数", {
                unit: "个",
                description: "每拍鼓点上扬的音粒与草屑数量，也驱动表现的密度；物攻与等级越高越多。"
            }),
        /** 起手：12 − 速度偏移[−1,4]；夹 8..16。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(70).times(0.05).clamp(-1, 4)).clamp(8, 16).round(0),
            "起手", "抬手、落槌、听准鼓点的时间；速度越快越短。")
    });

    defineDamage("drumbeating", "beat", {});
    defineDamage("drumbeating", "final", {});

    stages("drumbeating", [
        { level: 36, values: { final: 62 } },
        { level: 54, values: { final: 76, bindTicks: 112 } }
    ]);

    describe("drumbeating", [
        { key: "description.0", values: ["beat", "final", "beats", "interval"] },
        { key: "description.1", values: ["reach","wavePace","beatRadius"] },
        { key: "description.2", values: ["slowStages","bindTicks","rootTicks","rootCells"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.final"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.final", "tier.1.bindTicks"] }
    ]);
}
