/**
 * 欺诈 / foulplay —— 参数与伤害段。
 *
 * 原生事实：Dark／物理／威力 95／命中 100／PP 15／接触；「利用对手的力量进行攻击。正和自己战斗的对手，
 *   其攻击越高，伤害越大」（Cobblemon 1.8，153 位学习者）。
 *
 * 翻译：把「借对手的力气」落成一条**从施法者脚下伸到对手影子里的暗影手臂**——施法者自己不使劲，
 *   暗影从对手自己的影子底下竖起一根刺，把它按在它自己的力量上。所以这一招的关键参数 `trick` 直接读
 *   **目标的物攻**：对手越壮，这一记越重；施法者弱也能咬得动强敌。原生的「接触」被放下：暗影手臂不是
 *   自己的身体，命中按直接伤害结算（不吃接触类特性）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   trick     反手威力：目标物攻（对手越强越重）＋施法者等级；纠缠 ×0.88 / 反手 ×1.06。
 *   reach     暗影伸距：施法者速度决定影子伸得多远；也是实际射程来源。
 *   crawl     爬行速度：施法者速度决定暗影爬过去多快（决定命中何时发生）。
 *   grasp     判定半径：施法者体型高度。
 *   pull      拖拽距离：目标物攻（越壮被拖得越动）。
 *   stagger   纠缠留下的踉跄时长：施法者等级。
 *   tendrils  阴影棘数：施法者等级与目标物攻，直接驱动画面发射量。
 *   coil/settle/recharge 施法者速度决定起手、收招、冷却。
 *
 * 配置 `cling`（纠缠）：开启＝命中后把目标拖近一段并让它踉跄（减速），代价是本击 ×0.88、冷却 +3 刻；
 *   关闭＝暗影只向上一刺，本击 ×1.06、收得干净。两向各有局面：拉人入圈 vs 把伤害打足。
 *
 * 伤害段名 trick：这一刺随精灵数据变化的那部分（关键量是目标的物攻）。
 */
namespace PokemonSkills {
    export const foulplayId = "foulplay";
    export const foulplayScene = "world_combat:move_foulplay";
    export const foulplaySeizeText = "world_combat.move.foulplay.text.seize";
    export const foulplayDragText = "world_combat.move.foulplay.text.drag";
    export const foulplayMissText = "world_combat.move.foulplay.text.miss";

