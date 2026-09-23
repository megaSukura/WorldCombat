/**
 * 洁净光芒 / lusterpurge —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 95／命中 100／PP 5／目标单体／50% 概率让目标特防下降 1 级（拉帝欧斯的招牌）。
 *
 * 翻译：把「释放耀眼的光芒」落成一圈从施法者自身炸开、向外扩张的强光。它是磨防四式里唯一以自身为中心、
 * 没有方向、没有飞行物的那个；范围最短、PP 最少（原生 5），换来的是全族最高的碾防概率（原生 50%）。
 * 光芒短暂炫目，触发碾防的目标身上会残留一圈亮点。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          强光威力：特攻定亮度，等级定光压。
 *   flashRadius   光芒半径：特攻与体型共同决定光幕铺多开。
 *   spreadTicks   光幕推开时间：速度决定光扩散的快慢。
 *   sunderChance  碾防概率：特攻决定，基础 50% 取自原生。
 *   sunderStage   碾防级数：固定 1 级，与原生一致。
 *   dazeTicks     炫目时长：等级与特攻决定亮点在目标身上停留多久。
 *   rays          光束数：特攻与等级决定散出的光束数量，也驱动表现。
 *   tempo         起手：速度决定聚光出手的快慢。
 *
 * 配置 `focus`（聚光）：开启＝半径 ×0.78、威力 ×1.18、碾防概率 +0.06、冷却 +4 刻、起手 +2 刻，适合单挑；
 * 关闭＝光芒摊得更开（默认半径），威力与概率按基础值，适合被围住时一次罩住一圈。两向各有适用局面。
 *
 * 伤害段 `core`：光幕扫到每人身上各自结算一次，走共享换算（原生类别 Special）。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -1)。
 */
namespace PokemonSkills {
    actionParameters.define("lusterpurge", {
        core: formula(
            F.base(90)
                .plus(F.stat("specialAttack").minus(70).times(0.26).clamp(-20, 36))
                .plus(F.level().minus(35).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("focus"), F.const(1.18), F.const(1)))
                .clamp(56, 146).round(1),
            "强光威力", {
                unit: "威力",
                description: "光幕扫到每人身上各自结算一次的基础威力；特攻越高越亮，等级越高光压越强，聚光形态更集中。"
            }),
        flashRadius: formula(
            F.base(4.0)
                .plus(F.stat("specialAttack").minus(70).times(0.012).clamp(-0.6, 1.4))
                .plus(F.body("height").minus(1.6).times(0.5).clamp(-0.3, 1.0))
                .times(F.when(F.pref("focus"), F.const(0.78), F.const(1)))
                .clamp(2.6, 6.2).round(2),
            "光芒半径", {
                unit: "格",
                description: "光幕从身上向外铺到多远；特攻高、体型大的个体照得更开，聚光形态收得更紧。它也是本招的实际射程与指示圈半径。"
            }),
        spreadTicks: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.012).clamp(-1.5, 2.5)).clamp(4, 10).round(0),
            "光幕推开时间", "光幕从脚边铺到最外圈要多久；速度快的个体铺得越急。"),
        sunderChance: percent(
            F.base(0.50)
                .plus(F.stat("specialAttack").minus(70).times(0.001).clamp(-0.05, 0.09))
                .plus(F.when(F.pref("focus"), F.const(0.06), F.const(0)))
                .clamp(0.40, 0.68).round(3),
            "碾防概率", "命中的目标特防下降 1 级的概率；原生 50% 起，是全族最高的一招，聚光形态再高一点。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        dazeTicks: seconds(
            F.base(70)
                .plus(F.level().minus(35).times(1.2).clamp(0, 36))
                .plus(F.stat("specialAttack").minus(70).times(0.2).clamp(-6, 20))
                .clamp(50, 150).round(0),
            "炫目时长", "碾防生效后，目标身上残留的亮点停留多久；等级与特攻越高亮得越久。"),
        rays: formula(
            F.base(8)
                .plus(F.stat("specialAttack").minus(70).times(0.06))
                .plus(F.level().minus(35).times(0.2))
                .clamp(6, 24).round(),
            "光束数", {
                unit: "束",
                description: "光幕炸开时散出的光束数量，也驱动表现的密度；特攻与等级越高光束越密。"
            }),
        tempo: seconds(
            F.base(14)
                .minus(F.stat("speed").minus(60).times(0.05))
                .plus(F.when(F.pref("focus"), F.const(2), F.const(0)))
                .clamp(8, 18).round(),
            "起手", "把强光聚到一点再放出的时间；速度越快越短，聚光形态多花一点。")
    });

    defineDamage("lusterpurge", "core", {});

    stages("lusterpurge", [
        { level: 45, values: { core: 108, flashRadius: 4.4 } }
    ]);

    describe("lusterpurge", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["flashRadius","spreadTicks"] },
        { key: "description.2", values: ["sunderChance","sunderStage"] },
        { key: "description.3", values: ["pref.focus"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.flashRadius"] }
    ]);
}
