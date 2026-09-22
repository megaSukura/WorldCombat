/**
 * 大快朵颐 / Stuff Cheeks —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 10、目标 self；
 *   onTry 要求手持树果（没有则这招不可用），onHit 先 boosts { def: +2 }、再吃下自己的树果（eatItem）。
 *
 * 世界化：把手里那颗树果整颗塞进嘴里，三两下吞下肚；果子自己的效力在身体里散开，鼓起来的肚子撑出一道硬壳，
 *   防御大幅提高。它是这一族里唯一**只吃自己那颗、并把它变成防御**的招：虫咬吃对手的果子、打嗝拿自己的果子
 *   当燃料喷毒，而大快朵颐把自己那颗变成一层护体。手里没有树果时这一口根本没法吃。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数）：
 *   guard    防御等级：基础 2 + 体重偏移（越重撑得越硬）+ 细嚼档 +1，夹 1..3 级。
 *   absorb   树果效果系数：基础 0.9 + 物攻偏移，细嚼档 ×1.35、囫囵档 ×0.85，夹 0.6..1.6。
 *   chew     吞嚼时长：基础 8 刻 − 速度偏移，细嚼档 +4，夹 5..18 刻。
 *   motes    果屑数量：体重 + 物攻，夹 10..34 点，直接驱动粒子。
 *   bulge    护体环半径：碰撞箱宽高，夹 0.6..1.6 格；判定与表现同径。
 *   tempo / aftercast / wait 分别读速度／身高／等级。
 * 配置 savor（细嚼）：树果效果 ×1.35、防御 +1 级，代价是起手与冷却更长（嚼得更久才咽）；
 *   关闭（囫囵）吞得又快又省、冷却短，但效果 ×0.85、防御只有基础档。两向各有局面（有闲钱细品 vs 急着挨打前撑起来）。
 */
namespace PokemonSkills {
    export const stuffcheeksId = "stuffcheeks";

    actionParameters.define(stuffcheeksId, {
        /** 防御等级：体重决定肚子撑得多硬；细嚼档再 +1。 */
        guard: formula(
            F.base(2)
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.5, 0.9).as("体重"))
                .plus(F.when(F.pref("savor"), F.const(1), F.const(0)).as("细嚼"))
                .clamp(1, 3).round(0),
            "防御等级", { unit: " 级", description: "吃下这一口把自己的防御抬高几级（原生 +2）；体重越大撑得越硬，细嚼档再 +1，夹 1..3 级。" }),
        /** 树果效果系数：把果子嚼得多碎、吸收得多完整。 */
        absorb: formula(
            F.base(0.9).plus(F.stat("attack").minus(60).times(0.003).clamp(0, 0.35).as("物攻"))
                .times(F.when(F.pref("savor"), F.const(1.35), F.const(0.85)).as("细嚼"))
                .clamp(0.6, 1.6).round(3),
            "吸收系数", { unit: " 倍", description: "果子自己的效果（回复／解异常／升能力）按这个系数放大；物攻越高嚼得越碎，细嚼 ×1.35、囫囵 ×0.85。" }),
        /** 吞嚼时长。 */
        chew: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 4))
                .plus(F.when(F.pref("savor"), F.const(4), F.const(0)).as("细嚼"))
                .clamp(5, 18).round(0),
            "吞嚼时长", "果子在嘴里嚼碎、咽下要多久；速度越快嚼得越快，细嚼多花 4 刻。"),
        /** 果屑数量。 */
        motes: formula(
            F.base(14).plus(F.body("weight").div(12)).plus(F.stat("attack").times(0.08)).clamp(10, 34).round(0),
            "果屑数量", { unit: " 点", description: "咬开果子时迸出的果屑数量；体重与物攻越大越多，粒子按它发射。" }),
        /** 护体环半径。 */
        bulge: formula(
            F.base(0.7).plus(F.body("width").times(0.6)).plus(F.body("height").times(0.3)).clamp(0.6, 1.6).round(2),
            "护体半径", { unit: " 格", description: "撑起的那道硬壳环有多大；身板越大越宽。判定与表现读同一个半径。" }),
        /** 起手。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("savor"), F.const(2), F.const(0)).as("细嚼"))
                .clamp(4, 12).round(0),
            "起手", "把果子举到嘴边、吞下去之前的准备；速度越快越利落，细嚼多花 2 刻。"),
        /** 收招。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 9).round(0),
            "收招", "咽下之后收势的时间；身板越大收得稍慢。"),
        /** 冷却。 */
        wait: seconds(
            F.base(90).minus(F.level().times(0.5))
                .plus(F.when(F.pref("savor"), F.const(12), F.const(0)).as("细嚼"))
                .clamp(60, 120).round(0),
            "冷却", "两次大快朵颐之间的等待；等级越高越熟练，细嚼更长。")
    });

    stages(stuffcheeksId, [
        { level: 40, values: { wait: 80 } },
        { level: 60, values: { wait: 68 } }
    ]);

    describe(stuffcheeksId, [
        { key: "description.0", values: ["guard"] },
        { key: "description.1", values: ["absorb", "chew", "motes"] },
        { key: "description.2", values: ["bulge", "tempo", "aftercast", "wait"] },
        { key: "stance.savor", values: [], when: function (context) { return read(context.detail.values, ["savor"]) === true; } },
        { key: "stance.gulp", values: [], when: function (context) { return read(context.detail.values, ["savor"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
