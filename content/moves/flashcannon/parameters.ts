/**
 * 加农光炮 / flashcannon —— 参数与伤害段。
 *
 * 原生事实：Steel／特殊／威力 80／命中 100／PP 10／目标单体／10% 概率让目标特防下降 1 级。
 *
 * 翻译：把「将身体的光芒聚集在一点释放出去」落成一记**集束贯穿光矛**。施法者先把全身的光收进身前一
 * 点（`converge`，收光起手），再把一条高速光矛沿准线射出去；光矛会**穿透**直线上的敌人，每穿过一个人
 * 光就暗一分（`falloff`），直到贯穿数用完或撞上墙。它是磨防远击四式里唯一能一发扫掉一条线上多人的那个，
 * 也是唯一命中 100、不偏线的高精度招——代价是单发最轻、且被墙挡住。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          光矛威力：特攻定光强，等级定聚光纯度。
 *   falloff       穿透保留：特攻决定光矛每穿过一人还剩几成威力。
 *   pierce        贯穿数：本招的穿透上限，由配置决定（集束为 0，贯穿为 2）。
 *   velocity      光矛速度：速度定射出初速。
 *   radius        判定半径：碰撞箱高度定光矛粗细。
 *   reach         射程：特攻定能射多远。
 *   converge      收光时间：速度决定聚光出手的快慢。
 *   sunderChance  碾防概率：特攻与等级共同决定，基础 10% 取自原生。
 *   sunderStage   碾防级数：固定 1 级，与原生一致。
 *   beams         光束数：特攻与等级决定收光时聚拢的光束数量，也驱动表现。
 *
 * 配置 `focus`（集束）：开启＝威力 ×1.2、贯穿数归零（只打第一个目标）、冷却 −3 刻，适合点名单体；
 * 关闭（贯穿）：威力 ×0.92、可穿透 2 个后续目标、冷却 +3 刻，适合扫一条线。两向各有适用局面。
 *
 * 伤害段 `core`：光矛命中那一下，走共享换算（原生类别 Special）；被穿透的每个人按 `falloff` 递减。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -1)。
 */
namespace PokemonSkills {
    actionParameters.define("flashcannon", {
        core: formula(
            F.base(78)
                .plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-16, 34))
                .plus(F.level().minus(28).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("focus"), F.const(1.2), F.const(0.92)))
                .clamp(44, 126).round(1),
            "光矛威力", {
                unit: "威力",
                description: "光矛命中那一下的基础威力；特攻越高光越强，等级越高聚光越纯。集束形态更集中、更重，贯穿形态分给沿线的人。对手特防、相性与暴击在命中时另算。"
            }),
        falloff: percent(
            F.base(0.72).plus(F.stat("specialAttack").minus(60).times(0.0008).clamp(-0.06, 0.1)).clamp(0.55, 0.85).round(3),
            "穿透保留", "光矛每穿过一个人后剩下的威力比例；特攻高光更耐久、衰减更慢。集束形态不穿透，此项不生效。"),
        pierce: formula(
            F.when(F.pref("focus"), F.const(0), F.const(2)),
            "贯穿数", {
                unit: "个",
                description: "光矛穿透第一个目标后还能再打中几个；集束形态为 0（只命中第一个），贯穿形态为 2。"
            }),
        velocity: formula(
            F.base(2.6).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.3, 0.6)).clamp(1.8, 3.6).round(2),
            "光矛速度", {
                unit: "格/刻",
                description: "光矛射出时的初速；速度快的个体射得更急。"
            }),
        radius: formula(
            F.base(0.24).plus(F.body("height").minus(1.4).times(0.05)).clamp(0.2, 0.42).round(2),
            "判定半径", {
                unit: "格",
                description: "光矛飞行与命中的判定半径；体型越高光矛越粗，越容易扫到贴线的人。"
            }),
        reach: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 4)).clamp(10, 20).round(1),
            "射程", {
                unit: "格",
                description: "光矛能射多远；特攻高射得远。它也是本招的实际射程来源。"
            }),
        converge: seconds(
            F.base(14).minus(F.stat("speed").minus(45).times(0.05).clamp(-2, 5)).clamp(9, 20).round(0),
            "收光时间", "把全身的光收进身前后再射出的时间；速度越快收得越短。"),
        sunderChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.04, 0.12))
                .plus(F.level().minus(28).times(0.0012).clamp(0, 0.06))
                .clamp(0.06, 0.30).round(3),
            "碾防概率", "命中时把目标特防压低 1 级的概率；原生 10% 起，特攻与等级越高越容易咬住。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        beams: formula(
            F.base(18)
                .plus(F.stat("specialAttack").minus(60).times(0.18))
                .plus(F.level().minus(28).times(0.4))
                .clamp(14, 52).round(),
            "光束数", {
                unit: "束",
                description: "收光时从身上聚向一点的光束数量，也驱动表现的密度；特攻与等级越高光越盛。"
            })
    });

    defineDamage("flashcannon", "core", {});

    stages("flashcannon", [
        { level: 42, values: { core: 94, reach: 16 } }
    ]);

    describe("flashcannon", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["pierce", "falloff"] },
        { key: "description.2", values: ["sunderChance", "sunderStage"] },
        { key: "description.3", values: ["converge", "velocity", "reach", "radius", "beams", "pref.focus"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.reach"] }
    ]);
}
