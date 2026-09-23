/**
 * 月亮之力 / moonblast 的参数与数值来源。
 *
 * 原生事实：妖精／特殊／威力 95／命中 100／PP 15／目标单体／30% 让目标特攻下降 1 级。
 *
 * 翻译：把「借用月亮的力量攻击对手」落成一件真的看天的事——施法者抬头把**头顶那点月光**拢成一颗月华球
 * （起手越暗拢得越久），再把它直直地放出去；命中炸开一牙弯月，偶尔把对手的特攻一并压下去。
 * 月光用一个世界事实表达：露天（`skyVisible`）、夜里（非 `day`）、少雨（`rain`）时月华最盛，
 * 威力、降攻概率、放射辉光与起手时间都随之改变；白天或室内就只是一记普通妖精炮。
 *
 * 数值来源（每项读不同的精灵数据或世界事实）：
 *   beam      月华威力：特攻定球的实度、等级定拢光的熟练，月华再补一截。
 *   moonlight 月华比例：世界事实（露天×夜×少雨）算出的 0..1，画面与公式读同一份。
 *   arcChance 降攻概率：特攻与等级定基础，月华再加一截，凝华式再抬一点。
 *   boltSpeed 弹速：速度定飞多快，凝华式更慢更重。
 *   collisionRadius 判定半径：身高定球的体积。
 *   burst     爆开半径：特攻定月牙铺多开。
 *   rays      辉光道数：特攻与月华定，也驱动画面。
 *   dropStages 特攻下降级数：固定 1 级。
 *   focusMotes 被夺光点：特攻定，也驱动画面。
 *   tempo     起手：速度定基础，月华越盛拢得越久，凝华式再多蓄。
 *   aftercast／recharge：速度定节奏，凝华式更久。
 *
 * 配置 `condense`（凝华式，默认开）：开＝威力 ×1.12、降攻概率 +0.06，代价是弹速 ×0.85、起手 +2、冷却 +3；
 * 关（流月式）＝弹速 ×1.15、爆开半径 ×1.15，代价是威力 ×0.9、降攻概率 −0.04。重球 vs 快球，两向各有局面。
 *
 * 伤害段 `beam`：一发妖精特殊弹，沿用原生类别。
 */
namespace PokemonSkills {
    export const moonblastId = "moonblast";
    export const moonblastScene = "world_combat:move_moonblast";
    export const moonblastDropText = "world_combat.move.moonblast.text.drop";
    export const moonblastMissText = "world_combat.move.moonblast.text.miss";

    /** 露天 × 夜间 × 少雨，0..1；世界事实缺失时归零（没有天就没有月）。 */
    function moonblastMoonlit(): Formula.Node {
        return F.world("skyVisible")
            .times(F.const(1).minus(F.world("day")))
            .times(F.const(1).minus(F.world("rain").times(0.6)))
            .clamp(0, 1);
    }

