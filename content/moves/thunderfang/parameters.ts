/**
 * 雷电牙 / thunderfang 的参数与伤害段。
 *
 * 原生事实：Electric／物理／威力 65／命中 95／PP 15／接触、咬击（bite）；两个独立掷签各 10%：麻痹与畏缩
 *   （Cobblemon 1.8，85 位学习者）。
 *
 * 翻译：把「用蓄满电流的牙齿咬住对手」落成**一记最快的扑咬，让电流从牙齿穿身**——它是本族里出手最快、扑得最远的一口；
 * 命中按几率让目标麻痹（共享身份 world_combat:status/paralysis，宝可梦同步为原生麻痹）。独有部分在**电锁**：
 * 咬的是一具已经麻了的身体时，抽搐的肌肉被电流锁住，目标会被短暂定在原地（`world_combat:rooted`）——
 * 因此它专门接手别人（或自己）已经麻掉的目标。咬实的那一下也有几率把目标咬懵（共享身份 world_combat:status/flinch）。
 *
 * 与同族分开：雷电拳是拳、电流会链到旁边的敌人；雷电牙是牙，只咬身前的目标，把已经麻掉的目标钉住。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   fang         咬合威力：物攻定咬合力，速度定电流的狠劲；过载式把每一口摊薄。
 *   reach/lunge  扑出距离与速度：速度派生（本族最快最远）；过载式再快一档但收一点。
 *   grip         獠牙判定：身高派生。
 *   numbChance   麻痹几率：特攻与等级决定电流能不能麻住；过载式更高。
 *   numbTicks    麻痹时长：特攻与等级；过载式更久。
 *   lockTicks    电锁时长：体重（肌肉量）决定钉多久；过载式更久。
 *   flinchChance 畏缩几率：速度派生；过载式略降。
 *   flinchTicks  畏缩持续：固定 9 刻，过载式 +2。
 *   sparks       电弧数：速度派生，表现按它画出每处放电的枝数。
 *   tempo/aftercast/recharge：速度决定起手、收招与冷却。
 *
 * 配置 `overload`（过载式）双向取舍：开启＝麻痹几率 +12%%、麻痹 ×1.2、电锁 ×1.6，但咬合威力 ×0.88、冷却 +4 刻；
 * 关闭（点穴式）＝咬得更重、循环更快，但麻得更短、锁得更短。两个方向各有局面。
 *
 * 伤害段 `fang` 与参数同名，走共享换算；麻痹经共享状态路由落到任何战斗者身上。
 */
