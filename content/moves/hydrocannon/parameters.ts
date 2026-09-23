/**
 * 加农水炮 / hydrocannon 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：水、特殊、威力 150、命中 90、PP 5、优先度 0、非接触、
 * self mustrecharge（下一回合无法行动）。
 *
 * 翻译：保留「向对手喷射水炮」，把原生的单体命中翻成即时战斗里一道**笔直的高压水柱**：
 * 水柱以很快的速度射向目标，命中时把目标沿水柱方向顶开、并按等级泼上共享身份 `world_combat:status/soaked`
 * （本单元效果）——被浸湿的活体再吃一发水柱会多受一份 `drenchBonus`，所以连续两发会越打越重。
 * 「下一回合无法动弹」翻成真实的力竭窗口 `world_combat:status/mustrecharge`（本单元效果）：无法行动、无法移动。
 * 数据分散：特攻决定威力、射程与顶开距离与浸湿加成，速度决定水柱飞行速度与起手，体型决定水柱判定粗细，
 * 体重参与顶开距离；等级决定浸湿持续。配置 `pressurized`（加压）是真正的取舍：开启＝水柱更细、更快、更重、
 * 顶得更远，代价是力竭更久；关闭＝水花散开、判定更粗更容易擦中，但单伤更低、顶不动、恢复更快。
 *
 * 伤害段名 jet：这一道随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("hydrocannon", {
        /** 水柱威力：特攻每比 60 多 1 加 1.1（上限 +85），等级每比 20 多 1 加 0.5（上限 +30）；加压 ×1.06 / 散喷 ×0.92；夹在 95..250。 */
        jet: formula(
            F.base(150)
                .plus(F.stat("specialAttack").minus(60).times(1.1).clamp(-35, 85))
                .plus(F.level().minus(20).times(0.5).clamp(0, 30))
                .times(F.when(F.pref("pressurized"), F.const(1.06), F.const(0.92)))
                .clamp(95, 250).round(1),
            "水柱威力", {
                unit: "威力",
                description: "这一道水柱的基础威力；加压更集中、更重。对手防御、相性与暴击在命中时由共享结算另算。"
            }),
        /** 射程：基础 11，特攻每比 60 多 1 加 0.05；夹在 9..20。 */
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-3, 9)).clamp(9, 20).round(1),
            "射程", {
                unit: "格",
                description: "能把水柱喷到多远；特攻高的个体站得更远，驱动实际的目标接受范围。"
            }),
        /** 水柱速度：基础 1.15，速度每比 60 快 1 加 0.008；加压 ×1.1 / 散喷 ×0.92；夹在 0.85..2.0。 */
        speed: formula(
            F.base(1.15).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.2, 0.7))
                .times(F.when(F.pref("pressurized"), F.const(1.1), F.const(0.92)))
                .clamp(0.85, 2.0).round(2),
            "水柱速度", {
                unit: "格/刻",
                description: "水柱飞行的速度；快的个体、加压时更难躲。"
            }),
        /** 判定半径：基础 0.5，碰撞箱每比 1.4 高 1 格加 0.12；加压 ×0.7 / 散喷 ×1.45；夹在 0.28..1.1。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12))
                .times(F.when(F.pref("pressurized"), F.const(0.7), F.const(1.45)))
                .clamp(0.28, 1.1).round(2),
            "判定半径", {
                unit: "格",
                description: "水柱的判定粗细；加压收成一线，散喷铺成一片，画出的水花宽度就是它。"
            }),
        /** 顶开距离：基础 1.3，特攻每比 60 多 1 加 0.012，体重每比 60 多 1 加 0.004；加压 ×1.25 / 散喷 ×0.8；夹在 0.4..3.2。 */
        shove: formula(
            F.base(1.3).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.0))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.3, 0.8))
                .times(F.when(F.pref("pressurized"), F.const(1.25), F.const(0.8)))
                .clamp(0.4, 3.2).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中后把目标沿水柱方向顶开多远；高压水柱的签名。"
            }),
        /** 浸湿时长：基础 70 tick，等级每比 20 高 1 加 1.8 tick；夹在 40..150 tick。 */
        soakTicks: seconds(
            F.base(70).plus(F.level().minus(20).times(1.8).clamp(0, 80)).clamp(40, 150).round(),
            "浸湿时长", "命中后目标身上的浸湿状态持续多久；湿透的目标再吃一发水柱会更重。"),
        /** 浸湿加成：基础 0.22，特攻每比 60 多 1 加 0.0015；夹在 0.12..0.5。 */
        drenchBonus: percent(
            F.base(0.22).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.1, 0.28)).clamp(0.12, 0.5).round(3),
            "浸湿加成", "目标已经湿透（带浸湿身份或天然湿身）时，这一发水柱多造成的伤害比例。"),
        /** 起手：基础 11 tick，速度每比 60 快 1 减 0.03 tick；夹在 7..17 tick。 */
        charge: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.03)).clamp(7, 17).round(),
            "起手", "蓄起水压的准备时间；敏捷的个体起手更快。"),
        /** 力竭：基础 54 tick，特攻每比 60 多 1 加 0.4 tick（上限 +44）；加压 ×1.15 / 散喷 ×0.93；夹在 34..114 tick。 */
        exhaust: seconds(
            F.base(54)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-14, 44))
                .times(F.when(F.pref("pressurized"), F.const(1.15), F.const(0.93)))
                .clamp(34, 114).round(),
            "力竭", "放完这一炮后无法行动、无法移动的时间；加压更久，散喷更快恢复。")
    });

    stages("hydrocannon", [
        { level: 36, values: { jet: 166 } },
        { level: 56, values: { jet: 184 } }
    ]);

    defineDamage("hydrocannon", "jet", { defenceCoefficient: 0.0042, rationale: "高压水柱对特殊防御的穿透略强，让特攻差距在场上更明显。" }, {});

    describe("hydrocannon", [
        { key: "description.0", values: ["jet"] },
        { key: "description.1", values: ["shove", "collisionRadius"] },
        { key: "description.2", values: ["soakTicks","drenchBonus"] },
        { key: "description.3", values: ["reach","speed","charge","exhaust"] },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] }
    ]);
}
