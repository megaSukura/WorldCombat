/**
 * 真空波 / vacuumwave —— 参数与伤害段。
 *
 * 原生事实：格斗／特殊／威力 40／命中 100／PP 30／优先度 +1／不接触、无次要效果（Cobblemon 1.8 / Showdown）。
 *   描述「挥动拳头，掀起真空波。必定能够先制攻击」。
 *
 * 翻译：本招把「先制」翻成一记**沿地面扫出去的环形低压**——抡拳把空气抽空，一道真空波贴着地面向前推；
 *   它不接触、按特殊结算，是这一族里唯一的远程与特殊招。真空不只是打人：波面经过的敌人被**抽向施法者**
 *   （真空吸），越轻的身板被拽得越远——它能把逃开的人拉回近身、把散开的敌人扫成一堆。
 *   它身位不动，所以任何时候都能出，也可以在别的招之后立刻补一下。
 *
 * 与场上最像的招分开：音速拳是贴身的一记直拳、只打第一个；水枪是一小口水弹；暗影拳是单体拖拽。
 *   真空波的读法是**一条会把人吸回来的宽波面**：范围宽、非接触、按特攻结算，命中后目标朝你滑。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   wave       波威力：特攻给压力、速度给推速；扩散式每一下更轻。
 *   reach      波的射程：特攻与等级决定推多远，也是射程来源；扩散式更短。
 *   halfWidth  波面半宽：身高决定张多宽；扩散式宽六成。
 *   pace       波面推进：速度决定扫得多急，目标更难走位躲开。
 *   pull       抽吸强度：特攻决定吸力；扩散式摊薄。命中时再按目标体型换算（越轻被拽越远）。
 *   gust       气流数量：特攻与速度驱动，表现按它发射。
 *   tempo/settle/recharge 速度决定节奏；扩散式更慢更费。
 *
 * 配置 `wide`（扩散式）双向取舍：开启＝波面更宽、覆盖更多人、判定更松，但每一下更轻、射程更短、吸力摊薄、
 *   收招与冷却更久；关闭＝窄而集中的一道，吸力足、射得远、回得快。一个换「扫过一片」，一个换「拽住一个打」。
 *
 * 伤害段 `wave` 与参数同名，走共享特殊换算；对手特防、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    export const vacuumwaveId = "vacuumwave";
    export const vacuumwaveScene = "world_combat:move_vacuumwave";
    export const vacuumwaveHitText = "world_combat.move.vacuumwave.text.hit";
    export const vacuumwaveMissText = "world_combat.move.vacuumwave.text.miss";

    actionParameters.define(vacuumwaveId, {
        /** 波威力：40 +（特攻 − 55）× 0.24 [−10,28] +（速度 − 55）× 0.10 [−3,12]；扩散 ×0.8；夹 26..104。 */
        wave: formula(
            F.base(40)
                .plus(F.stat("specialAttack").minus(55).times(0.24).clamp(-10, 28))
                .plus(F.stat("speed").minus(55).times(0.10).clamp(-3, 12))
                .times(F.when(F.pref("wide", text("worldcombat.skill.vacuumwave.preference.wide")), F.const(0.8), F.const(1)))
                .clamp(26, 104).round(1),
            "波威力", {
                unit: "威力",
                description: "真空波正面扫过的伤害；特攻给压力、速度给推速。扩散式每一下更轻。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：7.5 +（特攻 − 55）× 0.05 [−1.5,3.5] +（等级 − 20）× 0.05 [0,2]；扩散 ×0.85；夹 6..13。 */
        reach: formula(
            F.base(7.5)
                .plus(F.stat("specialAttack").minus(55).times(0.05).clamp(-1.5, 3.5))
                .plus(F.level().minus(20).times(0.05).clamp(0, 2))
                .times(F.when(F.pref("wide", text("worldcombat.skill.vacuumwave.preference.wide")), F.const(0.85), F.const(1)))
                .clamp(6, 13).round(1),
            "射程", {
                unit: "格",
                description: "真空波最远推到哪，也是本招的实际射程来源；特攻高、等级高的个体送得更远，扩散式更短。"
            }),
        /** 波面半宽：0.7 +（身高 − 1.4）× 0.25 [−0.15,0.7]；扩散 ×1.6；夹 0.5..2.2。 */
        halfWidth: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.15, 0.7))
                .times(F.when(F.pref("wide", text("worldcombat.skill.vacuumwave.preference.wide")), F.const(1.6), F.const(1)))
                .clamp(0.5, 2.2).round(2),
            "波面半宽", { unit: "格", description: "真空波扫过的走廊有多宽（单边）；身板越大张得越开，扩散式再宽六成。" }),
        /** 波面推进：0.85 +（速度 − 55）× 0.008 [−0.15,0.5]；夹 0.6..1.6。 */
        pace: formula(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.15, 0.5)).clamp(0.6, 1.6).round(2),
            "波面推进", { unit: "格/刻", description: "真空波每刻向前推进多远；速度越快扫得越急，目标越难在波面到达前挪开。" }),
        /** 抽吸强度：0.5 +（特攻 − 55）× 0.004 [−0.1,0.4]；扩散 ×0.7；夹 0.2..1.4。 */
        pull: formula(
            F.base(0.5).plus(F.stat("specialAttack").minus(55).times(0.004).clamp(-0.1, 0.4))
                .times(F.when(F.pref("wide", text("worldcombat.skill.vacuumwave.preference.wide")), F.const(0.7), F.const(1)))
                .clamp(0.2, 1.4).round(2),
            "抽吸强度", { unit: "格", description: "命中后把目标朝自己抽回的距离基数；特攻越高吸力越足，扩散式摊薄。实际位移再按目标体型换算：越轻的身板被拽得越远。" }),
        /** 气流数量：20 +（特攻 − 55）× 0.3 [−4,18] +（速度 − 55）× 0.2 [−3,10]；夹 14..48。 */
        gust: formula(
            F.base(20).plus(F.stat("specialAttack").minus(55).times(0.3).clamp(-4, 18))
                .plus(F.stat("speed").minus(55).times(0.2).clamp(-3, 10)).clamp(14, 48).round(0),
            "气流数量", {
                unit: "点",
                description: "真空波推进与吸入时卷起的气流与尘土数量，也直接驱动画面的发射量；特攻与速度越高越密。"
            }),
        /** 起手：2 −（速度 − 55）× 0.02 [−0.8,1.4]；夹 0..4 刻。 */
        tempo: seconds(
            F.base(2).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.4)).clamp(0, 4).round(0),
            "起手", "从抡拳到波面推出去之间的时间；极短，对手看到的反应窗口就是它。"),
        /** 收招：6 −（速度 − 55）× 0.02 [−0.8,1.5] + 扩散 1；夹 3..9 刻。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.vacuumwave.preference.wide")), F.const(1), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "推完这一道后收拳站稳的时间；扩散式摊得更开，收回得慢一点。"),
        /** 冷却：18 −（速度 − 55）× 0.08 [−2,4] + 扩散 4；夹 11..28 刻。 */
        recharge: seconds(
            F.base(18).minus(F.stat("speed").minus(55).times(0.08).clamp(-2, 4))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.vacuumwave.preference.wide")), F.const(4), F.const(0)))
                .clamp(11, 28).round(0),
            "冷却", "这一道之后多久能再推；速度快的个体回得更快，扩散式更费。")
    });

    defineDamage(vacuumwaveId, "wave", {}, {});

    stages(vacuumwaveId, [
        { level: 20, values: { wave: 50 } },
        { level: 38, values: { wave: 62, reach: 9.5 } }
    ]);

    describe(vacuumwaveId, [
        { key: "description.0", values: ["wave", "halfWidth"] },
        { key: "description.1", values: ["reach", "pace", "pull"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wave"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wave", "tier.1.reach"] }
    ]);
}
