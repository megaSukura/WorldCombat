/**
 * 火焰球 / pyroball 的参数与伤害段。
 *
 * 原生事实：Fire、物理、威力 120、命中 90、PP 5、bullet／defrost，命中后 10% 概率使目标灼伤
 *   （Cobblemon 1.8 / Showdown），全招 1 位学习者（闪焰王牌）。
 *
 * 翻译：把「点燃小石子，形成火球攻击对手」落成一记**踢出去的火球**——施法者先点燃脚边的小石，
 * 再像抽射一样把它踢出；火球带着焰尾沿一道低弧飞出，命中炸开成一团火与碎石，并可能把目标引燃。
 * 原生 90 命中在这里是**这一脚踢得正不正**：火球出膛时带一点散布，速度快的个体踢得更直，
 * 蛮踢式则更野——玩家能从火球偏没偏读出这一脚。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   blast      火球威力：物攻定踢劲，速度把冲势压进去；蛮踢式 ×1.1。
 *   velocity   出膛速度：速度决定火球飞得多急。
 *   radius     火球半径：体型高度决定火球大小。
 *   reach      射程：物攻决定这一脚能送多远。
 *   scatter    出膛散布：速度决定踢得正不正，蛮踢式更野；它替代原生的命中判定。
 *   burnChance 灼伤概率：原生 10% 起，物攻提高，蛮踢式更易引燃（走共享灼伤默认效果）。
 *   sparks     火星数：物攻与等级派生，表现按它发射。
 *   heat       焦土半径：物攻决定落点烧出多大一片；表现按它画。
 *   scorchTicks 焦土时长：等级决定落点灼痕留多久。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `savage`（蛮踢式）双向取舍：开启＝威力更高、灼伤更易、焦土更大，但出膛散布更大（更难踢正）、
 * 射程 −1.5 格、起手与冷却更久；关闭（精准抽射）＝踢得更直更远更快，代价是威力与引燃都略低。
 *
 * 伤害段 `blast` 走共享换算，bullet 标记写在 defineDamage 上；灼伤走 `impact` 的 `status: "burn"`，
 * 由共享灼伤默认效果落到任何目标上（宝可梦同步原生异常）。
 */
namespace PokemonSkills {
    actionParameters.define("pyroball", {
        blast: formula(
            F.base(120).plus(F.stat("attack").minus(70).times(0.5).clamp(-20, 44))
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-8, 26))
                .times(F.when(F.pref("savage", text("worldcombat.skill.pyroball.preference.savage")), F.const(1.1), F.const(1)))
                .clamp(80, 230).round(1),
            "火球威力", {
                unit: "威力",
                description: "火球炸开这一下的基础威力；物攻越高踢得越重，冲势越猛火越盛，蛮踢式再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        velocity: formula(
            F.base(1.3).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.25, 0.55)).clamp(0.9, 2.0).round(2),
            "出膛速度", {
                unit: "格/刻",
                description: "火球离开脚面的速度；速度快的个体射得更急，目标更难走位躲开。"
            }),
        gravity: formula(
            F.const(0.012), "下坠", {
                unit: "格/刻²",
                description: "火球沿一道低弧飞行的轻微下坠；比直线弹道更飘一点。"
            }),
        radius: formula(
            F.base(0.26).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.03, 0.14)).clamp(0.2, 0.44).round(2),
            "火球半径", {
                unit: "格",
                description: "飞行途中的判定半径；体型越高火球越大。"
            }),
        reach: formula(
            F.base(14).plus(F.stat("attack").minus(70).times(0.04).clamp(-2, 4))
                .minus(F.when(F.pref("savage", text("worldcombat.skill.pyroball.preference.savage")), F.const(1.5), F.const(0)))
                .clamp(11, 20).round(1),
            "射程", {
                unit: "格",
                description: "这一脚能把火球送到多远；物攻高踢得远，蛮踢式收得更近。它也是本招的实际射程来源。"
            }),
        scatter: formula(
            F.base(7).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 3))
                .plus(F.when(F.pref("savage", text("worldcombat.skill.pyroball.preference.savage")), F.const(6), F.const(0)))
                .clamp(2, 18).round(1),
            "出膛散布", {
                unit: "度",
                description: "火球出膛时朝两侧随机的最大偏角，替代原生的命中判定；速度快的个体踢得更直，蛮踢式更野。"
            }),
        burnChance: percent(
            F.base(0.10).plus(F.stat("attack").minus(70).times(0.0012).clamp(-0.03, 0.08))
                .plus(F.when(F.pref("savage", text("worldcombat.skill.pyroball.preference.savage")), F.const(0.04), F.const(0)))
                .clamp(0.06, 0.24).round(3),
            "灼伤概率", "命中的火球把目标引燃的概率；原生 10% 起，物攻越高、蛮踢式越容易。"),
        sparks: formula(
            F.base(18).plus(F.stat("attack").minus(70).times(0.25).clamp(-6, 30))
                .plus(F.level().minus(30).times(0.4).clamp(0, 16))
                .clamp(14, 64).round(0),
            "火星数", {
                unit: "个",
                description: "火球炸开时迸出的火星数量，也驱动表现的密度；物攻与等级越高越碎。"
            }),
        heat: formula(
            F.base(1.2).plus(F.stat("attack").minus(70).times(0.006).clamp(-0.2, 0.7))
                .times(F.when(F.pref("savage", text("worldcombat.skill.pyroball.preference.savage")), F.const(1.2), F.const(1)))
                .clamp(0.9, 2.2).round(2),
            "焦土半径", {
                unit: "格",
                description: "火球落地烧出的灼痕大小；物攻越高、蛮踢式越大。表现里的焦土按它铺开。"
            }),
        scorchTicks: seconds(
            F.base(80).plus(F.level().minus(30).times(1.2).clamp(0, 40)).clamp(60, 160).round(0),
            "焦土时长", "落点那圈灼痕停留多久；等级越高留得越久，到期自然散去。"),
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 4))
                .plus(F.when(F.pref("savage", text("worldcombat.skill.pyroball.preference.savage")), F.const(3), F.const(0)))
                .clamp(8, 20).round(0),
            "起手", "捡起小石、点火并把球拨到脚前的时间；速度越快越短，蛮踢式多蓄一点。"),
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("savage", text("worldcombat.skill.pyroball.preference.savage")), F.const(2), F.const(0)))
                .clamp(6, 15).round(0),
            "收招", "踢完火球后收回站姿的时间；速度越快越利落。"),
        recharge: seconds(
            F.base(46).minus(F.stat("speed").minus(55).times(0.05).clamp(-5, 8))
                .plus(F.when(F.pref("savage", text("worldcombat.skill.pyroball.preference.savage")), F.const(8), F.const(0)))
                .clamp(30, 66).round(0),
            "冷却", "再次点火踢球前的等待；速度越快回得越快，蛮踢式蓄得更久。")
    });

    stages("pyroball", [
        { level: 38, values: { blast: 134, reach: 15.5 } },
        { level: 60, values: { blast: 152, heat: 1.5, sparks: 40 } }
    ]);

    defineDamage("pyroball", "blast", {});

    describe("pyroball", [
        { key: "description.0", values: ["blast", "velocity", "radius", "scatter"] },
        { key: "description.1", values: ["burnChance"] },
        { key: "description.2", values: ["reach"] },
        { key: "savage.on", values: [], when: function (context) { return read(context.detail.values, ["savage"]) === true; } },
        { key: "savage.off", values: [], when: function (context) { return read(context.detail.values, ["savage"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blast"] }
    ]);
}
