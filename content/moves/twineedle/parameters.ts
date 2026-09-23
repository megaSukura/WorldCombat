/**
 * 双针 / twineedle —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**Bug**／物理／威力 25／命中 100／PP 20／单体／非接触／连续 2 次（`multihit: 2`）／20% 令目标中毒。
 *
 * 翻译：把「将２根针刺入对手，连续２次给予伤害」落成一记**先后两下**的双刺——第一针先扎开伤口，第二针冲着这道伤口去，
 *   所以第二针更容易把毒带进去（`woundBonus`）。它不是一次伤害结算两次，而是一段有前后因果的两拍。
 *   属性取原生的虫（这是家族里唯一非毒属性的一招），毒只是它附带的。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   dart         每针威力：物攻（针有多利）；交叉式两根分飞、单针更轻。
 *   reach        射程：等级（出手距离感）。
 *   gap          两针间隔：速度（收针再出的快慢）；交叉式要多绕一点。
 *   flight       飞行速度：速度。
 *   dartRadius   判定半径：碰撞箱高度（针的粗细）。
 *   flank        两针横向间隔：**碰撞箱宽度**（身体越宽分得越开）；只有交叉式才真的分开。
 *   poisonChance 每针中毒概率：物攻。
 *   woundBonus   第二针加成：等级（越会打伤口）；交叉式 ×1.6——从两侧夹击更容易落在同一道伤口上。
 *   venomTicks   中毒时长：特攻＋等级。
 *   motes        溅点数量：物攻；同时是画面里命中溅点的数量。
 *   tempo/settle/recharge：速度与等级。
 *
 * 配置 `cross`（交叉双针，默认关）双向取舍：开启＝第二针加成 ×1.6、两针从身体两侧夹击，代价是每针威力 ×0.9、
 *   间隔 +2 刻；关闭＝直刺双针，同一线连出、间隔更短、每针威力 ×1.1，但第二针没有夹击加成。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    actionParameters.define("twineedle", {
        /** 每针威力：25 + 物攻偏移[−5,14]；交叉 ×0.9 / 直刺 ×1.1；夹 14..46。 */
        dart: formula(
            F.base(25).plus(F.stat("attack").minus(55).times(0.12).clamp(-5, 14))
                .times(F.when(F.pref("cross"), F.const(0.9), F.const(1.1)))
                .clamp(14, 46).round(1),
            "每针威力", {
                unit: "威力",
                description: "每一根针各自结算的威力；物攻越高越利。交叉式两根分飞、单针更轻；直刺双针更重，但没有夹击加成。对手物防、相性与暴击在每针命中时另算。"
            }),
        /** 射程：8 + 等级(≥20)偏移[0,3]；夹 6..12。 */
        reach: formula(
            F.base(8).plus(F.level().minus(20).times(0.08).clamp(0, 3)).clamp(6, 12).round(1),
            "射程", {
                unit: "格",
                description: "能够到多远；等级越高甩得越远。它也是本招的实际射程。"
            }),
        /** 两针间隔：5 + 交叉 2 − 速度偏移[−1,1.5]；夹 3..9。 */
        gap: seconds(
            F.base(5).plus(F.when(F.pref("cross"), F.const(2), F.const(0)))
                .minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(3, 9).round(0),
            "两针间隔", "第一针与第二针之间隔多久；速度越快收针再出越快，交叉式要多绕一点。"),
        /** 飞行速度：1.8 + 速度偏移[−0.3,0.6]；夹 1.2..2.8。 */
        flight: formula(
            F.base(1.8).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.3, 0.6)).clamp(1.2, 2.8).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "两根针脱手的速度；速度快的个体甩得更急。"
            }),
        /** 判定半径：0.16 + 高度偏移[−0.02,0.12]；夹 0.12..0.3。 */
        dartRadius: formula(
            F.base(0.16).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.02, 0.12)).clamp(0.12, 0.3).round(2),
            "判定半径", {
                unit: "格",
                description: "每根针的横向判定半径；大个子的针更粗。"
            }),
        /** 两针横向间隔：0.7 + 宽度偏移[−0.2,0.9]；×交叉(1/0)；夹 0..1.8。 */
        flank: formula(
            F.base(0.7).plus(F.body("width").minus(0.9).times(1.2).clamp(-0.2, 0.9))
                .times(F.when(F.pref("cross"), F.const(1), F.const(0)))
                .clamp(0, 1.8).round(2),
            "两针横向间隔", {
                unit: "格",
                description: "交叉式下两根针从身体两侧分开多远；身体越宽分得越开，直刺式为 0（同一条线）。"
            }),
        /** 每针中毒概率：0.20 + 物攻偏移[−0.05,0.18]；夹 0.1..0.45。 */
        poisonChance: percent(
            F.base(0.20).plus(F.stat("attack").minus(55).times(0.0015).clamp(-0.05, 0.18)).clamp(0.1, 0.45),
            "每针中毒概率", "每一根针各自掷一次的中毒概率；原生 20% 起，物攻越高越容易留下毒。"),
        /** 第二针加成：0.10 + 等级(≥20)偏移[0,0.12]；交叉 ×1.6；夹 0..0.32。 */
        woundBonus: percent(
            F.base(0.10).plus(F.level().minus(20).times(0.004).clamp(0, 0.12))
                .times(F.when(F.pref("cross"), F.const(1.6), F.const(1)))
                .clamp(0, 0.32),
            "第二针加成", "第一针命中后，第二针冲着这道伤口去，中毒概率额外加这么多；等级越高越会打伤口，交叉式加成更大。第一针没中就加不上。"),
        /** 中毒时长：240 + 特攻偏移[−20,70] + 等级(≥20)偏移[0,80]；夹 180..480。 */
        venomTicks: seconds(
            F.base(240).plus(F.stat("specialAttack").minus(50).times(0.6).clamp(-20, 70))
                .plus(F.level().minus(20).times(2).clamp(0, 80))
                .clamp(180, 480).round(0),
            "中毒时长", "留下的毒持续多久；特攻与等级越高挂得越久。"),
        /** 溅点数量：10 + 物攻偏移[−3,10]；夹 8..24。 */
        motes: formula(
            F.base(10).plus(F.stat("attack").minus(55).times(0.1).clamp(-3, 10)).clamp(8, 24).round(0),
            "溅点数量", {
                unit: "点",
                description: "每针命中溅出的毒点与碎屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：6 − 速度偏移[−1,2]；夹 3..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(3, 9).round(0),
            "起手", "端起两根针再出手的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−1,1.5]；夹 3..10。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-1, 1.5)).clamp(3, 10).round(0),
            "收招", "两针收完恢复架势的时间；速度越快收得越快。"),
        /** 冷却：16 − 等级(≥20)偏移[0,3]；夹 9..24。 */
        recharge: seconds(
            F.base(16).minus(F.level().minus(20).times(0.1).clamp(0, 3)).clamp(9, 24).round(0),
            "冷却", "再一次双刺之间的等待；等级越高回得越快。")
    });

    defineDamage("twineedle", "dart", {});

    stages("twineedle", [
        { level: 25, values: { dart: 28 } },
        { level: 40, values: { dart: 32, woundBonus: 0.16 } }
    ]);

    describe("twineedle", [
        { key: "description.0", values: ["dart","reach","flight","dartRadius"] },
        { key: "description.homing", values: [] },
        { key: "description.1", values: ["gap","poisonChance","woundBonus","venomTicks"] },
        { key: "description.2", values: ["flank", "tempo", "settle", "recharge"] },
        { key: "cross.on", values: [], when: function (context) { return read(context.detail.values, ["cross"]) === true; } },
        { key: "cross.off", values: [], when: function (context) { return read(context.detail.values, ["cross"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.dart"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.dart", "tier.1.woundBonus"] }
    ]);
}
