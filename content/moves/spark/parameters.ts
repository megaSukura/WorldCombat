/**
 * 电光 / spark 的参数与伤害段。
 *
 * 原生事实：电、物理、威力 65、命中 100、PP 20、接触、30% 麻痹、无反作用力（Cobblemon 1.8，44 位学习者）。
 * 翻译：把「让电流覆盖全身，猛撞向对手，有时让对手麻痹」落成一次**贴身短促的电击突进**——起手电花从全身窜起，
 * 提交后一个箭步贴上去，撞实的一刻把电流灌进对方（麻痹本族最可靠）。它是本族里射程最短、出手最快、循环最短、
 * 也最没有代价的一招，而且对**已经残血的目标**尤其有效（收尾加成）。
 *
 * 与同族分开：疯狂伏特与伏特攻击是带电的重装冲锋并反伤、火焰轮是滚动的火；电光的辨识点是**贴脸的一点电**——
 * 出手快、间隔短、专挂麻痹，残血目标被它收掉时还会更亮。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   jolt        电击威力：物攻给狠劲、速度给起手；目标残血时抬一档（收尾）。
 *   reach       突进距离：速度决定一个箭步能贴多近。
 *   lunge       突进速度：速度决定每刻前进多少。
 *   radius      判定半径：碰撞箱高度决定撞面大小。
 *   numbChance  麻痹概率：特攻定电流强度、等级定熟练度；蓄电式显著提高。
 *   numbTicks   麻痹时长：特攻与等级；蓄电式延长。
 *   arcs        电弧数：速度派生，表现按它发射。
 *   push        击退：体重决定把目标顶开多远。
 *   tempo/aftercast/recharge  速度与等级决定起手／收招／冷却；本族最快。
 *
 * 配置 overcharge（蓄电式 / 点射式）双向取舍：
 *   蓄电式＝威力与麻痹概率更高、麻得更久，但起手更慢、冷却更长——一次把目标钉住；
 *   点射式＝出手与循环更快、射程略长，但威力与麻痹略低——用频率压制。
 * 两个方向各有局面（一次控住 vs 高频骚扰）。
 *
 * 伤害段 jolt：这一撞带电的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("spark", {
        /** 电击威力：基础 65，物攻每比 60 多 1 加 0.36（夹 -18..40），速度每比 60 快 1 加 0.24（夹 -10..26）；目标生命比例低于 0.35 时 ×1.3；蓄电 ×1.12 / 点射 ×0.94；夹 44..150。 */
        jolt: formula(
            F.base(65).plus(F.stat("attack").minus(60).times(0.36).clamp(-18, 40))
                .plus(F.stat("speed").minus(60).times(0.24).clamp(-10, 26))
                .times(F.when(F.target("actor.healthRatio", text("worldcombat.skill.spark.value.wounded")).lt(0.35), F.const(1.3), F.const(1)))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.spark.preference.overcharge")), F.const(1.12), F.const(0.94)))
                .clamp(44, 150).round(1),
            "电击威力", {
                unit: "威力",
                description: "带电撞上去那一下的威力；物攻越重、起步越快越猛。目标生命低于三成五时这一下更狠（收尾），蓄电式再抬一档、点射式略收。对手防御、相性与暴击在命中时另算。"
            }),
        /** 突进距离：基础 2.8 格，速度每比 60 快 1 加 0.016（夹 -0.5..1.2）；蓄电 ×0.96 / 点射 ×1.06；夹 2.1..3.6。 */
        reach: formula(
            F.base(2.8).plus(F.stat("speed").minus(60).times(0.016).clamp(-0.5, 1.2))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.spark.preference.overcharge")), F.const(0.96), F.const(1.06)))
                .clamp(2.1, 3.6).round(2),
            "突进距离", {
                unit: "格",
                description: "一个箭步能贴到多近，也是本招的实际射程来源；它是本族最短的一招，腿快的个体够得稍远。"
            }),
        /** 突进速度：基础 1.05 格/刻，速度每比 60 快 1 加 0.008（夹 -0.2..0.6）；夹 0.8..1.7。 */
        lunge: formula(
            F.base(1.05).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.2, 0.6)).clamp(0.8, 1.7).round(2),
            "突进速度", {
                unit: "格/刻",
                description: "扑上去每刻前进的距离；它是本族出手最快的一招，越快越难被让开。"
            }),
        /** 判定半径：基础 0.45 格，碰撞箱每比 1.4 高 1 格加 0.12；夹 0.35..0.85。 */
        radius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.35, 0.85).round(2),
            "判定半径", {
                unit: "格",
                description: "裹在身上的电流扫过的横向判定半径；身板越大电流包得越开。"
            }),
        /** 麻痹概率：基础 0.30，特攻每比 60 多 1 加 0.0016（夹 -0.05..0.14），等级每比 30 高 1 加 0.002（夹 0..0.1）；蓄电 +0.08 / 点射 -0.03；夹 0.14..0.6。 */
        numbChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.05, 0.14))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.1))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.spark.preference.overcharge")), F.const(0.08), F.const(-0.03)))
                .clamp(0.14, 0.6).round(3),
            "麻痹概率", "命中后把电流灌进对方、让它麻痹的机会（原生 30%）；特攻越强、等级越高越容易麻住，蓄电式显著提高、点射式略降。本族里最可靠的一招。"),
        /** 麻痹时长：基础 160，特攻每比 60 多 1 加 0.7（夹 -30..90），等级每比 30 高 1 加 0.8（夹 0..32）；蓄电 ×1.2；夹 100..340。 */
        numbTicks: seconds(
            F.base(160).plus(F.stat("specialAttack").minus(60).times(0.7).clamp(-30, 90))
                .plus(F.level().minus(30).times(0.8).clamp(0, 32))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.spark.preference.overcharge")), F.const(1.2), F.const(1)))
                .clamp(100, 340).round(0),
            "麻痹时长", "目标被麻住的时长；特攻与等级越高麻得越久，蓄电式更久。"),
        /** 电弧数：基础 8，速度每比 60 快 1 加 0.12（夹 -2..8）；夹 6..18。 */
        arcs: formula(
            F.base(8).plus(F.stat("speed").minus(60).times(0.12).clamp(-2, 8)).clamp(6, 18).round(0),
            "电弧数", {
                unit: "道",
                description: "每次放电画出的分枝电弧数量，随速度增长；表现按它发射，画面里的弧数与机制一致。"
            }),
        /** 击退：基础 0.25 格，体重每比 60 多 1 加 0.003（夹 -0.15..0.6）；夹 0.15..1.0。 */
        push: formula(
            F.base(0.25).plus(F.body("weight").minus(60).times(0.003).clamp(-0.15, 0.6)).clamp(0.15, 1.0).round(2),
            "击退", {
                unit: "格",
                description: "撞中后把目标沿突进方向顶开多远；越重顶得越远。"
            }),
        /** 起手：基础 5 刻，速度每比 60 快 1 少 0.02（夹 -2..2.5），蓄电 +2；夹 3..10。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2.5))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.spark.preference.overcharge")), F.const(2), F.const(0)))
                .clamp(3, 10).round(0),
            "起手", "电花从全身窜起、蓄到能贴上去的时间；速度越快越短，蓄电式更久。"),
        /** 收招：基础 6 刻，速度每比 60 快 1 少 0.02（夹 -2..2.5）；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2.5)).clamp(3, 10).round(0),
            "收招", "撞完退开半步的收势；速度越快越利落。"),
        /** 冷却：基础 16 刻，速度每比 60 快 1 少 0.04（夹 -4..5），蓄电 +5；夹 8..27。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 5))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.spark.preference.overcharge")), F.const(5), F.const(0)))
                .clamp(8, 27).round(0),
            "冷却", "两次电光之间的间隔；本族最短，速度越快回得越快，蓄电式缓一拍。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.03)
    });

    defineDamage("spark", "jolt", { defenceCoefficient: 0.005,
        rationale: "全身带电的短促接触突进，按标准防御系数结算，靠物攻与速度拉开差距。" }, { contact: true });

    stages("spark", [
        { level: 26, values: { jolt: 74 } },
        { level: 44, values: { jolt: 88, numbChance: 0.4 } }
    ]);

    describe("spark", [
        { key: "description.0", values: ["jolt", "reach", "lunge", "radius"] },
        { key: "description.1", values: ["numbChance", "numbTicks", "push"] },
        { key: "overcharge.on", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "overcharge.off", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jolt"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jolt", "tier.1.numbChance"] }
    ]);
}
