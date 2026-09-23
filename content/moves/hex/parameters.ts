/**
 * 祸不单行 / hex —— 参数与伤害段。
 *
 * 原生事实：Ghost／特殊／威力 65／命中 100／PP 10；「接二连三地进行攻击。对处于异常状态的对手给予较大的伤害」
 *   （Cobblemon 1.8，118 位学习者）。
 *
 * 翻译：把「接二连三」落成**一片画在地上的诅咒结界**——诅咒沿地面爬到对手脚下，如涟漪般画出一圈符文，
 *   然后从结界里一波接一波竖起鬼影尖刺。结界内的每个敌人都被刺中；**谁身上带着异常，谁那一下翻倍**。
 *   于是它读的是「目标此刻的异常」，而且不挑异常种类：灼伤、麻痹、中毒／剧毒、冰冻、睡眠都算。
 *   与群魔乱舞分开（那也是一队扑向目标的鬼火、也吃异常）：祸不单行是**留在原地的一片地面结界**，一波波向上涌刺，
 *   打的是站在圈里的人，不是飞出去追一个人。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   curse     咒力：特攻定深浅、等级定层数；目标带异常时 ×2；连环式铺得更开、单发更轻。
 *   sigil     结界半径：特攻与目标体型决定圈画多大。
 *   crawl     诅咒爬行速度：施法者速度决定它多久爬到脚下。
 *   waves     涌刺波数：等级与速度决定刺几波。
 *   interval  波间隔：施法者速度决定波与波之间多密。
 *   spike     涌刺高度：施法者体型高度（表现与判定带）。
 *   reach     施放距离：施法者速度；也是实际射程来源。
 *
 * 配置 `chain`（连环）：开启＝结界半径 ×1.35、可以圈住更多人，但单发 ×0.85；关闭＝圈更紧、单发 ×1.08。
 *   两向各有局面：一群人挤在一起 vs 只钉一个。
 *
 * 伤害段名 curse：这一波涌刺随精灵数据变化的那部分；目标带异常时的 ×2 在命中时按**每个目标自己**的异常结算。
 */
namespace PokemonSkills {
    export const hexId = "hex";
    export const hexScene = "world_combat:move_hex";
    export const hexBlightText = "world_combat.move.hex.text.blight";
    export const hexStrikeText = "world_combat.move.hex.text.strike";
    export const hexMissText = "world_combat.move.hex.text.miss";

    /** 目标身上是否带着任意主异常：灼伤、麻痹、中毒／剧毒、冰冻或睡眠。 */
    function hexAfflicted(): Formula.Node {
        return F.target("status.burn")
            .plus(F.target("status.paralysis"))
            .plus(F.target("status.poison"))
            .plus(F.target("status.frozen"))
            .plus(F.target("status.sleep"))
            .gt(0);
    }

    /** 命中时目标身上是否带着任意主异常（不分种类）；供结算与 AI 读取。 */
    export function hexAfflictedNow(world: CombatWorld, actor: CombatActor): boolean {
        return CombatStatus.has(world, actor, "burn") || CombatStatus.has(world, actor, "paralysis")
            || CombatStatus.has(world, actor, "poison") || CombatStatus.has(world, actor, "frozen")
            || CombatStatus.has(world, actor, "sleep");
    }