namespace PokemonSkills {
    actionParameters.define("thunderfang", {
        /** 咬合威力：63 + 物攻偏移[−12,34] + 速度偏移[−3,12]；过载 ×0.88 / 点穴 ×1.05；夹 46..136。 */
        fang: formula(
            F.base(63).plus(F.stat("attack").minus(60).times(0.32).clamp(-12, 34))
                .plus(F.stat("speed").minus(60).times(0.12).clamp(-3, 12))
                .times(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(0.88), F.const(1.05)))
                .clamp(46, 136).round(1),
            "咬合威力", {
                unit: "威力",
                description: "蓄电獠牙咬合这一下的基础威力；物攻给出咬合力，速度给出电流的狠劲。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑出距离：2.2 + 速度偏移[−0.35,1.1]；过载 ×0.96 / 点穴 ×1.06；夹 1.7..3.4。 */
        reach: formula(
            F.base(2.2).plus(F.stat("speed").minus(55).times(0.014).clamp(-0.35, 1.1))
                .times(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(0.96), F.const(1.06)))
                .clamp(1.7, 3.4).round(2),
            "扑出距离", {
                unit: "格",
                description: "从起步到咬到的总位移，也是本招的实际射程来源；它是本族扑得最远的一口，腿快的个体更远。"
            }),
        /** 扑咬速度：0.82 + 速度偏移[−0.12,0.34]；过载 ×1.04 / 点穴 ×1.06；夹 0.55..1.15。 */
        lunge: formula(
            F.base(0.82).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.12, 0.34))
                .times(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(1.04), F.const(1.06)))
                .clamp(0.55, 1.15).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑出时每刻前进的距离；它是本族起得最快的一口，过载式更快一点。"
            }),
        /** 獠牙判定：0.42 + 身高偏移[−0.07,0.3]；夹 0.32..0.78。 */
        grip: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.07, 0.3)).clamp(0.32, 0.78).round(2),
            "獠牙判定", {
                unit: "格",
                description: "这一口扫过的横向判定半径；口部越大咬得越宽，越不容易被侧身让开。"
            }),
        /** 麻痹几率：0.26 + 特攻偏移[−0.07,0.2] + 等级偏移[0,0.12] + 过载 0.12；夹 0.14..0.64。 */
        numbChance: percent(
            F.base(0.26).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.07, 0.2))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.12))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(0.12), F.const(0)))
                .clamp(0.14, 0.64).round(3),
            "麻痹几率", "咬实后电流穿过身体、把目标麻住的概率（原生 10%）；特攻越高、等级越高越容易麻住，过载式再抬一档。"),
        /** 麻痹时长：200 + 特攻偏移[−28,80] + 等级偏移[0,40]；过载 ×1.2；夹 120..360。 */
        numbTicks: seconds(
            F.base(200).plus(F.stat("specialAttack").minus(60).times(0.55).clamp(-28, 80))
                .plus(F.level().minus(30).times(1).clamp(0, 40))
                .times(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(1.2), F.const(1)))
                .clamp(120, 360).round(0),
            "麻痹时长", "目标被麻住的时长；特攻越高、等级越高麻得越久，过载式更久。"),
        /** 电锁时长：12 + 体重偏移[−4,18] + 过载 8；夹 6..30。 */
        lockTicks: seconds(
            F.base(12).plus(F.body("weight").minus(60).times(0.2).clamp(-4, 18))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(8), F.const(0)))
                .clamp(6, 30).round(0),
            "电锁时长", "咬中已经麻掉的目标时，抽搐的肌肉被电流锁住、原地定住的时长；体重越大（肌肉越多）锁得越久，过载式更久。"),
        /** 畏缩几率：0.20 + 速度偏移[−0.05,0.12]；过载 ×0.85；夹 0.10..0.46。 */
        flinchChance: percent(
            F.base(0.20).plus(F.stat("speed").minus(55).times(0.0011).clamp(-0.05, 0.12))
                .times(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(0.85), F.const(1)))
                .clamp(0.10, 0.46).round(3),
            "畏缩几率", "咬实时的畏缩几率（原生 10%）；速度越快越容易一口把对手咬懵，过载式力道分散、略降。"),
        /** 畏缩持续：9 刻，过载 +2；夹 6..16。 */
        flinchTicks: seconds(
            F.base(9).plus(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "畏缩持续", "被咬懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 电弧数：7 + 速度偏移[−1,7]；夹 5..16。 */
        sparks: formula(
            F.base(7).plus(F.stat("speed").minus(55).times(0.08).clamp(-1, 7)).clamp(5, 16).round(0),
            "电弧数", {
                unit: "道",
                description: "每次放电画出的分枝电弧数量，随速度增长；表现按它发射，画面里的弧数与机制一致。"
            }),
        /** 起手：4 − 速度偏移[−2,1.5]；夹 2..9。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 1.5)).clamp(2, 9).round(0),
            "起手", "牙间窜起电光、蓄到能扑出的时间；速度越快越短。"),
        /** 收招：5 − 速度偏移[−2,1.5]；夹 3..9。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5)).clamp(3, 9).round(0),
            "收招", "咬完松口、退开半步的收势；速度越快越短。"),
        /** 冷却：15 − 速度偏移[−4,2] + 过载 4；夹 8..27。 */
        recharge: seconds(
            F.base(15).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 2))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.thunderfang.preference.overload")), F.const(4), F.const(0)))
                .clamp(8, 27).round(0),
            "冷却", "两口之间电光重新聚起的时间；速度越快回得越快，过载式要缓一拍。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.04)
    });

    stages("thunderfang", [
        { level: 24, values: { fang: 71 } },
        { level: 42, values: { fang: 81, numbChance: 0.38 } }
    ]);

    defineDamage("thunderfang", "fang", { defenceCoefficient: 0.005,
        rationale: "蓄电獠牙的接触咬合；防御按默认系数减伤。" }, { contact: true, bite: true });

    describe("thunderfang", [
        { key: "description.0", values: ["fang", "grip"] },
        { key: "description.1", values: ["numbChance", "numbTicks"] },
        { key: "description.2", values: ["lockTicks"] },
        { key: "description.3", values: ["flinchChance", "flinchTicks"] },
        { key: "overload.on", values: [], when: function (context) { return read(context.detail.values, ["overload"]) === true; } },
        { key: "overload.off", values: [], when: function (context) { return read(context.detail.values, ["overload"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "cooldown", "pp"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fang", "tier.1.numbChance"] }
    ]);
}
