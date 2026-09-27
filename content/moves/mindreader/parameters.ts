/** A finite read against one target. Precision affects that pairing; movement hints follow observed velocity. */
namespace PokemonSkills {
    export const mindreaderId = "mindreader";
    export const mindreaderScene = "world_combat:move_mindreader";
    export const mindreaderTrendScene = "world_combat:move_mindreader_trend";
    export const mindreaderEffect = "world_combat:mindreader_eyes";
    export const mindreaderMark = "world_combat:mindreader_mark";
    export const mindreaderStatus = "mindreader";
    export const mindreaderReadyText = "world_combat.move.mindreader.text.ready";
    export const mindreaderReadText = "world_combat.move.mindreader.text.read";
    export const mindreaderFadeText = "world_combat.move.mindreader.text.fade";
    /** 读势采样的固定协议：每 pulse 刻采一次，外推 trend 刻速度，长度封顶 cap 格。 */
    export const mindreaderPulse = 4;
    export const mindreaderTrend = 6;
    export const mindreaderTrendCap = 3;
    export const mindreaderMoveEpsilon = 0.02;

    actionParameters.define(mindreaderId, {
        readTicks: seconds(
            F.base(160).plus(F.level().times(2.5)).plus(F.individual("friendship").times(0.5))
                .times(F.when(F.pref("predict", text("worldcombat.skill.mindreader.preference.predict")), F.const(1.6), F.const(0.7)))
                .clamp(100, 420).round(0),
            "读窗口", "这层读留在身上多久；等级与亲密度延长它，预读明显更长；命中兑现或走完即散。"),
        focus: formula(
            F.const(6).clamp(1, 6).round(0),
            "命中等级", {
                unit: " 级",
                description: "仅对所读目标按这一命中等级判定；其他目标沿用自己的实际命中等级。"
            }),
        reveal: seconds(
            F.base(90).plus(F.level().times(2))
                .times(F.when(F.pref("predict", text("worldcombat.skill.mindreader.preference.predict")), F.const(1.4), F.const(1)))
                .clamp(60, 300).round(0),
            "照亮时长", "目标被读穿、在掩体后也可见的时长；等级越高越久，预读更长。"),
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").times(0.12))
                .times(F.when(F.pref("predict", text("worldcombat.skill.mindreader.preference.predict")), F.const(1.2), F.const(1)))
                .clamp(10, 40).round(0),
            "读光量", {
                unit: " 点",
                description: "读势虚线与眼睛光点的数量；特攻越高越多，画面里的趋势线与读光越密。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("predict", text("worldcombat.skill.mindreader.preference.predict")), F.const(3), F.const(0)))
                .clamp(5, 13).round(0),
            "起手", "凝神读穿对手需要多久；速度越快越短，预读多花几刻。"),
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(4, 9).round(0),
            "收招", "读定之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(92).minus(F.level().times(0.3))
                .plus(F.when(F.pref("predict", text("worldcombat.skill.mindreader.preference.predict")), F.const(20), F.const(-10)))
                .clamp(60, 140).round(0),
            "冷却", "两次心之眼之间的等待；等级越高越熟练，预读更费力。PP 5。"),
        reach: formula(
            F.base(5).plus(F.body("height").times(0.7)).clamp(4, 9).round(1),
            "读距离", {
                unit: " 格",
                description: "能读到对手的距离；身板越高视线伸得越远，也是玩家瞄准与伙伴接近共用的范围。"
            })
    });

    describe(mindreaderId, [
        { key: "description.0", values: ["focus", "readTicks"] },
        { key: "description.1", values: ["reveal"] },
        { key: "description.3", values: [] },
        { key: "predict.on", values: ["tempo", "recharge"], when: function (context) { return read(context.detail.values, ["predict"]) === true; } },
        { key: "predict.off", values: [], when: function (context) { return read(context.detail.values, ["predict"]) !== true; } },
        { key: "description.2", values: ["reach", "tempo", "aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
