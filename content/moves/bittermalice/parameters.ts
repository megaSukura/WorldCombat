/**
 * 冤冤相报 / bittermalice —— 参数与伤害段。本组「卸力一击」的隔空怨念成员。
 *
 * 原生事实：Ghost／特殊／威力 75／命中 100／PP 10／单体／无接触；命中后 100% 使目标攻击下降 1 级
 *   （secondary.boosts.atk -1）。描述「用令人毛骨悚然的怨念进行攻击。会降低对手的攻击。」（Cobblemon 1.8）。
 *
 * 翻译：把「怨念」落成**隔空伸出的一只怨念之手**——施法者把心头的怨念放出去，它循着目标飞过去、一把攥住，
 *   把对方的力气按下去（攻击下降）。它是本组唯一的特殊／远程招；念头里的两层「冤冤相报」：
 *   施法者自己越受伤，怨念越深（**读自身生命比例**）；目标身上带着异常时，纠缠式会加倍，怨念式则把那份异常
 *   一口吞掉、换成更重的一击与更深的掉攻（**读目标状态**）。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   curse   怨念威力：**特攻**给深浅，等级定层数；自身生命越少越重；目标带异常（纠缠式）或怨念式 ×1.35 / ×1.6。
 *   reach   施放距离：**速度**决定够多远；也是实际射程。
 *   velocity 怨念飞速：速度派生。
 *   radius  判定半径：体型高度决定怨念之手的粗细。
 *   stages  掉攻级数：纠缠式 1 级，怨念式 2 级。
 *   motes   怨念数量：特攻与等级派生，直接驱动画面发射量。
 *   tempo/recover/recharge：速度与等级定时序；怨念式更费。
 *
 * 配置 `grudge`（怨念式，默认关）双向取舍：开＝**吞掉目标身上一个主异常**（`CombatStatus.cureMajor`），
 *   换来威力 ×1.35、掉攻 2 级，代价是替对手解掉了那份异常（也放弃它以后的价值）、出手更慢；
 *   关（纠缠式）＝保留异常：目标带异常时这一记 ×1.6，但掉攻只有 1 级。各有局面。
 *
 * 伤害段 `curse` 与参数同名，不标 contact（原生无接触）。
 */
namespace PokemonSkills {
    /** 目标身上是否带着任意主异常：灼伤、麻痹、中毒／剧毒、冰冻或睡眠。 */
    function bittermaliceAfflicted(): Formula.Node {
        return F.target("status.burn")
            .plus(F.target("status.paralysis"))
            .plus(F.target("status.poison"))
            .plus(F.target("status.frozen"))
            .plus(F.target("status.sleep"))
            .gt(0);
    }

    /** 怨念随自身伤势加深：1 + (1 − 生命比例) × 0.4，夹 1..1.4。 */
    function bittermaliceResentment(): Formula.Node {
        return F.const(1).plus(F.const(1).minus(F.individual("healthRatio")).times(0.4)).clamp(1, 1.4);
    }

