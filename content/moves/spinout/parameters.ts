/**
 * 疾速转轮 / spinout —— 参数与伤害段。本族「转体抡击」的移动成员。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Steel／物理／威力 100／命中 100／PP 5／优先度 0／接触；
 *   `self: { boosts: { spe: -2 } }`（命中后自身速度大幅降低 2 级）、无次要效果；2 位学习者。
 *   描述「通过往腿上增加负荷，以激烈的旋转给予对手伤害。自己的速度会大幅降低。」
 *
 * 翻译：把「往腿上增加负荷、以激烈旋转撞人」翻成即时战斗里的一次**贴地旋转冲进**——压低重心、双脚摩擦
 *   地面冒出火星，整个人像陀螺一样高速旋向目标，撞实后转势收不住、腿被反噬，速度大幅下降 2 级。
 *   它是这族里唯一会移动的招式，也是最贵的自我代价。
 *
 * 与同族分开：狂舞挥打是原地转整圈的覆盖、臂锤/冰锤是原地过顶单体重砸；疾速转轮是唯一**贴地旋转冲进、
 *   命中后自身速度降 2 级**的招式。玩家凭「转着冲过去、撞完自己慢很多」认出它。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   spin       撞击威力：物攻定撞面、**速度**给旋转动量、等级定发力；预旋式 ×1.1。
 *   reach      冲距：速度决定起步多快、身高决定步幅；预旋式冲得更远。
 *   rush       冲速：速度决定每刻推进多少，快的个体冲刺更疾；预旋式更快。
 *   knock      撞开距离：物攻给推力，**目标体重**抵掉一部分。
 *   sparks     磨地火星：速度与体重决定火星密度（也是画面发射量的来源）。
 *   scuffRadius 磨痕半径：体重决定撞击点磨出的地面痕铺多开。
 *   speedLoss  自身速度下降：原生固定 2 级，是这族里最重的自我代价。
 *   tempo/aftercast/recharge：速度定时序、等级定熟练度，预旋式更慢更长。
 *
 * 配置 `preload`（预旋式，默认关）双向取舍：开＝起步前先原地打转蓄势，冲距 ×1.2、冲速 ×1.15、威力 ×1.1、
 *   火星更密，代价是起手 +4 刻、收招 +2 刻、冷却 +8 刻；关（即转式）＝压腿就转，出手快、冷却短，但冲得近、
 *   撞得轻。两向各有适用局面（远距离重撞 vs 即发打断）。
 *
 * 伤害段 `spin` 与参数同名，走共享换算（原始类别 Physical），接触由 `spin` 的 `contact` 落定。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const spinoutMass: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("spinout", {
        /** 撞击威力：基础 98；物攻每比 60 多 1 加 0.5（夹 −14..30）；速度每比 55 快 1 加 0.6（夹 −6..24）；
         *  等级每比 40 高 1 加 0.3（夹 −6..14）；预旋 ×1.1；夹 60..155。 */
        spin: formula(
            F.base(98)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-14, 30))
                .plus(F.stat("speed").minus(55).times(0.6).clamp(-6, 24))
                .plus(F.level().minus(40).times(0.3).clamp(-6, 14))
                .times(F.when(F.pref("preload", text("worldcombat.skill.spinout.preference.preload")), F.const(1.1), F.const(1.0)))
                .clamp(60, 155).round(1),
            "撞击威力", {
                unit: "威力",
                description: "旋转撞上目标那一下的基础威力；物攻定撞面、速度给旋转的动量、等级越高越稳。预旋式转得更满，撞得更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲距：基础 3.0 格；速度每比 55 快 1 加 0.012（夹 −0.25..0.9）；身高每比 1.4 高 1 格加 0.4（夹 −0.2..0.7）；
         *  预旋 ×1.2；夹 2.2..5.2。 */
        reach: formula(
            F.base(3.0)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(-0.25, 0.9))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.7))
                .times(F.when(F.pref("preload", text("worldcombat.skill.spinout.preference.preload")), F.const(1.2), F.const(1.0)))
                .clamp(2.2, 5.2).round(2),
            "冲距", {
                unit: "格",
                description: "从起步到撞上目标能冲多远；速度决定起步、身高决定步幅，预旋式冲得更远。它也是本招的实际射程。"
            }),
        /** 冲速：基础 0.6 格/刻；速度每比 55 快 1 加 0.004（夹 −0.1..0.3）；预旋 ×1.15；夹 0.35..1.1。 */
        rush: formula(
            F.base(0.6).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.3))
                .times(F.when(F.pref("preload", text("worldcombat.skill.spinout.preference.preload")), F.const(1.15), F.const(1.0)))
                .clamp(0.35, 1.1).round(2),
            "冲速", {
                unit: "格/刻",
                description: "旋转冲刺时每刻推进的距离；速度快的个体转得更疾，越快贴上目标越难被走位甩掉，预旋式更快。"
            }),
        /** 撞开距离：基础 0.6 格；物攻每比 60 多 1 加 0.008（夹 −0.2..0.7）；目标体重每比 300hg 重 1hg 减 0.0005（最多减 0.6）；
         *  夹 0.2..1.8。 */
        knock: formula(
            F.base(0.6)
                .plus(F.stat("attack").minus(60).times(0.008).clamp(-0.2, 0.7))
                .minus(spinoutMass.minus(300).times(0.0005).clamp(0, 0.6))
                .clamp(0.2, 1.8).round(2),
            "撞开距离", {
                unit: "格",
                description: "旋转撞上把目标顶开多远；物攻越强推得越远，目标越重越推不动。"
            }),
        /** 磨地火星：基础 14；速度每比 55 快 1 加 0.2（夹 −3..14）；体重每比 300hg 多 1hg 加 0.015（夹 −3..9）；
         *  预旋 +6；夹 8..40 并向下取整。 */
        sparks: formula(
            F.base(14)
                .plus(F.stat("speed").minus(55).times(0.2).clamp(-3, 14))
                .plus(F.body("weight").minus(300).times(0.015).clamp(-3, 9))
                .plus(F.when(F.pref("preload", text("worldcombat.skill.spinout.preference.preload")), F.const(6), F.const(0)))
                .clamp(8, 40).floor(),
            "磨地火星", {
                unit: "点",
                description: "旋转时双脚摩擦地面冒出的火星数量；速度与体重越高磨得越密，直接驱动画面的发射量；预旋式更密。"
            }),
        /** 磨痕半径：基础 1.2 格；体重每比 300hg 多 1hg 加 0.001（夹 −0.1..0.6）；夹 0.8..2.2。 */
        scuffRadius: formula(
            F.base(1.2).plus(F.body("weight").minus(300).times(0.001).clamp(-0.1, 0.6)).clamp(0.8, 2.2).round(2),
            "磨痕半径", {
                unit: "格",
                description: "撞击点地面被旋转磨出的痕迹铺多开；身体越沉磨得越广。画出的那圈就是这个半径。"
            }),
        /** 自身速度下降级：原生固定 2 级；夹 2..6。 */
        speedLoss: formula(
            F.const(2).clamp(2, 6).round(0),
            "自身速度下降", {
                unit: "级",
                description: "转势收不住后自身速度下降的能力等级；原生固定 2 级，是这族里最重的自我代价。"
            }),
        /** 起手：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1.5..2）；预旋 +4；夹 6..18。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("preload", text("worldcombat.skill.spinout.preference.preload")), F.const(4), F.const(0)))
                .clamp(6, 18).round(0),
            "起手", "压低重心、把腿蹬起来的时间；速度越快越短，预旋式先原地打转多花几刻。"),
        /** 收招：基础 12 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；预旋 +2；夹 7..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5))
                .plus(F.when(F.pref("preload", text("worldcombat.skill.spinout.preference.preload")), F.const(2), F.const(0)))
                .clamp(7, 18).round(0),
            "收招", "撞完把转速刹住、重新站稳的时间；预旋式转得更猛，收得更久。"),
        /** 冷却：基础 40 刻；等级每比 40 高 1 减 0.06（夹 −3..6）；预旋 +8；夹 28..60。 */
        recharge: seconds(
            F.base(40).minus(F.level().minus(40).times(0.06).clamp(-3, 6))
                .plus(F.when(F.pref("preload", text("worldcombat.skill.spinout.preference.preload")), F.const(8), F.const(0)))
                .clamp(28, 60).round(0),
            "冷却", "两次旋转冲刺之间等多久；等级越高回气越快，预旋式缓得更久。")
    });

    stages("spinout", [
        { level: 55, values: { spin: 108, knock: 0.8 } },
        { level: 62, values: { spin: 118, reach: 4.0 } }
    ]);

    defineDamage("spinout", "spin", {}, { contact: true });

    describe("spinout", [
        { key: "description.0", values: ["spin","reach"] },
        { key: "description.1", values: ["knock","speedLoss"] },
        { key: "description.2", values: ["rush"] },
        { key: "preload.on", values: [], when: function (context) { return read(context.detail.values, ["preload"]) === true; } },
        { key: "preload.off", values: [], when: function (context) { return read(context.detail.values, ["preload"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spin", "tier.0.knock"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spin", "tier.1.reach"] }
    ]);
}