    actionParameters.define(moonblastId, {
        /** 月华威力：70 + 特攻偏移[−12,40] + 等级(≥25)偏移[0,10] + 月华 ×(14 + 特攻偏移[−3,14])；凝华 ×1.12 / 流月 ×0.9；夹 44..170。 */
        beam: formula(
            F.base(70)
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-12, 40))
                .plus(F.level().minus(25).times(0.25).clamp(0, 10))
                .plus(moonblastMoonlit().times(F.base(14).plus(F.stat("specialAttack").minus(60).times(0.1).clamp(-3, 14)).clamp(6, 34)))
                .times(F.when(F.pref("condense"), F.const(1.12), F.const(0.9)))
                .clamp(44, 170).round(1),
            "月华威力", {
                unit: "威力",
                description: "月华球打在身上那一下的基础威力；特攻越高、等级越高越实，头顶的月光越盛补得越多。对手特防、相性与暴击在命中时另算。"
            }),
        /** 月华比例：露天 × 非白天 × (1 − 雨 × 0.6)，夹 0..1。 */
        moonlight: percent(
            moonblastMoonlit(),
            "月华", "施法者头顶此刻有多少月光可用：露天、夜里、少雨时最盛，白天或室内为零。它同时抬高威力、降攻概率与起手时间。"),
        /** 降攻概率：30% + 特攻偏移[0,16%] + 等级偏移[0,6%] + 月华 12% ；凝华 +6% / 流月 −4%；夹 18%..62%。 */
        arcChance: percent(
            F.base(0.3)
                .plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(0, 0.16))
                .plus(F.level().minus(25).times(0.0012).clamp(0, 0.06))
                .plus(moonblastMoonlit().times(0.12))
                .plus(F.when(F.pref("condense"), F.const(0.06), F.const(-0.04)))
                .clamp(0.18, 0.62).round(3),
            "降攻概率", "命中的目标特攻下降 1 级的概率；原生 30%，特攻、等级与月华都会抬高它。"),
        /** 弹速：0.95 + 速度偏移[−0.12,0.3]；凝华 ×0.85 / 流月 ×1.15；夹 0.6..1.5。 */
        boltSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.12, 0.3))
                .times(F.when(F.pref("condense"), F.const(0.85), F.const(1.15)))
                .clamp(0.6, 1.5).round(2),
            "弹速", {
                unit: "格/刻",
                description: "月华球飞向目标的速度；速度快的个体放得更急，凝华式因为球更实而飞得慢。"
            }),
        /** 判定半径：0.28 + 身高偏移[−0.05,0.16]；夹 0.18..0.5。 */
        collisionRadius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.16)).clamp(0.18, 0.5).round(2),
            "判定半径", {
                unit: "格",
                description: "月华球的碰撞体积；体型大的个体拢出的球更粗，也更容易擦到目标。"
            }),
        /** 爆开半径：0.95 + 特攻偏移[−0.15,0.6]；流月 ×1.15；夹 0.6..1.9。 */
        burst: formula(
            F.base(0.95).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.15, 0.6))
                .times(F.when(F.pref("condense"), F.const(1), F.const(1.15)))
                .clamp(0.6, 1.9).round(2),
            "爆开半径", {
                unit: "格",
                description: "月牙在命中点炸开的大小；特攻越高铺得越开，流月式的边缘更散。"
            }),
        /** 辉光道数：8 + 特攻偏移[−2,4] + 月华 ×2；夹 6..16。 */
        rays: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 4))
                .plus(moonblastMoonlit().times(2)).clamp(6, 16).round(0),
            "辉光道数", {
                unit: "道",
                description: "月牙炸开时向外射出的辉光道数；特攻越高、月光越盛越密，也决定画面的放射条数。"
            }),
        /** 特攻下降：固定 1 级。 */
        dropStages: formula(
            F.base(1),
            "特攻下降", {
                unit: "级",
                description: "被月华压住时目标特攻下降的能力等级；对宝可梦落到原生特攻等级，对其他战斗者落到攻击阶梯。"
            }),
        /** 被夺光点：12 + 特攻偏移[−4,14]；夹 6..30。 */
        focusMotes: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.14).clamp(-4, 14)).clamp(6, 30).round(0),
            "被夺光点", {
                unit: "个",
                description: "被夺走的集中力在目标头顶飘散的辉光点数量；特攻越高越多，粒子也按它发射。"
            }),
        /** 起手：9 − 速度偏移[−2,3] + 月华 ×2 + 凝华 2；夹 5..16。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(moonblastMoonlit().times(2))
                .plus(F.when(F.pref("condense"), F.const(2), F.const(0)))
                .clamp(5, 16).round(0),
            "起手", "抬头拢光、把月华压成一颗球的时间；速度越快越短，月光越盛、凝华式拢得越久。"),
        /** 收招：8 − 速度偏移[−2,3]；夹 5..13。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(5, 13).round(0),
            "收招", "放完球收回架势的时间；速度越快收得越干脆。"),
        /** 冷却：30 − 速度偏移[−4,7] + 凝华 3 / 流月 −2；夹 20..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.05).clamp(-4, 7))
                .plus(F.when(F.pref("condense"), F.const(3), F.const(-2)))
                .clamp(20, 46).round(0),
            "冷却", "下次再拢月光前的等待；速度越快回得越快，凝华式等得稍久、流月式更短。")
    });

    defineDamage(moonblastId, "beam", {});

    stages(moonblastId, [
        { level: 35, values: { beam: 84 } },
        { level: 55, values: { rays: 11 } }
    ]);

    describe(moonblastId, [
        { key: "description.0", values: ["beam"] },
        { key: "description.1", values: ["arcChance", "dropStages"] },
        { key: "description.2", values: ["moonlight"] },
        { key: "description.3", values: ["burst"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["condense"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["condense"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.beam"] }
    ]);
}
