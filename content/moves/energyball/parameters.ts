/**
 * 能量球 / energyball —— 参数与伤害段。
 *
 * 原生事实：Grass／特殊／威力 90／命中 100／PP 10／bullet／目标单体／10% 概率让目标特防下降 1 级。
 *
 * 翻译：把「从自然收集生命力量发射出去」落成一记会**从四周吸取生机**的实心草能球。出手前它把身边
 * 植被（草、叶、花、作物、苔藓）里的生机一缕缕收进球心——所以同一只精灵站在草原和站在石头地上，
 * 打出来的球不一样大、不一样重。命中活物时炸开成一圈草叶与光尘，落点短暂长出一小片花草；打空也
 * 会在地面绽开。它是磨防远击四式里唯一把「周围世界」算进威力的那个。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          球心威力：特攻定密度，等级定生机浓厚。
 *   verdant       每份生机：特攻与等级决定每一处自然转化的威力，也驱动表现里的种子数。
 *   velocity      飞行速度：速度定球脱手的初速。
 *   radius        判定半径：碰撞箱高度定球体大小。
 *   reach         射程：特攻定能送多远。
 *   gather        吸收半径：特攻与等级决定能吸到多远的自然；也是表现里生机汇聚的范围。
 *   sunderChance  碾防概率：特攻与等级共同决定，基础 10% 取自原生。
 *   sunderStage   碾防级数：固定 1 级，与原生一致。
 *   bloomTicks    绽放时长：等级与特攻决定落点那片花草留多久。
 *   seeds         种子数：特攻与等级决定爆开的草种数，也驱动表现。
 *   tempo         起手：速度决定聚能出手的快慢。
 *
 * 配置 `deeproot`（深根）：开启＝吸收半径 +1.6 格、每份生机 ×1.3、球心威力 ×1.06，但起手多 4 刻、
 * 冷却 +5 刻、射程 −1 格；关闭＝更快更远但吸得浅。两向各有适用局面（草原站桩 vs 石头地快打）。
 *
 * 伤害段 `core`：球命中那一下，走共享换算（原生类别 Special）；实际威力 = core + 生机数 × verdant，
 * 因此详情页显示的是「未吸收自然时」的基础值，description.1 说明额外生机。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -1)：宝可梦回落原生等级，其他生物落到
 * CombatStages 的属性阶梯，一个机制覆盖所有对手。
 */
namespace PokemonSkills {
    actionParameters.define("energyball", {
        core: formula(
            F.base(88)
                .plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-16, 34))
                .plus(F.level().minus(28).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("deeproot"), F.const(1.06), F.const(1)))
                .clamp(52, 140).round(1),
            "球心威力", {
                unit: "威力",
                description: "能量球命中那一下的基础威力；特攻越高球越密，等级越高生机越浓。这是没吸到自然时的值，周围每份生机再由「每份生机」追加。对手特防、相性与暴击在命中时另算。"
            }),
        verdant: formula(
            F.base(0.9)
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.3, 1.2))
                .plus(F.level().minus(28).times(0.012).clamp(0, 0.6))
                .times(F.when(F.pref("deeproot"), F.const(1.3), F.const(1)))
                .clamp(0.4, 3.0).round(2),
            "每份生机", {
                unit: "威力/份",
                description: "从周围每吸取一处自然（叶、花、草、作物、苔藓）追加的威力；特攻高、等级高的个体转化得更足，深根形态再放大。"
            }),
        velocity: formula(
            F.base(1.15).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.25, 0.5)).clamp(0.85, 1.8).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "球脱手时的初速；速度快的个体掷得更急。"
            }),
        radius: formula(
            F.base(0.24).plus(F.body("height").minus(1.4).times(0.06)).clamp(0.2, 0.44).round(2),
            "判定半径", {
                unit: "格",
                description: "球飞行与命中的判定半径；体型越高球越大。"
            }),
        reach: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1.5, 4))
                .minus(F.when(F.pref("deeproot"), F.const(1), F.const(0)))
                .clamp(9, 18).round(1),
            "射程", {
                unit: "格",
                description: "球能送出多远；特攻高送得远，深根形态站得更稳所以略近。它也是本招的实际射程来源。"
            }),
        gather: formula(
            F.base(3.4)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.5, 1.0))
                .plus(F.level().minus(28).times(0.02).clamp(0, 0.8))
                .plus(F.when(F.pref("deeproot"), F.const(1.6), F.const(0)))
                .clamp(2.5, 6.5).round(2),
            "吸收半径", {
                unit: "格",
                description: "能从多远的范围内吸取自然；特攻与等级越高吸得越广，深根形态更远。它也是表现里生机汇聚的范围。"
            }),
        sunderChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.04, 0.12))
                .plus(F.level().minus(28).times(0.0012).clamp(0, 0.06))
                .plus(F.when(F.pref("deeproot"), F.const(0.03), F.const(0)))
                .clamp(0.06, 0.30).round(3),
            "碾防概率", "命中时把目标特防压低 1 级的概率；原生 10% 起，特攻与等级越高越容易咬住，深根形态再高一点。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        bloomTicks: seconds(
            F.base(90)
                .plus(F.level().minus(28).times(1.0).clamp(0, 50))
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-4, 10))
                .clamp(70, 170).round(0),
            "绽放时长", "落点那片花草停留多久；等级与特攻越高生机越盛、留得越久。到期原方块回来。"),
        seeds: formula(
            F.base(16)
                .plus(F.stat("specialAttack").minus(60).times(0.14))
                .plus(F.level().minus(28).times(0.35))
                .clamp(12, 46).round(),
            "种子数", {
                unit: "颗",
                description: "球炸开时迸出的草种数量，也驱动表现的密度；特攻与等级越高越密。"
            }),
        tempo: seconds(
            F.base(12)
                .minus(F.stat("speed").minus(55).times(0.05))
                .plus(F.when(F.pref("deeproot"), F.const(4), F.const(0)))
                .clamp(6, 20).round(),
            "起手", "把四周生机收进球心再掷出的时间；速度越快越短，深根形态多花一点。")
    });

    defineDamage("energyball", "core", {});

    stages("energyball", [
        { level: 40, values: { core: 104, reach: 15 } }
    ]);

    describe("energyball", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["verdant", "gather"] },
        { key: "description.2", values: ["sunderChance", "sunderStage"] },
        { key: "description.3", values: ["velocity", "reach", "radius", "bloomTicks", "pref.deeproot"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.reach"] }
    ]);
}