    actionParameters.define("bittermalice", {
        /** 怨念威力：基础 66；特攻每比 60 多 1 加 0.28（夹 −12..34）；等级每比 30 高 1 加 0.3（夹 −4..10）；
         *  × 怨念（1..1.4）；怨念式 ×1.35 / 纠缠式带异常 ×1.6；夹 30..160。 */
        curse: formula(
            F.base(66)
                .plus(F.stat("specialAttack").minus(60).times(0.28).clamp(-12, 34))
                .plus(F.level().minus(30).times(0.3).clamp(-4, 10))
                .times(bittermaliceResentment().as(text("worldcombat.skill.bittermalice.value.resentment")))
                .times(F.when(F.pref("grudge", text("worldcombat.skill.bittermalice.preference.grudge")), F.const(1.35),
                    F.when(bittermaliceAfflicted(), F.const(1.6), F.const(1))))
                .clamp(30, 160).round(1),
            "怨念威力", {
                unit: "威力",
                description: "怨念之手攥住目标那一下的基础威力；特攻越高、等级越高越深，**自身生命越少怨念越重**。纠缠式下**目标带着任意异常时翻倍到 ×1.6**，怨念式则无条件 ×1.35。对手防御、相性与暴击在命中时另算。"
            }),
        /** 施放距离：基础 8 + 速度每比 60 快 1 加 0.02（夹 −1..3）；夹 6..13。 */
        reach: formula(
            F.base(8).plus(F.stat("speed").minus(60).times(0.02).clamp(-1, 3)).clamp(6, 13).round(2),
            "施放距离", {
                unit: "格",
                description: "怨念能循着目标飞多远，也是本招的实际射程来源；出手快的个体够得更远。"
            }),
        /** 怨念飞速：基础 0.55 + 速度偏移[−0.1,0.2]；夹 0.4..0.9。 */
        velocity: formula(
            F.base(0.55).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.1, 0.2)).clamp(0.4, 0.9).round(2),
            "怨念飞速", {
                unit: "格/刻",
                description: "怨念之手飞向目标的每刻距离；速度越快越难躲开。"
            }),
        /** 判定半径：基础 0.45 + 身高偏移[−0.05,0.15]；夹 0.35..0.62。 */
        radius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.07).clamp(-0.05, 0.15)).clamp(0.35, 0.62).round(2),
            "判定半径", {
                unit: "格",
                description: "怨念之手伸出去有多粗、碰到东西的判定半径；体型越高越粗。"
            }),
        /** 掉攻级数：怨念式 2 级，纠缠式 1 级。 */
        stages: formula(
            F.when(F.pref("grudge", text("worldcombat.skill.bittermalice.preference.grudge")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "掉攻级数", {
                unit: "级",
                description: "攥住目标后它的攻击下降几级；纠缠式 1 级，怨念式吞掉异常后掉 2 级。对宝可梦落到原生攻击等级，对其他战斗者落到攻击属性。"
            }),
        /** 怨念数量：基础 16 + 特攻偏移[−3,18] + 等级偏移[−2,9]；夹 10..44。 */
        motes: formula(
            F.base(16)
                .plus(F.stat("specialAttack").minus(60).times(0.14).clamp(-3, 18))
                .plus(F.level().minus(30).times(0.3).clamp(-2, 9))
                .clamp(10, 44).round(0),
            "怨念数量", {
                unit: "点",
                description: "化出的怨念光点数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 8 − 速度偏移[−2,3]；夹 4..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.035).clamp(-2, 3)).clamp(4, 13).round(0),
            "起手", "把心头的怨念聚起来、放出去的时间；速度越快越短。"),
        /** 收招：基础 8 − 速度偏移[−1.5,2.5]；夹 4..13。 */
        recover: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(4, 13).round(0),
            "收招", "怨念离手后收势的时间；速度越快收得越利落。"),
        /** 冷却：基础 28 − 等级偏移[−3,6]；怨念 +6；夹 16..44。 */
        recharge: seconds(
            F.base(28).minus(F.level().minus(20).times(0.18).clamp(-3, 6))
                .plus(F.when(F.pref("grudge", text("worldcombat.skill.bittermalice.preference.grudge")), F.const(6), F.const(0)))
                .clamp(16, 44).round(0),
            "冷却", "两次放怨念之间的等待；等级越高回气越快，怨念式更费。PP 10 的代价。")
    });

    defineDamage("bittermalice", "curse", {});

    stages("bittermalice", [
        { level: 35, values: { curse: 80 } },
        { level: 50, values: { curse: 92, reach: 9.6 } }
    ]);

    describe("bittermalice", [
        { key: "description.0", values: ["curse"] },
        { key: "description.1", values: ["reach", "velocity", "radius"] },
        { key: "description.2", values: ["stages"] },
        { key: "description.3", values: [] },
        { key: "grudge.on", values: [], when: function (context) { return read(context.detail.values, ["grudge"]) === true; } },
        { key: "grudge.off", values: [], when: function (context) { return read(context.detail.values, ["grudge"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "recover", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.curse"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.curse", "tier.1.reach"] }
    ]);
}
