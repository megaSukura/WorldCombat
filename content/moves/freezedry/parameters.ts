/**
 * 冷冻干燥 / freezedry 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Ice、特殊、威力 70、命中 100、PP 20、单体；10%% 概率使目标冰冻；
 *   对水属性目标效果绝佳（相性覆写：Ice 对 Water 从 0.5 抬到 2）。
 *
 * 世界化：一口气把超冷的空气射成一根冰晶，命中即冻伤，并有概率把目标冻住；对**水属性**（以及在世界里
 *   湿透的目标）效果绝佳——冰对水本是半效，这一招把它翻成两倍。它是一击完成的攻击，不留下持续状态，
 *   身份在命中那一刻就结清；配置 deep（深冻）用更慢的起手与更长的冷却，换更高威力与更高冰冻概率。
 *
 * 数值来源（不同参数读不同个体数据）：
 *   shard        基础 70，特攻每比 60 多 1 加 0.22，深冻 ×1.12，夹 40..130。
 *   freezeChance 基础 10%%，深冻 18%%。
 *   reach        基础 9 格，特攻每比 60 多 1 加 0.03，夹 8..14；冷气越足喷得越远。
 *   shardSpeed   基础 1.1 格/刻，速度每比 60 快 1 加 0.005，深冻 ×0.85，夹 0.7..1.8。
 *   collision    基础 0.3 格，碰撞箱每比 1.4 高 1 格加 0.1，夹 0.22..0.6。
 *   tempo        基础 10 刻，速度每比 60 快 1 减 0.04，夹 7..13；深冻再 +3。
 *   aftermath    基础 7 刻，碰撞箱每比 1.4 高 1 格加 1，夹 5..11。
 *   wait         基础 60 刻，30 级起每级减 0.3，夹 45..70；深冻 ×1.15。
 *
 * 伤害段 shard：命中随精灵数据变化的那部分；水/湿目标的 2 倍相性在命中时由 PokemonDamage.metadata 覆写。
 */
namespace PokemonSkills {
    export const freezedryScene = "world_combat:move_freezedry";

    actionParameters.define("freezedry", {
        /** 冰晶威力：基础 70，特攻每比 60 多 1 加 0.22，深冻 ×1.12，夹 40..130。 */
        shard: formula(
            F.base(70).plus(F.stat("specialAttack").minus(60).times(0.22))
                .times(F.when(F.pref("deep"), F.const(1.12), F.const(1)))
                .clamp(40, 130).round(1),
            "冰晶威力", {
                unit: "威力",
                description: "命中那一下的基础威力；深冻把冷气压得更狠。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冰冻概率：基础 10%%，深冻 18%%。 */
        freezeChance: percent(
            F.when(F.pref("deep"), F.const(0.18), F.const(0.10)),
            "冰冻概率", "命中后有这个概率把目标冻住；冻住的目标一段时间不能行动。"),
        /** 射程：基础 9 格，特攻每比 60 多 1 加 0.03，夹 8..14。 */
        reach: formula(
            F.base(9).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1.5, 4.0)).clamp(8, 14).round(1),
            "射程", {
                unit: "格",
                description: "冷气能喷到多远；特攻越高够得越远。"
            }),
        /** 冰晶速度：基础 1.1 格/刻，速度每比 60 快 1 加 0.005，深冻 ×0.85，夹 0.7..1.8。 */
        shardSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.2, 0.5))
                .times(F.when(F.pref("deep"), F.const(0.85), F.const(1)))
                .clamp(0.7, 1.8).round(2),
            "冰晶速度", {
                unit: "格/刻",
                description: "冰晶飞行的速度；快个体更早命中，深冻的冰晶更沉更慢。"
            }),
        /** 判定半径：基础 0.3 格，碰撞箱每比 1.4 高 1 格加 0.1，夹 0.22..0.6。 */
        collision: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.22, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "冰晶的横向判定半径；大个子判定更宽。"
            }),
        /** 起手：基础 10 刻，速度每比 60 快 1 减 0.04，夹 7..13；深冻 +3。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 4)).clamp(7, 13).round(0),
            "起手", "把水汽冻成冰晶需要多久；快个体更早射出，深冻多喘一口气。"),
        /** 收招：基础 7 刻，碰撞箱每比 1.4 高 1 格加 1，夹 5..11。 */
        aftermath: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(1.0)).clamp(5, 11).round(0),
            "收招", "射出之后的收势；身板越大越慢。"),
        /** 冷却：基础 60 刻，30 级起每级减 0.3，夹 45..70；深冻 ×1.15。 */
        wait: seconds(
            F.base(60).minus(F.level().minus(30).max(0).times(0.3)).clamp(45, 70).round(0),
            "冷却", "两次冷冻之间的等待；等级越高越熟练。")
    });

    defineDamage("freezedry", "shard", {});

    describe("freezedry", [
        { key: "description.0", values: ["shard", "freezeChance"] },
        { key: "description.1", values: ["reach", "shardSpeed", "collision"] },
        { key: "description.2", values: ["tempo", "aftermath", "wait"] }
    ]);
}
