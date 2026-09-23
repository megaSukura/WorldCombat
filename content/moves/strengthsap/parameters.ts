/**
 * 吸取力量 / Strength Sap —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Grass／变化／威力 —／命中 100／PP 10／目标相邻单体；
 *   回复自身 HP，数值等于对手的攻击；随后把对手的攻击下降一级。24 位已实装学习者。
 *
 * 世界化：把「吸取对手的力量」落成一记**贴身的一次抽取**——施法者把根须搭上对手，直接从它的肌肉里
 *   吸走一股力气送进自己身体；对手被抽得物攻下降，身上留下「被抽力」的破绽。它和吸取家族不同：
 *   吸取类抽的是生命（伤害的一半转回），而吸取力量抽的是**力气**——不看对手现有多少血，只看它有多壮，
 *   所以对手越强，这一口回得越足，同时被削弱得越明显。没有伤害。
 *
 * 数值为什么依赖这些精灵数据、并分散到不同参数：
 *   drain    汲取比例：**目标的物攻**相对自身物攻的强弱（对手越强于自己，抽回的生命越多）＋ 配置。
 *   weak     削弱级数：等级台阶（老练的个体一次剥得更深）。
 *   latch    破绽时长：等级（越老练，抽力留下的虚弱留得越久）。
 *   reach    抽取距离：速度（手臂伸得快）＋ 身高（够得远）；也是实际射程来源。
 *   motes    力量丝数量：特攻（吸力越强，扯出的丝越多）；它同时是画面里力量丝的发射量。
 *   tempo/aftercast/recharge 速度与等级决定起手、收招与冷却。
 *
 * 配置 `deep`（深吸）双向取舍：开启＝回血 ×1.35、破绽 ×1.2，但起手 +2 刻、够得更近（reach ×0.9）、
 *   冷却 ×1.15；关闭＝收着吸，够得更远、出手与冷却都更快。两向各有适用局面（一口回满 vs. 灵活续航）。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。本招没有伤害段。
 */
namespace PokemonSkills {
    actionParameters.define("strengthsap", {
        /** 汲取比例：0.10 + 物攻差比[−0.4,2]×0.14；深吸 ×1.35；夹 0.08..0.50。 */
        drain: percent(
            F.base(0.10)
                .plus(F.target("stat.attack", text("worldcombat.skill.strengthsap.value.foeAttack"))
                    .minus(F.stat("attack")).div(F.stat("attack").max(1)).clamp(-0.4, 2).times(0.14))
                .times(F.when(F.pref("deep", text("worldcombat.skill.strengthsap.preference.deep")), F.const(1.35), F.const(1)))
                .clamp(0.08, 0.50),
            "汲取比例", "这一口吸回的生命占自身最大生命的比例；对手物攻越强于自己，抽回得越多。深吸式再放大三成半。"),
        /** 削弱级数：1 + 等级(≥45)追加 1；夹 1..2。 */
        weak: formula(
            F.base(1).plus(F.level().gte(45)).clamp(1, 2).round(0),
            "削弱级数", {
                unit: "级",
                description: "对手的物攻等级下降多少；等级高的个体一次剥得更深。"
            }),
        /** 破绽时长：160 + 等级(≥25)偏移[0,160]；深吸 ×1.2；夹 100..360。 */
        latch: seconds(
            F.base(160)
                .plus(F.level().minus(25).times(2).clamp(0, 160))
                .times(F.when(F.pref("deep", text("worldcombat.skill.strengthsap.preference.deep")), F.const(1.2), F.const(1)))
                .clamp(100, 360).round(0),
            "破绽时长", "对手被抽力留下的虚弱持续多久；等级越高留得越久，深吸式再长一点。"),
        /** 抽取距离：3.0 + 速度偏移[−0.3,0.9] + 身高偏移[−0.15,0.5]；深吸 ×0.9；夹 2.2..4.4。 */
        reach: formula(
            F.base(3.0)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.9))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.15, 0.5))
                .times(F.when(F.pref("deep", text("worldcombat.skill.strengthsap.preference.deep")), F.const(0.9), F.const(1)))
                .clamp(2.2, 4.4).round(2),
            "抽取距离", {
                unit: "格",
                description: "根须能搭到多远的对手身上，也是本招的实际射程来源；速度快、身板高的个体够得远，深吸式收得近一点。"
            }),
        /** 力量丝数量：16 + 特攻偏移[0,18]；夹 10..40。 */
        motes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(0, 18)).clamp(10, 40).round(0),
            "力量丝数量", {
                unit: "缕",
                description: "从对手身上扯出的力量丝数量；特攻越高吸力越强、扯得越多，也是画面里丝线的发射量来源。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2] + 深吸 2；夹 5..12。 */
        tempo: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.strengthsap.preference.deep")), F.const(2), F.const(0)))
                .clamp(5, 12).round(0),
            "起手", "把根须搭上对手、开始抽取的时间；速度越快越短，深吸式要多蓄一下。"),
        /** 收招：6 − 速度偏移[−1.5,2]；夹 4..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.5, 2)).clamp(4, 10).round(0),
            "收招", "抽完把根须收回的收势；速度越快越利落。"),
        /** 冷却：30 − 等级(≥25)偏移[0,7]；深吸 ×1.15 / 收吸 ×0.95；夹 18..46。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(25).times(0.14).clamp(0, 7))
                .times(F.when(F.pref("deep", text("worldcombat.skill.strengthsap.preference.deep")), F.const(1.15), F.const(0.95)))
                .clamp(18, 46).round(0),
            "冷却", "两次抽取之间的等待；等级越高回得越快，深吸式更费。")
    });

    stages("strengthsap", [
        { level: 38, values: { motes: 22 } },
        { level: 54, values: { drain: 0.14, weak: 2, latch: 240 } }
    ]);

    describe("strengthsap", [
        { key: "description.0", values: ["reach"] },
        { key: "description.1", values: ["drain"] },
        { key: "description.2", values: ["weak","latch"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.drain", "tier.1.weak", "tier.1.latch"] }
    ]);
}
