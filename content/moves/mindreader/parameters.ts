/**
 * 心之眼 / Mind Reader 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 5、优先度 0、目标 normal（单体）、
 *   onHit 给施法者加 lockon volatile（持续 2 回合；onSourceAccuracy 恒真，且忽略目标的无敌状态）。
 *
 * 世界化：即时战场没有回合制的「命中判定」，所以把「下一次必定打中」翻译成**读穿对手的动作、把自己的准星
 *   拉满**：提交后施法者身上留住一层读窗口（身份 world_combat:status/mindreader），窗口内命中等级被拉到满
 *   （共享 NativeSemantics.aim 的精度因此恒为满值，引导类招式不再偏），同时目标被 minecraft:glowing 照亮、
 *   藏在掩体后也能看见。下一次伤害命中时这层读用掉、命中等级原样收回；不出手则随时间褪去。
 *   反制：对手可以在读还在时退出射程、用清除类效果解掉、或让这一击落空（读只在命中时兑现）。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   readTicks   读窗口：基础 160 刻 + 等级 × 2.5 + 亲密度 × 0.5，预读 ×1.6／速读 ×0.7，夹 100..420。
 *   focus       命中等级：固定 6（拉满）——这是这招的身份，不是成长点。
 *   reveal      照亮时长：基础 90 刻 + 等级 × 2，预读 ×1.4，夹 60..300；目标被读穿可见。
 *   motes       读光量：基础 14 + 特攻 × 0.12，预读 ×1.2，夹 10..40；心神越盛，画面里的读光越多。
 *   tempo       起手：基础 8 − (速度 − 60) × 0.02（只取正值），预读 +3，夹 5..13。
 *   aftercast   收招：基础 5 + 碰撞箱高度 × 1.2，夹 4..9。
 *   recharge    冷却：基础 92 − 等级 × 0.3，预读 +20／速读 −10，夹 60..140。PP 5。
 *   reach       读的距离：基础 5 + 碰撞箱高度 × 0.7，夹 4..9；身板越高，视线伸得越远。
 * 配置 predict（预读）双向取舍：开启＝窗口 ×1.6、照亮 ×1.4、读光更盛，但起手 +3、冷却 +20（一次长读）；
 *   关闭＝窗口更短、冷却更短（频繁速读）。PP 只有 5，长读与速读的取舍直接落在资源上。
 */
namespace PokemonSkills {
    export const mindreaderId = "mindreader";
    export const mindreaderScene = "world_combat:move_mindreader";
    export const mindreaderEffect = "world_combat:mindreader_eyes";
    export const mindreaderMark = "world_combat:mindreader_mark";
    export const mindreaderStatus = "mindreader";
    export const mindreaderReadyText = "world_combat.move.mindreader.text.ready";
    export const mindreaderReadText = "world_combat.move.mindreader.text.read";
    export const mindreaderFadeText = "world_combat.move.mindreader.text.fade";

    actionParameters.define(mindreaderId, {
        readTicks: seconds(
            F.base(160).plus(F.level().times(2.5)).plus(F.individual("friendship").times(0.5))
                .times(F.when(F.pref("predict", text("worldcombat.skill.mindreader.preference.predict")), F.const(1.6), F.const(0.7)))
                .clamp(100, 420).round(0),
            "读窗口", "这层读留在身上多久；等级与亲密度延长它，预读明显更长；命中兑现或走完即散。"),
        focus: formula(
            F.const(6).round(0),
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
                description: "读线与眼睛光点的数量；特攻越高越多，画面里的读光与它一致。"
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
                description: "能读到对手的距离；身板越高视线伸得越远，也是玩家瞄准能接受的范围。"
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
