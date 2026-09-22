/**
 * 狂舞挥打 / brutalswing —— 参数与伤害段。本族「转体抡击」的覆盖基准。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Dark／物理／威力 60／命中 100／PP 20／优先度 0／接触；
 *   `target: "allAdjacent"`（打到身边所有目标）、无次要效果、无自身代价；133 位学习者。
 *   描述「用自己的身体狂舞挥打，给予对手伤害。」
 *
 * 翻译：把「用身体乱舞挥打一圈」翻成即时战斗里的一次**原地横扫**——压身收臂后整个人横转一整圈，
 *   圈带扫过的每个敌人都挨一记，被扫到的沿离心方向甩开一点；转完就站稳，不减速。它是这族里
 *   唯一没有自身代价的成员，代价是没有单体爆发、半径很短、必须钻进人堆。
 *
 * 与同族分开：臂锤/冰锤是原地过顶单体重砸、疾速转轮是贴地旋转冲进；狂舞挥打是**唯一原地转整圈、
 *   一圈内每个敌人都各挨一次**的招式。玩家凭「贴身、转一圈、所有近身的人一起被扫开」认出它。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   sweep  横扫威力：物攻给力、**体重**给转动惯量、等级抬升；广抡式把力分薄。
 *   reach  横扫半径：身高给臂展、速度给旋转覆盖的圆周；广抡式更宽。
 *   jolt   扫飞距离：体重给离心推力，**目标体重**抵掉一部分；广抡式甩得更狠。
 *   lap    转身一圈耗时：速度决定转多快；它也是画面上那道弧扫一圈所需的时间。
 *   tempo/aftercast/recharge：速度定起手与收招、等级定熟练度，广抡式更慢。
 *
 * 配置 `wide`（广抡式，默认关）双向取舍：开＝半径 ×1.18、扫飞 ×1.3、胳膊伸得更开，代价是单发威力
 *   ×0.85、转身与收招各多 3 刻、冷却 +6 刻；关（紧抡式）＝贴身一圈更短更快、单发更重，但甩不动、
 *   够不到稍远的人。两向各有适用局面（被围控场 vs 贴身换血）。
 *
 * 伤害段 `sweep` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const brutalswingMass: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("brutalswing", {
        /** 横扫威力：基础 60；物攻每比 60 多 1 加 0.55（夹 −16..34）；体重每比 300hg 多 1hg 加 0.012（夹 −6..12）；
         *  等级每比 20 高 1 加 0.35（夹 0..16）；广抡 ×0.85 / 紧抡 ×1.0；夹 40..130。 */
        sweep: formula(
            F.base(60)
                .plus(F.stat("attack").minus(60).times(0.55).clamp(-16, 34))
                .plus(F.body("weight").minus(300).times(0.012).clamp(-6, 12))
                .plus(F.level().minus(20).times(0.35).clamp(0, 16))
                .times(F.when(F.pref("wide", text("worldcombat.skill.brutalswing.preference.wide")), F.const(0.85), F.const(1.0)))
                .clamp(40, 130).round(1),
            "横扫威力", {
                unit: "威力",
                description: "横转一圈时每扫中一个人所带的力；物攻给力、身体越沉转动惯量越大、等级越高越稳。广抡式把这一圈铺得更开，单发轻一点。对手防御、相性与暴击在命中时另算。"
            }),
        /** 横扫半径：基础 3.0 格；身高每比 1.4 高 1 格加 0.7（夹 −0.3..1.4）；速度每比 55 快 1 加 0.01（夹 −0.2..0.7）；
         *  广抡 ×1.18；夹 2.4..5.0。 */
        reach: formula(
            F.base(3.0)
                .plus(F.body("height").minus(1.4).times(0.7).clamp(-0.3, 1.4))
                .plus(F.stat("speed").minus(55).times(0.01).clamp(-0.2, 0.7))
                .times(F.when(F.pref("wide", text("worldcombat.skill.brutalswing.preference.wide")), F.const(1.18), F.const(1.0)))
                .clamp(2.4, 5.0).round(2),
            "横扫半径", {
                unit: "格",
                description: "这一圈扫到多远；身高给臂展、速度让转起来的覆盖更开，广抡式再伸开一截。它也是本招的实际射程与地面那圈的范围。"
            }),
        /** 扫飞距离：基础 0.7 格；体重每比 300hg 多 1hg 加 0.0018（夹 −0.25..0.9）；目标体重每比 300hg 重 1hg 减 0.0005（最多减 0.6）；
         *  广抡 ×1.3；夹 0.25..2.2。 */
        jolt: formula(
            F.base(0.7)
                .plus(F.body("weight").minus(300).times(0.0018).clamp(-0.25, 0.9))
                .minus(brutalswingMass.minus(300).times(0.0005).clamp(0, 0.6))
                .times(F.when(F.pref("wide", text("worldcombat.skill.brutalswing.preference.wide")), F.const(1.3), F.const(1.0)))
                .clamp(0.25, 2.2).round(2),
            "扫飞距离", {
                unit: "格",
                description: "被这一圈扫中的人沿离心方向被甩开多远；身体越沉甩得越狠，目标越重越甩不动，广抡式甩得更开。"
            }),
        /** 转身一圈：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −2..3）；广抡 +3；夹 6..18。 */
        lap: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.brutalswing.preference.wide")), F.const(3), F.const(0)))
                .clamp(6, 18).round(0),
            "转身一圈", "从起转到转完一整圈要多久；速度越快转得越短，弧扫过每个人的间隔也更短。广抡式转得久一点。"),
        /** 起手：基础 9 刻；速度每比 55 快 1 减 0.03（夹 −1.5..2）；广抡 +2；夹 5..15。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.brutalswing.preference.wide")), F.const(2), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "压身收臂、把重心放进去的时间；速度越快越短，广抡式多蓄一下。"),
        /** 收招：基础 8 刻；速度每比 55 快 1 减 0.02（夹 −1.5..2）；广抡 +3；夹 5..16。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.brutalswing.preference.wide")), F.const(3), F.const(0)))
                .clamp(5, 16).round(0),
            "收招", "转完把转速刹住、重新站稳的时间；广抡式转得更开，收得更久。"),
        /** 冷却：基础 24 刻；等级每比 20 高 1 减 0.05（夹 −3..6）；广抡 +6；夹 16..34。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(20).times(0.05).clamp(-3, 6))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.brutalswing.preference.wide")), F.const(6), F.const(0)))
                .clamp(16, 34).round(0),
            "冷却", "两次横扫之间等多久；等级越高越熟练，广抡式缓得更久。")
    });

    stages("brutalswing", [
        { level: 28, values: { sweep: 68, reach: 3.4 } },
        { level: 44, values: { sweep: 76, jolt: 1.0 } }
    ]);

    defineDamage("brutalswing", "sweep", {}, { contact: true });

    describe("brutalswing", [
        { key: "description.0", values: ["sweep", "reach"] },
        { key: "description.1", values: ["jolt", "lap"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sweep", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sweep", "tier.1.jolt"] }
    ]);
}
