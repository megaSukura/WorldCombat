/**
 * 咬碎 / crunch —— 参数、数值来源与伤害段。
 *
 * 原生事实：Dark／物理／威力 80／命中 100／PP 15／接触、咬击（bite）／20% 让目标防御下降 1 级
 * （Cobblemon 1.8，201 位学习者）。
 *
 * 翻译：把「用利牙咬碎对手」落成一记**咬住不松、把护甲压塌**的重咬。它不是快速的一口：扑上去咬实后
 * 牙关继续研磨一小会儿（第二段伤害 `chew`），磨完那一下护甲才塌，防御下降并留下破防身份
 * `world_combat:status/guardbroken`——本招是全族里唯一"咬开缺口"的起手，别的招（例如撕裂爪）可以接着吃这道身份。
 * 獠牙专门对付硬壳：本段的防御系数比惯例低（`defenceCoefficient` 0.004），所以它比同威力的招更咬得动高防目标。
 *
 * 与同族分开：咬住把人拽近、必杀门牙钳住猛甩、愤怒门牙削掉一半生命；只有咬碎在命中后**研磨**并留下破防缺口。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   fang         咬合威力 80 + 物攻偏移 + 等级偏移；碾压式 ×0.92 / 疾咬式 ×1.08。
 *   chew         研磨伤害 18 + 物攻偏移 + 体重偏移（身沉牙重）；靠研磨把护甲碾碎。
 *   reach        扑咬距离 2.1 + 速度偏移；也是实际射程来源。
 *   lunge        扑咬速度 0.74 + 速度偏移。
 *   grip         咬合判定 0.44 + 身高偏移。
 *   grindTicks   研磨时长 10 刻 + 体重偏移；碾压式 +6。
 *   crushChance  咬塌几率 0.20 + 体重偏移 + 等级偏移；碾压式 ×1.35 / 疾咬式 ×0.75。
 *   crushStages  咬塌级数：体重超过 100 才可能一次压塌 2 级（native 固定 1 级，重量给出这一档）。
 *   crackTicks   破防标记时长 80 刻 + 等级偏移；碾压式 +30。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却，碾压式更慢更久。
 *
 * 配置 `crush`（碾压式）双向取舍：开启＝磨得更久、咬塌几率更高、破防标记更久，但咬合威力略低、起手与冷却更长；
 * 关闭＝疾咬式，出手快、单口更高，但咬塌几率明显更低、不加研磨时长。
 *
 * 伤害段：`fang` 是咬实那一下，`chew` 是研磨收口那一下；接触与咬击标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("crunch", {
        /** 咬合威力：基础 80，物攻每比 60 多 1 加 0.30（夹 −14..34），等级 30 起每级 +0.4（夹 −6..16）；
         *  碾压 ×0.92 / 疾咬 ×1.08；夹在 56..132。 */
        fang: formula(
            F.base(80)
                .plus(F.stat("attack").minus(60).times(0.30).clamp(-14, 34))
                .plus(F.level().minus(30).times(0.4).clamp(-6, 16))
                .times(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(0.92), F.const(1.08)))
                .clamp(56, 132).round(1),
            "咬合威力", {
                unit: "威力",
                description: "咬实那一下的基础威力；物攻给出咬合力，等级给出咬合的深度。本段的防御系数比惯例低，专门咬硬壳。对手防御、相性与暴击在命中时另算。"
            }),
        /** 研磨伤害：基础 18，物攻每比 60 多 1 加 0.12（夹 −6..16），体重每比 60 重 1 加 0.02（夹 −2..8）；
         *  碾压 ×0.9 / 疾咬 ×1.1；夹在 8..48。 */
        chew: formula(
            F.base(18)
                .plus(F.stat("attack").minus(60).times(0.12).clamp(-6, 16))
                .plus(F.body("weight").minus(60).times(0.02).clamp(-2, 8))
                .times(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(0.9), F.const(1.1)))
                .clamp(8, 48).round(1),
            "研磨伤害", {
                unit: "威力",
                description: "咬住后牙关继续研磨、把护甲碾碎时的第二段伤害；物攻与体重一起决定这一口嚼得多重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑咬距离：基础 2.1 格，速度每比 55 快 1 加 0.013（夹 −0.35..1.1）；碾压 ×0.9 / 疾咬 ×1.06；夹 1.5..3.4。 */
        reach: formula(
            F.base(2.1).plus(F.stat("speed").minus(55).times(0.013).clamp(-0.35, 1.1))
                .times(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(0.9), F.const(1.06)))
                .clamp(1.5, 3.4).round(2),
            "扑咬距离", {
                unit: "格",
                description: "从起步到咬到的总位移，也是本招的实际射程来源；腿快的个体扑得更远，碾压式收得更短。"
            }),
        /** 扑咬速度：基础 0.74 格/刻，速度每比 55 快 1 加 0.005（夹 −0.12..0.3）；碾压 ×0.9 / 疾咬 ×1.08；夹 0.5..1.1。 */
        lunge: formula(
            F.base(0.74).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.3))
                .times(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(0.9), F.const(1.08)))
                .clamp(0.5, 1.1).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑出时每刻前进的距离；疾咬式起得更快，碾压式沉一点但咬得更死。"
            }),
        /** 咬合判定：基础 0.44 格，碰撞箱每比 1.4 高 1 格加 0.14（夹 −0.08..0.3）；夹 0.32..0.78。 */
        grip: formula(
            F.base(0.44).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.08, 0.3)).clamp(0.32, 0.78).round(2),
            "咬合判定", {
                unit: "格",
                description: "这一口扫过的横向判定半径；口部越大咬得越宽，越不容易被侧身让开。"
            }),
        /** 研磨时长：基础 10 刻，体重每比 60 重 1 加 0.02（夹 −3..18）；碾压 +6；夹 6..40。 */
        grindTicks: seconds(
            F.base(10).plus(F.body("weight").minus(60).times(0.02).clamp(-3, 18))
                .plus(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(6), F.const(0)))
                .clamp(6, 40).round(0),
            "研磨时长", "咬住到牙关合拢、护甲塌陷之间的研磨时间；这段时间里第二段研磨伤害与咬塌判定才结算。碾压式磨得更久。"),
        /** 咬塌几率：基础 0.20，体重每比 60 重 1 加 0.0016（夹 −0.05..0.28），等级 30 起每级 +0.0015（夹 −0.03..0.12）；
         *  碾压 ×1.35 / 疾咬 ×0.75；夹 0.10..0.6。 */
        crushChance: percent(
            F.base(0.20)
                .plus(F.body("weight").minus(60).times(0.0016).clamp(-0.05, 0.28))
                .plus(F.level().minus(30).times(0.0015).clamp(-0.03, 0.12))
                .times(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(1.35), F.const(0.75)))
                .clamp(0.10, 0.6),
            "咬塌几率", "研磨结束时把护甲压塌、令目标防御下降的几率（原生 20%）；越重、等级越高的个体越容易咬碎。"),
        /** 咬塌级数：基础 1 级，体重超过 100 才可能一次压塌 2 级；夹 1..2。 */
        crushStages: formula(
            F.base(1).plus(F.body("weight").minus(100).times(0.006).clamp(0, 1)).floor().clamp(1, 2),
            "咬塌级数", {
                unit: "级",
                description: "一次咬塌让目标防御下降的能力等级；体重 100 以上的沉重牙口能一次压塌两级，轻的只有一级。"
            }),
        /** 破防标记时长：基础 80 刻，等级 30 起每级 +1.6（夹 −14..60）；碾压 +30；夹 60..240。 */
        crackTicks: seconds(
            F.base(80).plus(F.level().minus(30).times(1.6).clamp(-14, 60))
                .plus(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(30), F.const(0)))
                .clamp(60, 240).round(0),
            "破防标记时长", "咬塌后目标身上那道破防缺口停留的时长；等级越高缺口留得越久，别的招可以接着吃这道身份。"),
        /** 起手：基础 6 刻，速度每比 55 快 1 少 0.02（夹 −2..1.5）；碾压 +3；夹 3..13。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 1.5))
                .plus(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(3), F.const(0)))
                .clamp(3, 13).round(0),
            "起手", "压低兽首、把牙口张到能咬住护甲的时间；速度越快越短，碾压式要沉得更久。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 少 0.015（夹 −2..1.5）；碾压 +2；夹 3..13。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5))
                .plus(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(2), F.const(0)))
                .clamp(3, 13).round(0),
            "收招", "研磨结束后松口、退开的收势；碾压式咬着更久，收得更慢。"),
        /** 冷却：基础 20 刻，速度每比 55 快 1 少 0.05（夹 −4..2）；碾压 +6；夹 12..36。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 2))
                .plus(F.when(F.pref("crush", text("worldcombat.skill.crunch.preference.crush")), F.const(6), F.const(0)))
                .clamp(12, 36).round(0),
            "冷却", "两次咬碎之间的等待；它比咬住长，换来一次可靠的破防。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.04)
    });

    /** 咬实那一下：尖锐獠牙硬咬，防御系数低于惯例（0.004），专咬硬壳。 */
    defineDamage("crunch", "fang", { defenceCoefficient: 0.004,
        rationale: "压碎护甲的獠牙咬合；防御按低于惯例的系数减伤，对高防目标更有效。" }, { contact: true, bite: true });
    /** 研磨收口那一下：牙关碾过护甲的接触咬击。 */
    defineDamage("crunch", "chew", {}, { contact: true, bite: true });

    stages("crunch", [
        { level: 30, values: { fang: 88 } },
        { level: 48, values: { fang: 98, crushChance: 0.26 } }
    ]);

    describe("crunch", [
        { key: "description.0", values: ["fang"] },
        { key: "description.1", values: ["reach", "lunge", "grip"] },
        { key: "description.2", values: ["grindTicks", "chew"] },
        { key: "description.3", values: ["crushChance", "crushStages", "crackTicks"] },
        { key: "crush.on", values: [], when: function (context) { return read(context.detail.values, ["crush"]) === true; } },
        { key: "crush.off", values: [], when: function (context) { return read(context.detail.values, ["crush"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fang", "tier.1.crushChance"] }
    ]);
}