    actionParameters.define(hexId, {
        /** 每波咒力：基础 40 + 特攻偏移[−12,26] + 等级偏移[−3,8]；目标带异常 ×2；连环 ×0.85 / 聚咒 ×1.08；夹 26..115。 */
        curse: formula(
            F.base(40)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-12, 26))
                .plus(F.level().minus(28).times(0.2).clamp(-3, 8))
                .times(F.when(hexAfflicted(), F.const(2), F.const(1)).as(text("worldcombat.skill.hex.value.blight")))
                .times(F.when(F.pref("chain", text("worldcombat.skill.hex.preference.chain")), F.const(0.85), F.const(1.08)))
                .clamp(26, 115).round(1),
            "每波咒力", {
                unit: "威力",
                description: "结界里**每一波**涌刺打在一个人身上的基准威力；一个人会被涌刺 `waves` 波。特攻越高、等级越高越深。**目标自己带着任意异常时这一波翻倍**——结界里每个人各算各的。对手防御、相性与暴击在命中时另算。"
            }),
        /** 结界半径：基础 1.5 格 + 特攻偏移[0,0.9] + 高度偏移[−0.15,0.45]；连环 ×1.35；夹 1.2..3.6。 */
        sigil: formula(
            F.base(1.5).plus(F.stat("specialAttack").minus(60).times(0.01).clamp(0, 0.9))
                .plus(F.body("height").minus(1.4).times(0.18).clamp(-0.15, 0.45))
                .times(F.when(F.pref("chain", text("worldcombat.skill.hex.preference.chain")), F.const(1.35), F.const(1)))
                .clamp(1.2, 3.6).round(2),
            "结界半径", {
                unit: "格",
                description: "画在对手脚下的诅咒结界有多大；特攻越高、对手身板越大，圈得越开。连环式铺得更广。"
            }),
        /** 爬行速度：基础 2.2 格/刻 + 速度偏移[−0.6,1.4]；夹 1.2..4.0。 */
        crawl: formula(
            F.base(2.2).plus(F.stat("speed").minus(55).times(0.010).clamp(-0.6, 1.4)).clamp(1.2, 4.0).round(2),
            "诅咒爬行速度", {
                unit: "格/刻",
                description: "诅咒沿地面爬到对手脚下、画出结界的速度；它决定首波涌刺发生在第几刻，也决定画面里那条爬行咒线的推进。"
            }),
        /** 涌刺波数：基础 3 + 等级偏移[0,1.5] + 速度偏移[0,1.2]；夹 2..6 的整数。 */
        waves: formula(
            F.base(3).plus(F.level().minus(28).times(0.06).clamp(0, 1.5))
                .plus(F.stat("speed").minus(55).times(0.012).clamp(0, 1.2)).clamp(2, 6).round(0),
            "涌刺波数", {
                unit: "波",
                description: "结界一波接一波向上涌刺几次；等级与速度越高波数越多，每一波都重新判定圈里的敌人。"
            }),
        /** 波间隔：基础 3 刻 − 速度偏移[−1,1]；夹 2..5。 */
        interval: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.008).clamp(-1, 1)).clamp(2, 5).round(0),
            "波间隔", "两波涌刺之间隔多久；出手快的个体来得更密。"),
        /** 涌刺高度：基础 0.9 格 + 高度偏移[0,0.6]；夹 0.6..1.8（表现与判定带）。 */
        spike: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.25).clamp(0, 0.6)).clamp(0.6, 1.8).round(2),
            "涌刺高度", {
                unit: "格",
                description: "鬼影尖刺从地下涌起多高；身板大的个体涌得更凶，也让画面更高。"
            }),
        /** 施放距离：基础 7.5 格 + 速度偏移[−0.8,2.4]；夹 6..13；也是实际射程来源。 */
        reach: formula(
            F.base(7.5).plus(F.stat("speed").minus(55).times(0.016).clamp(-0.8, 2.4)).clamp(6, 13).round(2),
            "施放距离", {
                unit: "格",
                description: "诅咒能爬到的最大距离，也是本招的实际射程来源；出手快的个体够得更远。"
            }),
        /** 起手：5 刻 − 速度偏移[−1.5,2]；夹 3..8。 */
        coil: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2)).clamp(3, 8).round(0),
            "起手", "从掐指到诅咒离手之间的时间；速度快的个体起得更快。"),
        /** 收招：7 刻；夹 4..12。 */
        settle: seconds(F.base(7).clamp(4, 12).round(0), "收招", "最后一波涌刺之后收势的时间。"),
        /** 冷却：26 − 速度偏移[−4,6] + 连环 3；夹 16..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("chain", text("worldcombat.skill.hex.preference.chain")), F.const(3), F.const(0))).clamp(16, 40).round(0),
            "冷却", "这一次诅咒之后多久能再画一次；速度快的个体回得更快，连环式更费。")
    });

    defineDamage(hexId, "curse", { defenceCoefficient: 0.0048, rationale: "地面诅咒绕开正面护甲，对防御的穿透略强于默认，让特攻与异常的差别更可见。" }, {
        // 结界里每个人各自结算：命中时用该目标自己的事实快照重算咒力，
        // 于是 `F.target("status...")` 的翻倍落到**这个人**身上，而不是施法者选中的那一个。
        resolve: function (damage: PokemonDamage.FeatureContext) {
            return damage.facts ? { power: actionParameters.rules.formulaValue(hexId + "/curse", damage.facts) } : undefined;
        }
    });

    stages(hexId, [
        { level: 25, values: { curse: 46 } },
        { level: 43, values: { curse: 54, reach: 8.8 } }
    ]);

    describe(hexId, [
        { key: "description.0", values: ["curse"] },
        { key: "description.1", values: ["reach", "sigil", "crawl", "waves", "interval"] },
        { key: "description.2", values: [] },
        { key: "chain.on", values: [], when: function (context) { return read(context.detail.values, ["chain"]) === true; } },
        { key: "chain.off", values: [], when: function (context) { return read(context.detail.values, ["chain"]) !== true; } },
        { key: "timing", values: ["range", "coil", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.curse"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.curse", "tier.1.reach"] }
    ]);
}
