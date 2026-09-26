/**
 * 暗影球 / shadowball —— 参数与伤害段。
 *
 * 原生事实：Ghost／特殊／威力 80／命中 100／PP 15／bullet／目标单体／20% 概率让目标特防下降 1 级。
 *
 * 翻译：把「掷出一团黑影攻击」落成一记直线高速飞行的实心暗影团。它朝瞄准方向射出，选中敌人就直飞它、
 * 没有选中实体也能对着空点空放；飞行途中不断剥落，命中活物时炸开成一圈阴气，爆散强度读取这次实际造成的
 * 伤害（被吸收或打空只散影）。触发碾防并真的降级时，目标身上会短暂贴住一层散不去的影子。它是磨防四式里
 * 唯一用真实投射物飞行、只打单体、射程中等的那个：其余几式各自铺开自己的范围。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          影球威力：特攻定重量，等级定影子的浓度。
 *   velocity      飞行速度：速度定出手初速。
 *   radius        判定半径：碰撞箱高度定影球大小。
 *   reach         射程：特攻定影子能追多远。
 *   sunderChance  碾防概率：特攻与等级共同决定，基础 20% 取自原生。
 *   sunderStage   碾防级数：固定 1 级，与原生一致。
 *   clingTicks    缠影时长：等级与生命决定影子附着在目标身上的时间。
 *   shards        碎影数：特攻与等级决定爆开的阴气碎数，也驱动表现。
 *   tempo         起手：速度决定聚影出手的快慢。
 *
 * 配置 `dense`（凝影）：开启＝威力 ×1.12、判定 ×1.15，但飞行 ×0.84、射程 −2 格、冷却 +4 刻；
 * 关闭＝更快更远但更轻。两向各有适用局面（近身硬砸 vs 远距点射）。
 *
 * 伤害段 `core`：影球命中那一下，走共享换算（原生类别 Special）。
 * 特防下降走共享的能力等级阶梯 NativeEffects.boost(..., "spd", -1)：宝可梦回落原生等级，其他生物落到
 * CombatStages 的属性阶梯，一个机制覆盖所有对手。
 */
namespace PokemonSkills {
    actionParameters.define("shadowball", {
        core: formula(
            F.base(76)
                .plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-16, 34))
                .plus(F.level().minus(28).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("dense"), F.const(1.12), F.const(1)))
                .clamp(46, 132).round(1),
            "影球威力", {
                unit: "威力",
                description: "暗影团命中那一下的基础威力；特攻越高影越沉，等级越高影子越浓。对手特防、相性与暴击在命中时另算。"
            }),
        velocity: formula(
            F.base(1.45).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.25, 0.5))
                .times(F.when(F.pref("dense"), F.const(0.84), F.const(1)))
                .clamp(0.9, 2.0).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "影球飞行的速度；速度快的个体掷得更急，目标更难走位躲开。凝影形态更沉、飞得更慢。"
            }),
        radius: formula(
            F.base(0.24).plus(F.body("height").minus(1.4).times(0.06)).clamp(0.2, 0.42).round(2),
            "判定半径", {
                unit: "格",
                description: "飞行途中的判定半径；体型越高影球越大。"
            }),
        reach: formula(
            F.base(13)
                .plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1.5, 4))
                .minus(F.when(F.pref("dense"), F.const(2), F.const(0)))
                .clamp(10, 19).round(1),
            "射程", {
                unit: "格",
                description: "影球能追出多远；特攻高打得远，凝影形态更重所以更近。它也是本招的实际射程来源。"
            }),
        sunderChance: percent(
            F.base(0.20)
                .plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.05, 0.12))
                .plus(F.level().minus(25).times(0.0015).clamp(0, 0.07))
                .clamp(0.12, 0.38).round(3),
            "碾防概率", "命中时把目标特防压低 1 级的概率；原生 20% 起，特攻与等级越高越容易咬住。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        clingTicks: seconds(
            F.base(70)
                .plus(F.level().minus(25).times(1.0).clamp(0, 30))
                .plus(F.stat("hp").minus(60).times(0.08).clamp(-6, 16))
                .clamp(50, 130).round(0),
            "缠影时长", "碾防生效后，那层影子贴在目标身上散去的时长；等级与生命越高贴得越久。"),
        shards: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.14))
                .plus(F.level().minus(28).times(0.35))
                .clamp(12, 48).round(),
            "碎影数", {
                unit: "缕",
                description: "影球炸开时迸出的阴气碎缕数，也驱动表现的密度；特攻与等级越高越碎。"
            }),
        tempo: seconds(
            F.base(12)
                .minus(F.stat("speed").minus(55).times(0.05))
                .plus(F.when(F.pref("dense"), F.const(1), F.const(0)))
                .clamp(6, 16).round(),
            "起手", "把黑影在身前聚成球再掷出的时间；速度越快越短，凝影形态多花一点。")
    });

    defineDamage("shadowball", "core", {});

    stages("shadowball", [
        { level: 40, values: { core: 94, reach: 15 } }
    ]);

    describe("shadowball", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["sunderChance","sunderStage"] },
        { key: "description.2", values: ["velocity", "reach", "radius"] },
        { key: "description.3", values: ["pref.dense"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.reach"] }
    ]);
}
