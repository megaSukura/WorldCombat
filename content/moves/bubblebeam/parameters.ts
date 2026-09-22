/**
 * 泡沫光线 / bubblebeam 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 65／命中 100／PP 20／目标单体／10% 概率使目标速度下降 1 级；
 *   102 位学习者（Cobblemon 1.8 / Showdown）。描述「向对手猛烈地喷射泡沫进行攻击。有时会降低对手的速度」。
 *
 * 翻译：把「喷射泡沫」落成一记**会黏的泡沫浪**——一团泡沫迎头涌出，命中处炸开，并沿准线继续涌开一个锥面，
 *   主目标吃 `foam`，锥内其余敌人被溅沫糊上、吃较轻的 `splash`；被打到的人身上黏一层泡沫（共享身份
 *   `world_combat:status/foamed`），并按概率掉速度等级。它打不疼，但越打越沉——这是它区别于同族水招的地方。
 *
 * 与场上最像的招分开：水枪是细快不沾的线、水炮是整柱水把人顶开、加农水炮是高压柱+力竭；泡沫光线是
 *   **唯一会黏住目标、把人变慢的水属性喷射**，画面上是一大团会散开会浮起的泡。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   foam       泡沫威力：特攻定泡沫的冲力，等级定泡沫的稠。
 *   splash     溅沫威力：特攻决定溅到锥内旁人那一下有多重。
 *   slowChance 黏滞概率：原生 10% 起，特攻与等级提高咬住的机会；浓沫更高。
 *   slowStages 掉速级数：特攻高（或浓沫）时一次掉 2 级。
 *   clingTicks 泡沫时长：等级与配置决定泡沫黏多久（也是共享身份的存续窗口）。
 *   radius     泡沫团判定：体型高度定泡沫团的粗细。
 *   foamRadius 溅沫半径：碰撞箱宽度决定锥面涌开多远，也是画面泡沫雾的半径。
 *   velocity   泡沫速度：速度定泡沫团飞得多急。
 *   reach      射程：特攻与等级决定能喷多远，也是本招实际射程来源。
 *   bubbles    泡数：特攻与等级换算的泡沫数量，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏。
 *
 * 配置 `dense`（浓沫）双向取舍（默认关）：
 *   开＝黏滞概率 +10%、可掉 2 级、泡沫时长 ×1.3、溅沫半径 ×1.4；代价是泡沫威力 ×0.82、速度 ×0.85、
 *     起手 +2 刻、冷却 +4 刻——黏而软。
 *   关（急泡）＝泡沫威力 ×1.12、速度 ×1.12、射程 +2；代价是黏滞概率 −4%、泡沫时长 ×0.8——快而脆。
 *
 * 伤害段 `foam`（主目标）与 `splash`（锥内旁人）走共享换算（原生类别 Special）；对手特防、相性与暴击命中时另算。
 * 速度下降用共享能力等级阶梯 NativeEffects.boost(..., "spe", -n)，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    actionParameters.define("bubblebeam", {
        /** 泡沫威力：基础 65，特攻每比 55 多 1 加 0.28（夹 −14..34），等级每比 25 多 1 加 0.4（夹 0..12）；
         *  浓沫 ×0.82 / 急泡 ×1.12；夹 42..118。 */
        foam: formula(
            F.base(65)
                .plus(F.stat("specialAttack").minus(55).times(0.28).clamp(-14, 34))
                .plus(F.level().minus(25).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("dense"), F.const(0.82), F.const(1.12)))
                .clamp(42, 118).round(1),
            "泡沫威力", {
                unit: "威力",
                description: "泡沫团迎头打在主目标上的基础威力；特攻越高泡沫冲力越足，等级让泡沫更稠。浓沫更软。对手特防、相性与暴击在命中时另算。"
            }),
        /** 溅沫威力：基础 24，特攻每比 55 多 1 加 0.14（夹 −6..16）；浓沫 ×1.2 / 急泡 ×1；夹 16..54。 */
        splash: formula(
            F.base(24)
                .plus(F.stat("specialAttack").minus(55).times(0.14).clamp(-6, 16))
                .times(F.when(F.pref("dense"), F.const(1.2), F.const(1)))
                .clamp(16, 54).round(1),
            "溅沫威力", {
                unit: "威力",
                description: "泡沫沿准线涌开的锥面里，旁人被溅沫糊上那一下的威力；特攻越高越重，浓沫更盛。"
            }),
        /** 黏滞概率：基础 0.10，特攻每比 55 多 1 加 0.0018（夹 0..0.16），等级每比 25 多 1 加 0.0012（夹 0..0.06）；
         *  浓沫 +0.10 / 急泡 −0.04；夹 0.06..0.42。 */
        slowChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(55).times(0.0018).clamp(0, 0.16))
                .plus(F.level().minus(25).times(0.0012).clamp(0, 0.06))
                .plus(F.when(F.pref("dense"), F.const(0.10), F.const(-0.04)))
                .clamp(0.06, 0.42).round(3),
            "黏滞概率", "泡沫黏住目标、把它速度降下来的概率；原生 10% 起，特攻与等级越高越容易咬住，浓沫更高。"),
        /** 掉速级数：基础 1，特攻 ≥78 或浓沫时 +1；夹 1..2。 */
        slowStages: formula(
            F.base(1)
                .plus(F.when(F.stat("specialAttack").gte(78).plus(F.when(F.pref("dense"), F.const(1), F.const(0))).gte(1),
                    F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "掉速级数", {
                unit: "级",
                description: "被泡沫黏住时一次掉几级速度；特攻很高的个体（≥78）或浓沫形态会一次掉 2 级。速度等级对宝可梦、原版生物、玩家同一条路。"
            }),
        /** 泡沫时长：基础 120 刻，等级每比 25 多 1 加 2（夹 0..140）；浓沫 ×1.3 / 急泡 ×0.8；夹 80..320。 */
        clingTicks: seconds(
            F.base(120).plus(F.level().minus(25).times(2).clamp(0, 140))
                .times(F.when(F.pref("dense"), F.const(1.3), F.const(0.8)))
                .clamp(80, 320).round(0),
            "泡沫时长", "泡沫在目标身上黏多久；这既是共享身份 world_combat:status/foamed 的窗口，也是身上持续冒泡的时间。浓沫更久。"),
        /** 泡沫团判定：基础 0.28 格，碰撞箱每比 1.4 高 0.05（夹 −0.04..0.14）；夹 0.22..0.5。 */
        radius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.04, 0.14)).clamp(0.22, 0.5).round(2),
            "泡沫团判定", {
                unit: "格",
                description: "泡沫团飞行与命中的判定粗细；体型越高泡沫团越大。画面里那团泡的宽度就是它。"
            }),
        /** 溅沫半径：基础 2.0 格，碰撞箱每比 0.9 宽 0.6（夹 −0.3..1.4）；浓沫 ×1.4 / 急泡 ×1；夹 1.4..3.8。 */
        foamRadius: formula(
            F.base(2.0).plus(F.body("width").minus(0.9).times(0.6).clamp(-0.3, 1.4))
                .times(F.when(F.pref("dense"), F.const(1.4), F.const(1)))
                .clamp(1.4, 3.8).round(2),
            "溅沫半径", {
                unit: "格",
                description: "泡沫沿准线涌开多远、能罩到目标前方多大一片；身体越宽涌得越开，浓沫更大。画面里泡沫雾的范围就是它。"
            }),
        /** 泡沫速度：基础 1.2，速度每比 55 快 1 加 0.008（夹 −0.15..0.4）；浓沫 ×0.85 / 急泡 ×1.12；夹 0.9..1.9。 */
        velocity: formula(
            F.base(1.2)
                .plus(F.stat("speed").minus(55).times(0.008).clamp(-0.15, 0.4))
                .times(F.when(F.pref("dense"), F.const(0.85), F.const(1.12)))
                .clamp(0.9, 1.9).round(2),
            "泡沫速度", {
                unit: "格/刻",
                description: "泡沫团飞行的速度；速度快的个体喷得更急，浓沫更慢、更黏。"
            }),
        /** 射程：基础 12，特攻每比 55 多 1 加 0.04（夹 −2..4），等级每比 25 多 1 加 0.06（夹 0..2），
         *  急泡 +2；夹 9..17。 */
        reach: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(55).times(0.04).clamp(-2, 4))
                .plus(F.level().minus(25).times(0.06).clamp(0, 2))
                .plus(F.when(F.pref("dense"), F.const(0), F.const(2)))
                .clamp(9, 17).round(1),
            "射程", {
                unit: "格",
                description: "泡沫能喷到多远；特攻高、等级高的个体送得更远，急泡更远。它也是本招的实际射程来源。"
            }),
        /** 泡数：基础 22，特攻每比 55 多 1 加 0.4（夹 −5..22），等级每比 25 多 1 加 0.4（夹 0..8）；夹 16..60。 */
        bubbles: formula(
            F.base(22)
                .plus(F.stat("specialAttack").minus(55).times(0.4).clamp(-5, 22))
                .plus(F.level().minus(25).times(0.4).clamp(0, 8))
                .clamp(16, 60).round(0),
            "泡数", {
                unit: "个",
                description: "泡沫团与命中处用到的泡沫点数，由特攻与等级换算；它驱动表现里的泡密度，不是独立伤害。"
            }),
        /** 起手：基础 10 刻，速度每比 55 快 1 减 0.04（夹 −1.5..3）；浓沫 +2；夹 6..15。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("dense"), F.const(2), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把泡沫囤到口边再喷出的时间；速度越快越短，浓沫要多囤一下。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 减 0.035（夹 −1..2）；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.035).clamp(-1, 2)).clamp(5, 12).round(0),
            "收招", "喷完泡沫后收势的时间；快的个体更利落。"),
        /** 冷却：基础 30 刻，速度每比 55 快 1 减 0.055（夹 −3..6）；浓沫 +4；夹 18..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.055).clamp(-3, 6))
                .plus(F.when(F.pref("dense"), F.const(4), F.const(0)))
                .clamp(18, 46).round(0),
            "冷却", "再囤一团泡沫前等待多久；速度快的个体回得稍快，浓沫更久。")
    });

    stages("bubblebeam", [
        { level: 32, values: { foam: 76, foamRadius: 2.3 } },
        { level: 48, values: { foam: 84, slowChance: 0.2, clingTicks: 200 } }
    ]);

    defineDamage("bubblebeam", "foam", {}, {});
    defineDamage("bubblebeam", "splash", {}, {});

    describe("bubblebeam", [
        { key: "description.0", values: ["foam"] },
        { key: "description.1", values: ["radius", "velocity", "reach"] },
        { key: "description.2", values: ["slowChance", "slowStages", "clingTicks"] },
        { key: "description.3", values: ["splash", "foamRadius"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === true; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.foam", "tier.0.foamRadius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.foam", "tier.1.slowChance", "tier.1.clingTicks"] }
    ]);
}
