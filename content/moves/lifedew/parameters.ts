/**
 * 生命水滴 / Life Dew —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Water、变化、威力 0、命中必中、PP 10、目标 allies、
 *   heal [1,4]：回复自己与场上同伴各最大 HP 的 25%。
 *
 * 世界化：把「喷洒出神奇的水」翻成一圈**从脚下越铺越开的水波**——水环贴着地面向外推进，扫过谁，谁的伤口
 *   就被水填上（自己也在圈里）；水波走完就退去，不在世界里留东西。它是这一族里唯一一边走一边救的水；
 *   丛林治疗相反，是瞬间从地里长起来的一圈藤，还顺带解状态、看脚下。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数）：
 *   heal     回复比例：基础 0.16 + 特攻偏移 + 伤势深度 + 丰沛档 ×1.15，夹 0.10..0.36。
 *   radius   水波半径：基础 3.0 + 特攻偏移 + 等级偏移，丰沛档 ×1.15，夹 2.2..5.5 格。
 *   spread   铺满半径的时长：基础 14 刻 − 速度偏移，丰沛档 ×1.3，夹 8..22 刻。
 *   motes    水滴数量：特攻 + 身高，夹 16..64 点，直接驱动粒子。
 *   tempo    起手：速度；aftercast 收招：身高；wait 冷却：等级 + 丰沛档。
 * 配置 surge（丰沛）：回复 ×1.15、半径 ×1.15，代价是铺开更慢（×1.3）、冷却更久；
 *   关闭（细流）铺得又快又省、半径与回复更小。两向各有局面（把一队一起拉回来 vs 顺手快速补一口）。
 */
namespace PokemonSkills {
    export const lifedewId = "lifedew";

    actionParameters.define(lifedewId, {
        /** 回复比例：特攻给出水的灵效，伤势越深这一口越舍得给。 */
        heal: percent(
            F.base(0.16)
                .plus(F.stat("specialAttack").minus(55).times(0.0014).clamp(-0.04, 0.07).as("特攻"))
                .plus(F.base(1).minus(F.actor("healthRatio")).times(0.05).as("伤势"))
                .times(F.when(F.pref("surge"), F.const(1.15), F.const(1)).as("丰沛"))
                .clamp(0.10, 0.36).round(3),
            "回复比例", "被水波扫到的自己与伙伴回复其最大生命的这个比例；特攻越高水越灵，伤得越深这一口给得越多，丰沛档 ×1.15。"),
        /** 水波半径：特攻决定水势，等级决定熟练。 */
        radius: formula(
            F.base(3.0)
                .plus(F.stat("specialAttack").minus(55).times(0.006).clamp(-0.4, 0.8).as("特攻"))
                .plus(F.level().minus(20).max(0).times(0.02).clamp(0, 0.8).as("等级"))
                .times(F.when(F.pref("surge"), F.const(1.15), F.const(1)).as("丰沛"))
                .clamp(2.2, 5.5).round(2),
            "水波半径", { unit: " 格", description: "水波最终铺到多大；特攻越高、等级越高铺得越开，丰沛档 ×1.15。这个圈就是真的会被扫到的范围。" }),
        /** 铺开时长：速度决定水推得多急。 */
        spread: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 4).as("速度"))
                .times(F.when(F.pref("surge"), F.const(1.3), F.const(1)).as("丰沛"))
                .clamp(8, 22).round(0),
            "铺开时长", "水波从脚边推到全半径要多久；速度越快推得越急，丰沛档更慢。越慢，圈里的伙伴越晚被扫到。"),
        /** 水滴数量：特攻与身高派生。 */
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.25)).plus(F.body("height").times(3)).clamp(16, 64).round(0),
            "水滴数量", { unit: " 点", description: "水波里迸出的水滴总数；特攻与体型越大越多，粒子按它发射。" }),
        /** 起手。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "起手", "把水拢在脚下、推出去之前的准备；速度越快越利落。"),
        /** 收招。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 9).round(0),
            "收招", "水波退去后的收势；身板越大收得稍慢。"),
        /** 冷却。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.6))
                .plus(F.when(F.pref("surge"), F.const(12), F.const(0)).as("丰沛"))
                .clamp(80, 150).round(0),
            "冷却", "两次生命水滴之间的等待；等级越高越熟练，丰沛档更长。")
    });

    stages(lifedewId, [
        { level: 40, values: { wait: 108 } },
        { level: 60, values: { wait: 92 } }
    ]);

    describe(lifedewId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.additional", values: [] },
        { key: "description.1", values: ["radius", "spread"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "stance.surge", values: [], when: function (context) { return read(context.detail.values, ["surge"]) === true; } },
        { key: "stance.plain", values: [], when: function (context) { return read(context.detail.values, ["surge"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
