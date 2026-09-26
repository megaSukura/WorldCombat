/**
 * 淘金潮 / makeitrain —— 参数与伤害段。
 *
 * 原生事实：Steel／特殊／威力 120／命中 100／PP 5／目标 allAdjacentFoes（自身一圈）／
 *   使用后自身特攻 −1；原作另有一层「战斗结束后留下金币」的战后果。
 *
 * 翻译：把「扔出大量硬币」落成**一场真实抛上去再落下来的金币雨**——施法者把金库抖上头顶，
 *   一束束真金币沿真实弧线向身周散开、再落下；哪一束真的碰到敌人，那一下才结算特殊钢伤害，
 *   金子散尽后自己的特攻被掏空（Sp. Atk −1），地上留下少数能捡的真硬币。它是金币二式里
 *   **唯一自身一圈、唯一高威力、唯一有自我代价**的那一个大招。
 *
 * 数据分散（每项依赖不同的精灵数据，小差距因此会变成场上可见的不同）：
 *   coin      单束威力：特攻定金雨的力道，等级定币雨的规模。
 *   radius    覆盖半径：特攻决定金雨铺多开，等级让范围再扩一点；也是指示圈与散点的半径。
 *   beams     金雨束数：速度与等级决定这一场一共抛出多少束，同时是画面密度与掉落预算的分母。
 *   interval  束间隔：速度决定相邻两束之间抛得多紧。
 *   scatter   落地真币：等级与特攻决定所有束分到的掉落预算总量。
 *   selfDrop  自损级数：固定 1 级特攻；倾库式提到 2 级。
 *   fall      下落急缓：体重决定金币落下多急（弧度多低、重力多大）。
 *   tempo     起手：速度决定抖开金库的快慢，倾库式更慢。
 *   aftercast 收招：速度决定收势。
 *   wait      冷却：等级决定熟练度，倾库式更久。
 *
 * 配置 `hoard`（倾库式）双向取舍：开启＝单束 ×1.12、半径 ×1.15、束数 ×1.3、自损特攻 2 级、
 *   起手 +4 刻、冷却 +30 刻；关闭＝常备金库，自损 1 级、范围与束数按基础值，回气更快。
 *   两向各有适用局面（一次清空大范围 vs. 能反复放的中等爆发）。
 *
 * 伤害段 `coin` 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("makeitrain", {
        coin: formula(
            F.base(120)
                .plus(F.stat("specialAttack").minus(80).times(0.35).clamp(-20, 50))
                .plus(F.level().minus(40).times(0.3).clamp(0, 15))
                .times(F.when(F.pref("hoard", text("worldcombat.skill.makeitrain.preference.hoard")), F.const(1.12), F.const(1)))
                .clamp(80, 220).round(1),
            "单束威力", {
                unit: "威力",
                description: "一束金币真的砸中敌人时，对那名敌人结算的基础威力；特攻越高、等级越高越沉。整次施放里每名敌人只会被结算一次，对手特防、相性与暴击在命中时另算。"
            }),
        radius: formula(
            F.base(5.0)
                .plus(F.stat("specialAttack").minus(80).times(0.02).clamp(-0.5, 2.2))
                .plus(F.level().minus(40).times(0.02).clamp(0, 1.2))
                .times(F.when(F.pref("hoard", text("worldcombat.skill.makeitrain.preference.hoard")), F.const(1.15), F.const(1)))
                .clamp(4.0, 8.5).round(2),
            "覆盖半径", {
                unit: "格",
                description: "金币束向身周散开的最大水平距离；特攻与等级越高铺得越开，倾库式再扩一点。它同时是散点范围与指示圈半径，真实弧线仍受顶棚与方块限制。"
            }),
        beams: formula(
            F.base(15)
                .plus(F.stat("speed").minus(60).times(0.06).clamp(-3, 5))
                .plus(F.level().minus(40).times(0.08).clamp(0, 4))
                .times(F.when(F.pref("hoard", text("worldcombat.skill.makeitrain.preference.hoard")), F.const(1.3), F.const(1)))
                .clamp(12, 24).round(0),
            "金雨束数", {
                unit: "束",
                description: "这一场金雨一共抛出多少束金币；速度与等级越高抛得越多束，倾库式最多。束数决定雨点密度与每束分到的掉落预算，不改变单束威力，也不增加总掉落。"
            }),
        interval: seconds(
            F.base(3).minus(F.stat("speed").minus(60).times(0.01).clamp(-1, 1)).clamp(2, 5).round(0),
            "束间隔", "相邻两束金币之间隔多久抛出；速度越快抛得越紧。它只改变雨点的疏密节奏，不改变总威力与总掉落。"),
        scatter: formula(
            F.base(4)
                .plus(F.level().minus(40).times(0.1).clamp(0, 4))
                .plus(F.stat("specialAttack").minus(80).times(0.02).clamp(-1, 3))
                .clamp(3, 12).round(0),
            "落地真币", {
                unit: "枚",
                description: "整场金雨分给各束、在真实终点散出的 Relic Coin 总量（为避免堆太多实体，实际落地有上限）；等级与特攻越高留得越多。束数只决定怎么分摊，不改变总量。"
            }),
        selfDrop: formula(
            F.base(1).plus(F.when(F.pref("hoard", text("worldcombat.skill.makeitrain.preference.hoard")), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "自损级数", {
                unit: "级",
                description: "这一发之后自己特攻下降的能力等级；原生 1 级，倾库式掏得更空、掉 2 级。"
            }),
        fall: formula(
            F.base(0.6).plus(F.body("weight").minus(300).times(0.0006).clamp(-0.1, 0.3)).clamp(0.4, 1.0).round(2),
            "下落急缓", {
                unit: "系数",
                description: "金币落下有多急：身体越沉的个体抖出的金币弧度越平、落得越快。它决定真实弧线的重力与最高点，落点仍由实际碰撞决定。"
            }),
        tempo: seconds(
            F.base(18)
                .minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 4))
                .plus(F.when(F.pref("hoard", text("worldcombat.skill.makeitrain.preference.hoard")), F.const(4), F.const(0)))
                .clamp(12, 26).round(0),
            "起手", "把整箱金子抖上头顶再放开的准备时间；速度越快越短，倾库式更慢。"),
        aftercast: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(10, 18).round(0),
            "收招", "金雨落尽后站稳的收势；速度越快越利落。"),
        wait: seconds(
            F.base(140)
                .minus(F.level().minus(40).times(0.5).clamp(-10, 30))
                .plus(F.when(F.pref("hoard", text("worldcombat.skill.makeitrain.preference.hoard")), F.const(30), F.const(0)))
                .clamp(100, 190).round(0),
            "冷却", "再次倾下金雨前的等待；等级越高越熟练，倾库式蓄得更久。PP 5 的代价。")
    });

    defineDamage("makeitrain", "coin", {});

    stages("makeitrain", [
        { level: 50, values: { coin: 132, radius: 5.6 } },
        { level: 70, values: { coin: 150, beams: 20 } }
    ]);

    describe("makeitrain", [
        { key: "description.0", values: ["coin","radius","beams","interval"] },
        { key: "description.1", values: ["scatter"] },
        { key: "description.2", values: ["selfDrop"] },
        { key: "hoard.on", values: [], when: function (context) { return read(context.detail.values, ["hoard"]) === true; } },
        { key: "hoard.off", values: [], when: function (context) { return read(context.detail.values, ["hoard"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.coin", "tier.0.radius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.coin"] }
    ]);
}
