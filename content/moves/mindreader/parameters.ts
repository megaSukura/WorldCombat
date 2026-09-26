/**
 * 心之眼 / Mind Reader 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 5、优先度 0、目标 normal（单体）、
 *   onHit 给施法者加 lockon volatile（持续 2 回合；onSourceAccuracy 恒真，且忽略目标的无敌状态）。
 *
 * 世界化：即时战场没有回合制的「命中判定」，把它翻译成**看清对手正在朝哪里走，再用一次更准的攻击兑现读势**：
 *   提交后施法者身上留住一层读窗口（身份 world_combat:status/mindreader），短期照亮目标，并把命中等级由一段
 *   boostWindow 抬起（共享 NativeSemantics.aim 的精度因此提高）。窗口期间每 4 刻采一次目标的真实
 *   `observe().velocity()`，在它当前位置到约 6 刻速度外推点之间画一条短趋势虚线（长度封顶 3 格，遇实墙截断，
 *   静止则收成一点）；趋势线只表达当前运动趋势，不预测未来动作。
 *   兑现：只有打中**所读的那个目标**、且造成真实伤害时，这层读才被用掉并收回命中等级；攻击其他目标不兑现。
 *   反制：读到期、被清除，或目标失效/离场时，读势收起、命中等级随窗口原样收回。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   readTicks   读窗口：基础 160 刻 + 等级 × 2.5 + 亲密度 × 0.5，预读 ×1.6／速读 ×0.7，夹 100..420。
 *   focus       命中等级：基础 6（拉满），夹 1..6——读势只抬命中，不叠别的机制。
 *   reveal      照亮时长：基础 90 刻 + 等级 × 2，预读 ×1.4，夹 60..300；目标被读穿可见。
 *   motes       读光量：基础 14 + 特攻 × 0.12，预读 ×1.2，夹 10..40；心神越盛，趋势虚线与读光越密。
 *   tempo       起手：基础 8 − (速度 − 60) × 0.02（只取正值），预读 +3，夹 5..13。
 *   aftercast   收招：基础 5 + 碰撞箱高度 × 1.2，夹 4..9。
 *   recharge    冷却：基础 92 − 等级 × 0.3，预读 +20／速读 −10，夹 60..140。PP 5。
 *   reach       读的距离：基础 5 + 碰撞箱高度 × 0.7，夹 4..9；执行与 AI 都对同一 resolve 结果取值。
 * 配置 predict（预读）双向取舍：开启＝窗口 ×1.6、照亮 ×1.4、读光更盛，但起手 +3、冷却 +20（一次长读）；
 *   关闭＝窗口更短、冷却更短（频繁速读）。PP 只有 5，长读与速读的取舍直接落在资源上。
 */
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
                description: "读心窗口内施放者达到的命中等级，提高攻击命中率。"
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
