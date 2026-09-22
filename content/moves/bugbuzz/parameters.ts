/**
 * 虫鸣 / bugbuzz —— 参数与伤害段。
 *
 * 原生事实：Bug／特殊／威力 90／命中 100／PP 10／sound＋bypasssub／目标单体／10% 概率让目标特防下降 1 级。
 *
 * 翻译：把「利用振动发出音波」落成一道从施法者嘴里压出去、贴地扩散的锥形声波。出手瞬间就把范围铺开
 * （没有飞行物），越近的敌人被震得越狠，远端只余余响；声音穿墙，所以石头墙挡不住它。它是磨防四式里
 * 唯一无实体、锥形、近强远弱、同时可能扫到多个人的那个；代价是碾防概率全族最低（原生 10%）。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core         鸣声威力：特攻定振动强度，等级定共鸣深度。
 *   coneAngle    音波张角：碰撞箱高度定共鸣腔大小（大个子声音铺得更开）。
 *   coneLength   音波射程：特攻定能压多远。
 *   falloff      远端保留：特攻定声波在射程边缘还剩几成威力。
 *   sunderChance 碾防概率：特攻与等级共同决定，基础 10% 取自原生。
 *   sunderStage  碾防级数：固定 1 级，与原生一致。
 *   rings        声环数：特攻与等级决定扩散的同心环数量，也驱动表现。
 *   tempo        起手：速度决定振翅蓄振的快慢。
 *
 * 配置 `deep`（沉鸣）：开启＝张角 ×0.72、射程 +2 格、远端少衰减、冷却 +3 刻、起手 +1 刻，但威力 ×0.94；
 * 关闭＝宽而较散的一嗓子，威力更足。两向各有适用局面（远距穿线 vs 近身覆盖）。
 *
 * 伤害段 `core`：声波扫到每个人身上各自结算一次；`sound: true` 让原生隔音类能力参与。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -1)。
 */
namespace PokemonSkills {
    actionParameters.define("bugbuzz", {
        core: formula(
            F.base(84)
                .plus(F.stat("specialAttack").minus(60).times(0.26).clamp(-18, 36))
                .plus(F.level().minus(30).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("deep"), F.const(0.94), F.const(1)))
                .clamp(52, 140).round(1),
            "鸣声威力", {
                unit: "威力",
                description: "声波扫到每人身上各自结算一次的基础威力；特攻越高振动越强，等级越高共鸣越深。对手特防、相性与暴击在命中时另算。"
            }),
        coneAngle: formula(
            F.base(62)
                .plus(F.body("height").minus(1.4).times(14).clamp(-8, 18))
                .times(F.when(F.pref("deep"), F.const(0.72), F.const(1)))
                .clamp(40, 86).round(1),
            "音波张角", {
                unit: "度",
                description: "声波锥体张开的总角度；体型越高共鸣腔越大、声音铺得越开。它是判定锥与画面的同一个角度。"
            }),
        coneLength: formula(
            F.base(9)
                .plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 3))
                .plus(F.when(F.pref("deep"), F.const(2), F.const(0)))
                .clamp(7, 14).round(1),
            "音波射程", {
                unit: "格",
                description: "声波能压出多远；特攻高传得远，沉鸣形态更远。它也是本招的实际射程来源。"
            }),
        falloff: percent(
            F.base(0.5)
                .plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.08, 0.12))
                .plus(F.when(F.pref("deep"), F.const(0.08), F.const(0)))
                .clamp(0.4, 0.72).round(3),
            "远端保留", "声波在射程边缘还剩的威力比例；越近越强，特攻高、沉鸣形态衰减更慢。"),
        sunderChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.03, 0.09))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .clamp(0.06, 0.26).round(3),
            "碾防概率", "命中的目标特防下降 1 级的概率；全族最低（原生 10%），但一道声波可以同时判定多人。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        rings: formula(
            F.base(4)
                .plus(F.stat("specialAttack").minus(60).times(0.03))
                .plus(F.level().minus(30).times(0.08))
                .clamp(3, 9).round(),
            "声环数", {
                unit: "环",
                description: "从嘴边一圈圈推出去的同心声环数，也驱动表现的密度；特攻与等级越高传播层次越多。"
            }),
        tempo: seconds(
            F.base(13)
                .minus(F.stat("speed").minus(55).times(0.05))
                .plus(F.when(F.pref("deep"), F.const(1), F.const(0)))
                .clamp(7, 17).round(),
            "起手", "振翅蓄振、把声波压到嘴边的时间；速度越快越短，沉鸣形态多花一点。")
    });

    defineDamage("bugbuzz", "core", {}, { sound: true });

    stages("bugbuzz", [
        { level: 42, values: { core: 104, coneLength: 10.5 } }
    ]);

    describe("bugbuzz", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["sunderChance", "sunderStage"] },
        { key: "description.2", values: ["coneAngle", "coneLength", "falloff"] },
        { key: "description.3", values: ["rings", "pref.deep"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.coneLength"] }
    ]);
}
