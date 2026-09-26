/**
 * 泡沫光线 / bubblebeam 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 65／命中 100／PP 20／目标单体／10% 概率使目标速度下降 1 级；
 *   102 位学习者（Cobblemon 1.8 / Showdown）。描述「向对手猛烈地喷射泡沫进行攻击。有时会降低对手的速度」。
 *
 * 翻译：把「喷射泡沫」落成**一串慢泡泡依次飘过去**——三枚相隔 3 刻、飞得慢的泡球各自沿当刻准线前行，
 *   每颗首次碰到实体或墙就破；整招的主伤预算均分到三颗上，不再有凭空落在终点的扇溅。被泡糊到的目标
 *   黏一层泡沫（共享身份 `world_combat:status/foamed`）、并按概率掉速度等级；同一目标在同一串里至多
 *   判定一次黏滞与一次泡沫，且必须真的被泡伤了才生效。它打不疼，但泡泡飞得慢、能提前布在敌人横移的
 *   路线上逼人绕开——这是它区别于同族快水招的地方。
 *
 * 与场上最像的招分开：水枪是细快不沾的线、水炮是锁死方向 6 刻的整柱、加农水炮是高压柱+力竭；
 *   泡沫光线是**唯一一串慢速占位、会黏住并压速度的泡球**。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   foam       整串泡沫总威力：特攻定泡沫的冲力，等级定泡沫的稠；命中时均分给三颗泡。
 *   slowChance 黏滞概率：原生 10% 起，特攻与等级提高咬住的机会；浓沫更高。
 *   slowStages 掉速级数：特攻高（或浓沫）时一次掉 2 级。
 *   clingTicks 泡沫时长：等级与配置决定泡沫黏多久（也是共享身份的存续窗口）。
 *   radius     泡沫团判定：体型高度定泡球大小；浓沫再放大，急泡收小。
 *   velocity   泡沫速度：速度定泡球飘得多快；本招刻意压到原速的约 0.55，让泡泡慢到能被绕开。
 *   reach      射程：特攻与等级决定能喷多远，也是本招实际射程来源。
 *   spread     泡列散布：速度定三颗泡摊开的弧度；浓沫略扇开、急泡收成窄列。
 *   bubbles    泡数：特攻与等级换算的泡沫数量，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏。
 *
 * 配置 `dense`（浓沫）双向取舍（默认关）：
 *   开＝黏滞概率 +10%、可掉 2 级、泡沫时长 ×1.3、真实泡半径 ×1.25、泡列略扇开；代价是泡沫总威力 ×0.82、
 *     速度 ×0.85、起手 +2 刻、冷却 +4 刻——黏而软。
 *   关（急泡）＝泡沫总威力 ×1.12、速度 ×1.12、射程 +2、泡更小；代价是黏滞概率 −4%、泡沫时长 ×0.8——快而脆。
 *
 * 伤害段 `foam` 走共享换算（原生类别 Special）；对手特防、相性与暴击命中时另算。
 * 速度下降用共享能力等级阶梯 NativeEffects.boost(..., "spe", -n)，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    actionParameters.define("bubblebeam", {
        /** 整串总威力：基础 65，特攻每比 55 多 1 加 0.28（夹 −14..34），等级每比 25 多 1 加 0.4（夹 0..12）；
         *  浓沫 ×0.82 / 急泡 ×1.12；夹 42..118。命中时由三颗泡均分。 */
        foam: formula(
            F.base(65)
                .plus(F.stat("specialAttack").minus(55).times(0.28).clamp(-14, 34))
                .plus(F.level().minus(25).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("dense"), F.const(0.82), F.const(1.12)))
                .clamp(42, 118).round(1),
            "泡沫总威力", {
                unit: "威力",
                description: "一整串三颗泡加起来的总威力，命中时由三颗均分；特攻越高泡沫冲力越足，等级让泡沫更稠。浓沫更软。对手特防、相性与暴击在每颗命中时另算。"
            }),
        /** 黏滞概率：基础 0.10，特攻每比 55 多 1 加 0.0018（夹 0..0.16），等级每比 25 多 1 加 0.0012（夹 0..0.06）；
         *  浓沫 +0.10 / 急泡 −0.04；夹 0.06..0.42。 */
        slowChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(55).times(0.0018).clamp(0, 0.16))
                .plus(F.level().minus(25).times(0.0012).clamp(0, 0.06))
                .plus(F.when(F.pref("dense"), F.const(0.10), F.const(-0.04)))
                .clamp(0.06, 0.42).round(3),
            "黏滞概率", "同一目标在一整串里至多判定一次；泡沫黏住它、把它速度降下来的概率，原生 10% 起，特攻与等级越高越容易咬住，浓沫更高。必须真的被泡伤到才会判定。"),
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
        /** 泡球判定：基础 0.28 格，碰撞箱每比 1.4 高 0.05（夹 −0.04..0.14）；浓沫 ×1.25 / 急泡 ×0.9；夹 0.2..0.6。 */
        radius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.04, 0.14))
                .times(F.when(F.pref("dense"), F.const(1.25), F.const(0.9)))
                .clamp(0.2, 0.6).round(2),
            "泡球判定", {
                unit: "格",
                description: "每颗泡球飞行与首次碰撞的判定半径；体型越高泡越大，浓沫再放大、急泡收小。画面里那颗泡的宽度就是它。"
            }),
        /** 泡沫速度：基础 1.2，速度每比 55 快 1 加 0.008（夹 −0.15..0.4）；浓沫 ×0.85 / 急泡 ×1.12；
         *  再 ×0.55 压成慢泡；夹 0.5..1.1。 */
        velocity: formula(
            F.base(1.2)
                .plus(F.stat("speed").minus(55).times(0.008).clamp(-0.15, 0.4))
                .times(F.when(F.pref("dense"), F.const(0.85), F.const(1.12)))
                .times(F.const(0.55))
                .clamp(0.5, 1.1).round(2),
            "泡沫速度", {
                unit: "格/刻",
                description: "每颗泡球飘行的速度；本招刻意放慢，让敌人看得见、能提前绕开。速度快的个体稍急，浓沫更慢。"
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
                description: "泡球能飘到多远；特攻高、等级高的个体送得更远，急泡更远。它也是本招的实际射程来源。"
            }),
        /** 泡列散布：基础 3°，速度每比 55 快 1 加 0.02°（夹 0..2）；浓沫 ×1.4 / 急泡 ×0.6；夹 1.5..8。 */
        spread: formula(
            F.base(3).plus(F.stat("speed").minus(55).times(0.02).clamp(0, 2))
                .times(F.when(F.pref("dense"), F.const(1.4), F.const(0.6)))
                .clamp(1.5, 8).round(1),
            "泡列散布", {
                unit: "°",
                description: "三颗泡摊开的弧度；浓沫略扇开、急泡收成窄列，速度快的个体摊得更开。玩家也能靠转准心自己摆出小弧列。"
            }),
        /** 泡数：基础 22，特攻每比 55 多 1 加 0.4（夹 −5..22），等级每比 25 多 1 加 0.4（夹 0..8）；夹 16..60。 */
        bubbles: formula(
            F.base(22)
                .plus(F.stat("specialAttack").minus(55).times(0.4).clamp(-5, 22))
                .plus(F.level().minus(25).times(0.4).clamp(0, 8))
                .clamp(16, 60).round(0),
            "泡数", {
                unit: "个",
                description: "泡球与破开处用到的泡沫点数，由特攻与等级换算；它驱动表现里的泡密度，不是独立伤害。"
            }),
        /** 起手：基础 10 刻，速度每比 55 快 1 减 0.04（夹 −1.5..3）；浓沫 +2；夹 6..15。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("dense"), F.const(2), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把第一颗泡囤到口边再喷出的时间；速度越快越短，浓沫要多囤一下。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 减 0.035（夹 −1..2）；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.035).clamp(-1, 2)).clamp(5, 12).round(0),
            "收招", "三颗泡都吐完后收势的时间；快的个体更利落。"),
        /** 冷却：基础 30 刻，速度每比 55 快 1 减 0.055（夹 −3..6）；浓沫 +4；夹 18..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.055).clamp(-3, 6))
                .plus(F.when(F.pref("dense"), F.const(4), F.const(0)))
                .clamp(18, 46).round(0),
            "冷却", "再囤一串泡前等待多久；速度快的个体回得稍快，浓沫更久。")
    });

    stages("bubblebeam", [
        { level: 32, values: { foam: 76, radius: 0.32 } },
        { level: 48, values: { foam: 84, slowChance: 0.2, clingTicks: 200 } }
    ]);

    defineDamage("bubblebeam", "foam", {}, {});

    describe("bubblebeam", [
        { key: "description.0", values: ["foam"] },
        { key: "description.1", values: ["radius", "velocity", "reach", "spread"] },
        { key: "description.2", values: ["slowChance", "slowStages", "clingTicks"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === true; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.foam", "tier.0.radius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.foam", "tier.1.slowChance", "tier.1.clingTicks"] }
    ]);
}
