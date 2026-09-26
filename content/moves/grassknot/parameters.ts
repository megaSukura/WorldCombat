/**
 * 打草结 / grassknot 的参数与伤害段。
 *
 * 原生事实：Grass、**特殊**、命中 100、PP 20、接触无、威力按**对手体重**分档（<10kg 20、<25kg 40、<50kg 60、<100kg 80、
 * <200kg 100、≥200kg 120）（Cobblemon 1.8，304 位学习者）。
 * 翻译：把「用草缠住并绊倒对手」翻成**从地下抽出的缠绊**——施法者不碰对手，只把脚下的草与根须叫起来，
 * 让对手自己被自己的分量带倒。**对手的体重就是这招的武器**，且它是远程、特殊的一招：施法者给的只是缠缚的巧劲（特攻）。
 *
 * 数据分散（每项读不同的精灵数据；目标侧用目标事实，来源侧用施法者事实）：
 *   snare      缠绊威力：**目标体重**给出分量（越重摔得越狠）+ 施法者特攻（缠缚的巧劲）+ 等级。
 *   snareRadius 缠结范围：施法者特攻 + 等级；缠得越广，越难一步迈出。
 *   snareDelay 缠绊延迟：施法者速度；生长追得越快，对手的闪避窗口越短。配置 knot 拉长。
 *   rootTicks  绊住时长：**目标体重**（越重越难立刻爬起）+ 配置 knot。
 *   tripTicks  失衡持续：**目标体重** + 等级；带着 tripped 身份的时间。
 *   tripStages 掉速等级：**目标体重**（1..3 级，对其他战斗者落到移动速度属性）。
 *   reach      播种距离：施法者特攻 + 等级；驱动目标接受范围。
 *   prepare/recover/cooldown 起手／收招／冷却：速度与等级，配置 knot 另加。
 *
 * 本招不留任何世界方块：低伏的根结只在延迟里存在，收拢即散，因此没有留存参数。
 *
 * 配置 `knot`（缠绞式，默认关）双向取舍：开＝缠结范围更大、绊住更久、失衡更重，但缠绊延迟更长（更容易被迈开）、
 * 单发威力略低、收招与冷却更久；关＝小范围快绊，单发更重、出手更快。两向各有局面（控场 vs 速伤）。
 *
 * 伤害段 `snare` 与参数同名；属性与分类沿用原生 Grass／特殊，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg，与原生体重同单位）：宝可梦读原生体重；其他生物没有体重，按碰撞箱体积估算，
     *  让「分量」这一念对任意对手都读得出来。 */
    const grassknotMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("grassknot", {
        /** 缠绊威力：基础 20；目标体重每比 10kg 多 1kg 加 0.55（上限 +100）；特攻每比 60 多 1 加 0.18（上限 +18）；等级每高 1 级加 0.15（上限 +12）；缠绞 ×0.9 / 快绊 ×1.05；夹在 18..155。 */
        snare: formula(
            F.base(20)
                .plus(grassknotMassNode.minus(100).times(0.055).clamp(0, 100))
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-5, 18))
                .plus(F.level().minus(20).times(0.15).clamp(0, 12))
                .times(F.when(F.pref("knot", text("worldcombat.skill.grassknot.preference.knot")), F.const(0.9), F.const(1.05)))
                .clamp(18, 155).round(1),
            "缠绊威力", {
                unit: "威力",
                description: "藤蔓收拢时把目标带倒的基础威力；**对手越重越狠**（这一招的主要来源），施法者的特攻给出缠缚的巧劲。命中时的防御、相性与暴击另算，且对手体重只有命中时才读得到。"
            }),
        /** 缠结范围：基础 1.7 格；特攻每比 60 多 1 加 0.01（上限 +0.9）；等级每高 1 级加 0.01（上限 +0.5）；缠绞 ×1.25 / 快绊 ×0.9；夹在 1.4..3.4。 */
        snareRadius: formula(
            F.base(1.7)
                .plus(F.stat("specialAttack").minus(60).times(0.01).clamp(-0.2, 0.9))
                .plus(F.level().minus(20).times(0.01).clamp(0, 0.5))
                .times(F.when(F.pref("knot", text("worldcombat.skill.grassknot.preference.knot")), F.const(1.25), F.const(0.9)))
                .clamp(1.4, 3.4).round(2),
            "缠结范围", {
                unit: "格",
                description: "草皮与根须铺开的半径；站在这块地里的人会被缠住。缠绞式铺得更广。"
            }),
        /** 缠绊延迟：基础 12 刻；速度每比 60 快 1 减 0.05 刻（上限 −4）；缠绞 +3；夹在 6..20。 */
        snareDelay: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.05).clamp(-1, 4))
                .plus(F.when(F.pref("knot", text("worldcombat.skill.grassknot.preference.knot")), F.const(3), F.const(0)))
                .clamp(6, 20).round(0),
            "缠绊延迟", "草皮钻出到藤蔓收拢之间的时间；这段时间里目标走出范围就能整发躲开。缠绞式收得更慢。"),
        /** 绊住时长：基础 10 刻；目标体重每比 10kg 多 1kg 加 0.06 刻（上限 +20）；缠绞 ×1.3；夹在 8..34。 */
        rootTicks: seconds(
            F.base(10).plus(grassknotMassNode.minus(100).times(0.006).clamp(0, 20))
                .times(F.when(F.pref("knot", text("worldcombat.skill.grassknot.preference.knot")), F.const(1.3), F.const(0.85)))
                .clamp(8, 34).round(0),
            "绊住时长", "倒下后短时间无法迈步的时间；越重的目标越难立刻爬起。"),
        /** 失衡持续：基础 50 刻；目标体重每比 10kg 多 1kg 加 0.1 刻（上限 +40）；等级每高 1 级加 0.8（上限 +24）；夹在 40..150。 */
        tripTicks: seconds(
            F.base(50).plus(grassknotMassNode.minus(100).times(0.01).clamp(0, 40))
                .plus(F.level().minus(20).times(0.8).clamp(0, 24))
                .clamp(40, 150).round(0),
            "失衡持续", "带着 tripped 身份的持续时间；这段时间里目标一直被缠着腿脚。"),
        /** 掉速等级：基础 1；目标体重每比 25kg 多 1 级阈加 1，最多 3 级；夹在 1..3。 */
        tripStages: formula(
            F.base(1).plus(grassknotMassNode.gte(500).times(F.const(1))).plus(grassknotMassNode.gte(1000).times(F.const(1)))
                .clamp(1, 3).round(0),
            "掉速等级", {
                unit: "级",
                description: "失衡期间下降的速度能力等级；越重掉得越多（对宝可梦落到原生等级，对其他战斗者落到移动速度属性）。"
            }),
        /** 播种距离：基础 6 格；特攻每比 60 多 1 加 0.03（上限 +3）；等级每高 1 级加 0.02（上限 +2）；夹在 5..11。 */
        reach: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-0.5, 3))
                .plus(F.level().minus(20).times(0.02).clamp(0, 2))
                .clamp(5, 11).round(2),
            "播种距离", {
                unit: "格",
                description: "能从多远把草种到对手脚下；驱动目标接受范围。"
            }),
        /** 起手：基础 8 刻；速度每比 60 快 1 减 0.04 刻（上限 −3）；夹在 5..14。 */
        prepare: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.04).clamp(-1, 3)).clamp(5, 14).round(0),
            "起手", "俯身把手按进土里、把草唤起来的时间。"),
        /** 收招：基础 7 刻；速度每比 60 快 1 减 0.03 刻（上限 −3）；夹在 4..12。 */
        recover: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 3)).clamp(4, 12).round(0),
            "收招", "藤蔓收拢后的收势。"),
        /** 冷却：基础 26 刻；速度每比 60 快 1 减 0.1 刻（上限 −8）；缠绞 +8；夹在 14..48。 */
        cooldown: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.1).clamp(-2, 8))
                .plus(F.when(F.pref("knot", text("worldcombat.skill.grassknot.preference.knot")), F.const(8), F.const(0)))
                .clamp(14, 48).round(0),
            "冷却", "两次打草结之间的等待；缠绞式缓得更久。")
    });

    stages("grassknot", [
        { level: 24, values: { snare: 44 } },
        { level: 44, values: { snare: 60, snareRadius: 2.2 } }
    ]);

    defineDamage("grassknot", "snare", {});

    describe("grassknot", [
        { key: "description.0", values: ["snare","snareRadius"] },
        { key: "description.1", values: ["snareDelay"] },
        { key: "description.2", values: ["rootTicks","tripTicks","tripStages"] },
        { key: "knot.on", values: [], when: function (context) { return read(context.detail.values, ["knot"]) === true; } },
        { key: "knot.off", values: [], when: function (context) { return read(context.detail.values, ["knot"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.snare"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.snare", "tier.1.snareRadius"] }
    ]);
}