    actionParameters.define(foulplayId, {
        /** 反手威力：基础 52 + 目标物攻偏移[−18,84] + 等级偏移[−4,10]；纠缠 ×0.88 / 反手 ×1.06；夹 45..190。 */
        trick: formula(
            F.base(52)
                .plus(F.target("stat.attack", text("worldcombat.skill.foulplay.value.foeAttack")).minus(60).times(0.55).clamp(-18, 84))
                .plus(F.level().minus(28).times(0.3).clamp(-4, 10))
                .times(F.when(F.pref("cling", text("worldcombat.skill.foulplay.preference.cling")), F.const(0.88), F.const(1.06)))
                .clamp(45, 190).round(1),
            "反手威力", {
                unit: "威力",
                description: "这一刺的基准威力，关键量是**目标的物攻**：对手越壮，借来的力气越大；施法者自己的强弱只经共享结算的基础系数参与。纠缠式收着打、反手式打足。对手防御、相性与暴击在命中时另算。"
            }),
        /** 暗影伸距：基础 5.2 格 + 速度偏移[−0.6,2.2]；夹 4.0..9.0；也是实际射程来源。 */
        reach: formula(
            F.base(5.2).plus(F.stat("speed").minus(55).times(0.016).clamp(-0.6, 2.2)).clamp(4.0, 9.0).round(2),
            "暗影伸距", {
                unit: "格",
                description: "暗影手臂能伸到的最大距离，也是本招的实际射程来源；出手快的个体伸得更远。"
            }),
        /** 爬行速度：基础 1.9 格/刻 + 速度偏移[−0.5,1.3]；夹 1.0..3.4。 */
        crawl: formula(
            F.base(1.9).plus(F.stat("speed").minus(55).times(0.010).clamp(-0.5, 1.3)).clamp(1.0, 3.4).round(2),
            "暗影爬行速度", {
                unit: "格/刻",
                description: "暗影沿地面爬向目标的速度；它决定命中发生在出手后的第几刻，也决定画面里那条暗影线的推进快慢。"
            }),
        /** 判定半径：基础 0.42 格 + 高度偏移[−0.08,0.30]；夹 0.34..0.80。 */
        grasp: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.08, 0.30)).clamp(0.34, 0.80).round(2),
            "判定半径", {
                unit: "格",
                description: "暗影抓握与竖起的那一簇棘有多宽；身板大的个体判得更宽。"
            }),
        /** 拖拽距离：基础 0.4 格 + 目标物攻偏移[0,1.8]；夹 0.3..2.2（纠缠时生效）。 */
        pull: formula(
            F.base(0.4).plus(F.target("stat.attack", text("worldcombat.skill.foulplay.value.foeAttack")).minus(60).times(0.012).clamp(0, 1.8)).clamp(0.3, 2.2).round(2),
            "拖拽距离", {
                unit: "格",
                description: "纠缠式把目标朝施法者拖近的距离；对手物攻越高，被自己的力气拖得越前。"
            }),
        /** 踉跄时长：24 刻 + 等级偏移[0,12]；夹 18..44 刻（纠缠留下的一段减速）。 */
        stagger: seconds(
            F.base(24).plus(F.level().minus(28).times(0.2).clamp(0, 12)).clamp(18, 44).round(0),
            "踉跄", "纠缠式拖拽后目标还会踉跄多久；等级越高按得越久。"),
        /** 阴影棘数：基础 5 + 等级偏移[0,4] + 目标物攻偏移[0,7]；夹 4..16。 */
        tendrils: formula(
            F.base(5).plus(F.level().minus(28).times(0.12).clamp(0, 4))
                .plus(F.target("stat.attack", text("worldcombat.skill.foulplay.value.foeAttack")).minus(60).times(0.05).clamp(0, 7))
                .clamp(4, 16).round(0),
            "阴影棘数", {
                unit: "根",
                description: "从目标影子里竖起的暗影棘数；对手物攻越高、等级越高，竖得越多，直接驱动画面的发射量。"
            }),
        /** 起手：4 刻 − 速度偏移[−1,1.5]；夹 3..6。 */
        coil: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.015).clamp(-1, 1.5)).clamp(3, 6).round(0),
            "起手", "从蹲身到暗影出手之间的时间；速度快的个体起得更快。"),
        /** 收招：6 刻；夹 4..10。 */
        settle: seconds(F.base(6).clamp(4, 10).round(0), "收招", "这一刺之后收回暗影的时间。"),
        /** 冷却：22 − 速度偏移[−3,5] + 纠缠 3；夹 14..34。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.10).clamp(-3, 5))
                .plus(F.when(F.pref("cling", text("worldcombat.skill.foulplay.preference.cling")), F.const(3), F.const(0))).clamp(14, 34).round(0),
            "冷却", "这一刺之后多久能再伸一次暗影；速度快的个体回得更快，纠缠式更费。")
    });

    defineDamage(foulplayId, "trick", { defenceCoefficient: 0.0052, rationale: "暗影直接作用于身体，对防御的穿透略强于默认，让目标物攻的差别更可见。" });

    stages(foulplayId, [
        { level: 26, values: { trick: 62 } },
        { level: 44, values: { trick: 74, reach: 6.4 } }
    ]);

    describe(foulplayId, [
        { key: "description.0", values: ["trick"] },
        { key: "description.1", values: ["reach","crawl","grasp"] },
        { key: "cling.on", values: ["pull","stagger"], when: function (context) { return read(context.detail.values, ["cling"]) === true; } },
        { key: "cling.off", values: [], when: function (context) { return read(context.detail.values, ["cling"]) !== true; } },
        { key: "timing", values: ["range", "coil", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.trick"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.trick", "tier.1.reach"] }
    ]);
}
