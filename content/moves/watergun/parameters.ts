/**
 * 水枪 / watergun 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 40／命中 100／PP 25／优先度 0／无次要效果／目标单体；
 *   179 位学习者，是全表最普及的一记水属性起手（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「向对手猛烈地喷射水流」落成**一道又细又快、顺手就能喷的水线**——它不做范围、不做状态、
 *   不做贯穿，卖的是「随时能喷、边走边喷」：起手短、冷却短、PP 耗得省，是缠斗里的随手点射。
 *   代价就是单发最轻，正面拼不过水炮、水波刀。它也是本组里唯一可以在移动中出手的一招。
 *
 * 与场上最像它的招分开：水波刀（aquacutter）是笔直贯穿、切中留湿的刀刃；加农水炮（hydrocannon）
 *   是笔直高压水柱、把人顶开并泼透；水枪既不贯穿也不留状态，画面是「一小口水弹 + 短尾 + 小水花」。
 *
 * 数据分散（每项读不同的精灵数据，两只精灵同一招的差距才看得出来）：
 *   spout     水线威力：特攻定水压，等级让喷射更致密；施法者本身湿透时水更顺（处境）。
 *   pressure  喷射速度：速度决定水线飞得多急、目标多难走位躲开。
 *   radius    水线判定：体型高度决定水线多粗。
 *   reach     射程：特攻与等级决定能喷多远，也是本招的实际射程来源。
 *   drops     水花量：特攻换算的水点数量，驱动表现的水花密度。
 *   tempo／aftercast／recharge：速度定节奏；本招三项都短，是它「随手就喷」的来源。
 *
 * 配置 `charge`（蓄压式）双向取舍（默认关）：
 *   开＝水线威力 ×1.28、判定 ×1.25；代价是喷射速度 ×0.85、射程 −2、起手 +4 刻、冷却 +8 刻——重而近而慢。
 *   关（疾喷式）＝喷射更快、射程 +2、起手与冷却更短；代价是单发威力只有蓄压式的约八成。
 *   两向各有局面：疾喷缠斗、抢手，蓄压补刀、点掉低防目标。
 *
 * 伤害段 `spout` 与参数同名，走共享换算（原生类别 Special）；对手特防、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("watergun", {
        /** 水线威力：基础 40，特攻每比 55 多 1 加 0.22（夹 −10..26），等级每比 25 多 1 加 0.4（夹 0..10）；
         *  施法者湿透 ×1.12；蓄压 ×1.28 / 疾喷 ×1；夹在 26..96。 */
        spout: formula(
            F.base(40)
                .plus(F.stat("specialAttack").minus(55).times(0.22).clamp(-10, 26))
                .plus(F.level().minus(25).times(0.4).clamp(0, 10))
                .times(F.when(F.state("wet", text("worldcombat.skill.watergun.value.wet")), F.const(1.12), F.const(1)))
                .times(F.when(F.pref("charge"), F.const(1.28), F.const(1)))
                .clamp(26, 96).round(1),
            "水线威力", {
                unit: "威力",
                description: "水线命中那一下的基础威力；特攻越高水压越足，等级让水线更致密，施法者本身湿透时水更顺。蓄压式更重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 喷射速度：基础 1.5，速度每比 55 快 1 加 0.008（夹 −0.2..0.5）；蓄压 ×0.85 / 疾喷 ×1；夹 1.15..2.4。 */
        pressure: formula(
            F.base(1.5)
                .plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.5))
                .times(F.when(F.pref("charge"), F.const(0.85), F.const(1)))
                .clamp(1.15, 2.4).round(2),
            "喷射速度", {
                unit: "格/刻",
                description: "水线飞行速度；速度快的个体喷得更急，目标更难走位躲开。蓄压式更沉、飞得更慢。"
            }),
        /** 水线判定：基础 0.2 格，碰撞箱每比 1.4 高 0.04（夹 −0.03..0.12）；蓄压 ×1.25 / 疾喷 ×1；夹 0.16..0.42。 */
        radius: formula(
            F.base(0.2).plus(F.body("height").minus(1.4).times(0.04).clamp(-0.03, 0.12))
                .times(F.when(F.pref("charge"), F.const(1.25), F.const(1)))
                .clamp(0.16, 0.42).round(2),
            "水线判定", {
                unit: "格",
                description: "水线飞行与命中的判定粗细；体型越高水线越粗。画出的水柱宽度就是它。"
            }),
        /** 射程：基础 11，特攻每比 55 多 1 加 0.04（夹 −1.5..3.5），等级每比 25 多 1 加 0.05（夹 0..2），
         *  蓄压 −2；夹 8..16。 */
        reach: formula(
            F.base(11)
                .plus(F.stat("specialAttack").minus(55).times(0.04).clamp(-1.5, 3.5))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2))
                .minus(F.when(F.pref("charge"), F.const(2), F.const(0)))
                .clamp(8, 16).round(1),
            "射程", {
                unit: "格",
                description: "水线能喷到多远；特攻高、等级高的个体送得更远，蓄压式更近。它也是本招的实际射程来源。"
            }),
        /** 水花量：基础 16，特攻每比 55 多 1 加 0.3（夹 −4..20）；夹 12..40。 */
        drops: formula(
            F.base(16).plus(F.stat("specialAttack").minus(55).times(0.3).clamp(-4, 20)).clamp(12, 40).round(0),
            "水花量", {
                unit: "点",
                description: "水线射出与命中时溅出的水点数量，由特攻换算；它驱动表现里的水花密度，不是独立伤害。"
            }),
        /** 起手：基础 6 刻，速度每比 55 快 1 减 0.03（夹 −1.5..2）；蓄压 +4；夹 3..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("charge"), F.const(4), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "从张口到水线喷出的时间；本招很短，速度快的个体更短，蓄压式要多压一下。"),
        /** 收招：基础 5 刻，速度每比 55 快 1 减 0.025（夹 −1..2）；蓄压 +2；夹 2..9。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.025).clamp(-1, 2))
                .plus(F.when(F.pref("charge"), F.const(2), F.const(0)))
                .clamp(2, 9).round(0),
            "收招", "喷完收住水线的时间；快的个体更干脆。"),
        /** 冷却：基础 16 刻，速度每比 55 快 1 减 0.04（夹 −2..4）；蓄压 +8；夹 9..30。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 4))
                .plus(F.when(F.pref("charge"), F.const(8), F.const(0)))
                .clamp(9, 30).round(0),
            "冷却", "再次喷水线前等待多久；本招冷却很短，蓄压式更长。")
    });

    stages("watergun", [
        { level: 28, values: { spout: 46, reach: 12 } },
        { level: 45, values: { spout: 54, drops: 26 } }
    ]);

    defineDamage("watergun", "spout", {}, {});

    describe("watergun", [
        { key: "description.0", values: ["spout"] },
        { key: "description.1", values: ["pressure", "radius", "reach"] },
        { key: "description.mobility", values: [] },
        { key: "charge.on", values: [], when: function (context) { return read(context.detail.values, ["charge"]) === true; } },
        { key: "charge.off", values: [], when: function (context) { return read(context.detail.values, ["charge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spout", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spout"] }
    ]);
}
