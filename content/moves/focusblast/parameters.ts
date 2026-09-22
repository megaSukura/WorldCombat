/**
 * 真气弹 / focusblast —— 参数与伤害段。
 *
 * 原生事实：Fighting／特殊／威力 120／命中 70／PP 5／bullet／目标单体／10% 概率让目标特防下降 1 级。
 *
 * 翻译：把「提高气势，释放出全部力量」落成一记**站定蓄势后的重击**。施法者先沉身、把气在体内压紧
 * （长起手、可被打断），再把一团不稳定的真气直线砸出去；它是磨防远击四式里最重的一发，也是唯一会把人
 * **推开**、并且由于力量太满而**飞偏**的那个——命中 70 用「散布角」如实翻译：等级越高、特攻越稳，
 * 散布越小，球才越听话。它不留任何东西：纯力，来去都散。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          真气威力：特攻定力量，等级定气的凝练。
 *   scatter       散布角：等级与特攻决定这发偏离准线的角度，直接译为飞行偏移。
 *   velocity      飞行速度：速度定脱手初速。
 *   radius        判定半径：碰撞箱高度定气团大小。
 *   reach         射程：特攻定能砸多远。
 *   charge        蓄势时间：速度决定压气多快；也是对手打断/走位的窗口。
 *   sunderChance  碾防概率：特攻与等级共同决定，基础 10% 取自原生。
 *   sunderStage   碾防级数：固定 1 级，与原生一致。
 *   blowback      击退距离：特攻决定把人推开多远。
 *   motes         气点数量：特攻与等级决定蓄势时聚拢的气点，也驱动表现。
 *
 * 配置 `unleash`（全力释放）：开启＝威力 ×1.12，但散布 ×1.5、冷却 +4 刻；关闭＝更收敛、更稳但略轻。
 * 两向各有适用局面（对站桩硬砸 vs 对灵活目标保命中）。
 *
 * 伤害段 `core`：真气团命中那一下，走共享换算（原生类别 Special）。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -1)。
 */
namespace PokemonSkills {
    actionParameters.define("focusblast", {
        core: formula(
            F.base(116)
                .plus(F.stat("specialAttack").minus(70).times(0.28).clamp(-22, 40))
                .plus(F.level().minus(34).times(0.6).clamp(0, 16))
                .times(F.when(F.pref("unleash"), F.const(1.12), F.const(1)))
                .clamp(70, 192).round(1),
            "真气威力", {
                unit: "威力",
                description: "真气团命中那一下的基础威力；全族最重。特攻越高力量越足，等级越高气越凝练。对手特防、相性与暴击在命中时另算。"
            }),
        scatter: formula(
            F.base(9)
                .minus(F.level().minus(34).times(0.12).clamp(-1.5, 4))
                .minus(F.stat("specialAttack").minus(70).times(0.02).clamp(-1.5, 2))
                .times(F.when(F.pref("unleash"), F.const(1.5), F.const(1)))
                .clamp(2, 20).round(1),
            "散布角", {
                unit: "度",
                description: "这一发偏离准线的最大角度；等级与特攻越高越稳、偏得越少，全力释放形态更难控。它是「命中 70」在即时战斗里的翻译：偏得越多越可能打空。"
            }),
        velocity: formula(
            F.base(1.6).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.3, 0.7)).clamp(1.0, 2.6).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "真气团脱手时的初速；速度快的个体砸得更急。"
            }),
        radius: formula(
            F.base(0.3).plus(F.body("height").minus(1.5).times(0.06)).clamp(0.26, 0.5).round(2),
            "判定半径", {
                unit: "格",
                description: "真气团飞行与命中的判定半径；体型越高气团越大。散布越大时，它也更容易擦到旁边的人。"
            }),
        reach: formula(
            F.base(16).plus(F.stat("specialAttack").minus(70).times(0.06).clamp(-2, 5)).clamp(11, 22).round(1),
            "射程", {
                unit: "格",
                description: "真气团能砸出多远；特攻高送得远。它也是本招的实际射程来源。"
            }),
        charge: seconds(
            F.base(26)
                .minus(F.stat("speed").minus(60).times(0.1).clamp(-3, 6))
                .clamp(18, 36).round(0),
            "蓄势时间", "站定把气在体内压紧再放出的时间；速度越快压得越快。这段时间里被打断就不花 PP，也是最容易被走位躲开的窗口。"),
        sunderChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(70).times(0.0014).clamp(-0.04, 0.1))
                .plus(F.level().minus(34).times(0.001).clamp(0, 0.05))
                .clamp(0.06, 0.26).round(3),
            "碾防概率", "命中时把目标特防压低 1 级的概率；原生 10% 起，特攻与等级越高越容易咬住。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        blowback: formula(
            F.base(0.9).plus(F.stat("specialAttack").minus(70).times(0.004).clamp(-0.3, 1.0)).clamp(0.4, 2.2).round(2),
            "击退距离", {
                unit: "格",
                description: "命中时把目标沿气团方向推开的水平距离；特攻越高推得越远。这是它把对手从掩体后或队友身边砸开的手段。"
            }),
        motes: formula(
            F.base(20)
                .plus(F.stat("specialAttack").minus(70).times(0.2))
                .plus(F.level().minus(34).times(0.6))
                .clamp(16, 60).round(),
            "气点数量", {
                unit: "点",
                description: "蓄势时在身前聚拢的气点数量，也驱动表现的密度；特攻与等级越高气越盛。"
            })
    });

    defineDamage("focusblast", "core", {});

    stages("focusblast", [
        { level: 50, values: { core: 138, reach: 18 } }
    ]);

    describe("focusblast", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["scatter", "blowback"] },
        { key: "description.2", values: ["sunderChance", "sunderStage"] },
        { key: "description.3", values: ["charge", "velocity", "reach", "radius", "motes", "pref.unleash"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.reach"] }
    ]);
}
