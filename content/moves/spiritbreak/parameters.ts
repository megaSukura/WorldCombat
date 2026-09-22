/**
 * 灵魂冲击 / spiritbreak —— 参数与伤害段。
 *
 * 原生事实：Fairy／物理／威力 75／命中 100／PP 15／接触／目标单体／100% 令目标特攻 −1。
 *
 * 翻译：把「用足以让对手一蹶不振的气势进行攻击」落成一次**裹着妖精气势的贴身冲撞**——施法者把一股
 *   压人的气收拢到身上，低头沿直线撞上去；命中的那一下把对手的气势打散（特攻 −1），并把冲击化作
 *   一圈向外炸开的妖精光环，把人推得踉跄后退。它是削势二式里唯一贴身、唯一物理、唯一掉特攻的一个。
 *
 * 数据分散（每项依赖不同的精灵数据，小差距因此会变成场上可见的不同）：
 *   spirit    冲击威力：物攻定撞得有多实，等级定气势攒得有多足；碎魂式再抬一档。
 *   drop      掉特攻级数：固定 1 级；碎魂式 2 级。
 *   momentum  冲锋距离：速度决定一口气撞出多远；碎魂式收短。
 *   pace      冲锋速度：速度决定每刻位移。
 *   cloak     判定半径：碰撞箱高度决定裹身气势的范围。
 *   push      击退：物攻决定把人推多远；碎魂式推得更开。
 *   sparks    光环粒子数：物攻与等级决定冲击炸开多少妖精碎光，同时也是画面的发射量。
 *   halo      余韵时长：等级决定气势在冲击点残留多久。
 *   tempo     起手：速度决定收拢气势的快慢，碎魂式更慢。
 *   aftercast 收招：速度决定收势。
 *   wait      冷却：等级决定熟练度，碎魂式更久。
 *
 * 配置 `shatter`（碎魂式）双向取舍：开启＝单发 ×1.15、掉特攻 2 级、击退更远，但冲锋距离收短、
 *   起手 +2 刻、冷却 +8 刻；关闭＝快速突进的贴身压制，掉 1 级、够得更远。两向各有适用局面。
 *
 * 伤害段 `spirit` 与参数同名，走共享换算（原始类别 Physical）。
 */
namespace PokemonSkills {
    actionParameters.define("spiritbreak", {
        spirit: formula(
            F.base(75)
                .plus(F.stat("attack").minus(60).times(0.28).clamp(-12, 36))
                .plus(F.level().minus(30).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("shatter", text("worldcombat.skill.spiritbreak.preference.shatter")), F.const(1.15), F.const(1)))
                .clamp(50, 150).round(1),
            "冲击威力", {
                unit: "威力",
                description: "裹着气势撞上去那一下的基础威力；物攻越重、等级越高越足，碎魂式再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        drop: formula(
            F.base(1).plus(F.when(F.pref("shatter", text("worldcombat.skill.spiritbreak.preference.shatter")), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "掉特攻级数", {
                unit: "级",
                description: "被撞散气势时目标特攻下降的能力等级；原生 1 级，碎魂式直接打掉 2 级。"
            }),
        momentum: formula(
            F.base(3.4)
                .plus(F.stat("speed").minus(60).times(0.025).clamp(-0.5, 1.4))
                .minus(F.when(F.pref("shatter", text("worldcombat.skill.spiritbreak.preference.shatter")), F.const(0.6), F.const(0)))
                .clamp(2.4, 5.2).round(2),
            "冲锋距离", {
                unit: "格",
                description: "一口气撞出的距离；速度越快够得越远，碎魂式收得更短。它同时是本招的射程基准。"
            }),
        pace: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.5)).clamp(0.8, 1.6).round(2),
            "冲锋速度", {
                unit: "格/刻",
                description: "冲锋时每刻移动的距离；越快越难被侧移躲开。"
            }),
        cloak: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.45, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "裹在身上的气势半径，也是本招的横向判定半径；身板越大包得越开。"
            }),
        push: formula(
            F.base(0.4)
                .plus(F.stat("attack").minus(60).times(0.003).clamp(-0.05, 0.3))
                .plus(F.when(F.pref("shatter", text("worldcombat.skill.spiritbreak.preference.shatter")), F.const(0.15), F.const(0)))
                .clamp(0.3, 0.9).round(2),
            "击退", {
                unit: "格",
                description: "撞中后把目标推开的距离；物攻越高推得越远，碎魂式更狠。"
            }),
        sparks: formula(
            F.base(16)
                .plus(F.stat("attack").minus(60).times(0.25).clamp(-4, 20))
                .plus(F.level().minus(30).times(0.3).clamp(0, 10))
                .clamp(12, 48).round(0),
            "光环粒子数", {
                unit: "点",
                description: "冲击炸开的妖精碎光数量；物攻与等级越高越密，也是画面里光环的发射量来源。"
            }),
        halo: seconds(
            F.base(40)
                .plus(F.level().minus(30).times(0.5).clamp(0, 20))
                .plus(F.when(F.pref("shatter", text("worldcombat.skill.spiritbreak.preference.shatter")), F.const(16), F.const(0)))
                .clamp(30, 80).round(0),
            "余韵时长", "冲击点残留的气势光环停留多久；等级越高、碎魂式留得越久。"),
        tempo: seconds(
            F.base(12)
                .minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("shatter", text("worldcombat.skill.spiritbreak.preference.shatter")), F.const(2), F.const(0)))
                .clamp(8, 16).round(0),
            "起手", "把气势收拢到身上再撞出的时间；速度越快越短，碎魂式多花一点。"),
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(7, 13).round(0),
            "收招", "撞完站稳的收势；速度越快越利落。"),
        wait: seconds(
            F.base(40)
                .minus(F.level().minus(30).times(0.1).clamp(-4, 8))
                .plus(F.when(F.pref("shatter", text("worldcombat.skill.spiritbreak.preference.shatter")), F.const(8), F.const(0)))
                .clamp(30, 52).round(0),
            "冷却", "再次收拢气势前的等待；等级越高越熟练，碎魂式蓄得更久。")
    });

    defineDamage("spiritbreak", "spirit", {}, { contact: true });

    stages("spiritbreak", [
        { level: 40, values: { spirit: 84 } },
        { level: 55, values: { spirit: 94, sparks: 24 } }
    ]);

    describe("spiritbreak", [
        { key: "description.0", values: ["spirit"] },
        { key: "description.1", values: ["drop"] },
        { key: "description.2", values: ["momentum", "pace", "push", "cloak"] },
        { key: "shatter.on", values: [], when: function (context) { return read(context.detail.values, ["shatter"]) === true; } },
        { key: "shatter.off", values: [], when: function (context) { return read(context.detail.values, ["shatter"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spirit"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spirit", "tier.1.sparks"] }
    ]);
}
