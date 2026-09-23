/**
 * 冥想 / calmmind — 参数与数值来源。
 *
 * 原生事实：Psychic、变化、威力 —、命中必中、PP 20、目标 self、boosts { spa: +1, spd: +1 }。
 *
 * 翻译：把「静下心来凝神」翻成**收住心神、把自己罩进一层几乎透明的清明**——特攻与特防一起抬起来。
 *   取原生「特攻 +1、特防 +1、PP 20、纯自我强化」；放弃回合制里永久保留的等级——即时交战里两项等级立刻写入
 *   公共能力阶梯，清明是一段可见窗口，窗口走完或被清除时两项一起收回。它是本组里唯一抬特攻的一招，也是唯一
 *   不改变外形的一招：别的招靠体型、壳、手下，它只靠一段专注。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   insight  特攻等级：深冥想 2 级／浅冥想 1 级；夹 1..2。原生 +1 是基准，配置把它在两向之间挪一格。
 *   poise    特防等级：深冥想 2 级／浅冥想 1 级；夹 1..2。与 insight 共用同一份配置，两项各成一个公式叶子。
 *   stillness 清明时长：基础 200 刻 + 等级×4 + 特攻×0.5；夹 150..480。等级与特攻越高，专注撑得越久，深冥想再 ×1.3。
 *   ripple   涟漪半径：基础 0.9 格 + 碰撞箱宽度×0.8 + 碰撞箱高度×0.15；夹 0.8..2.2。体型越大，静气铺得越开（判定与表现同径）。
 *   motes    静念微粒量：基础 24 +（特攻 + 特防）/10；夹 20..90。两防越高，一次静下来浮起的念力微粒越多，粒子按它发射。
 *   breaths  呼吸拍数：基础 2 + 等级/22；夹 2..4。等级越高，静气多推开几圈。
 *   tempo    起手：基础 7 刻 − 速度×0.02，深冥想再 +6；夹 4..15。越快的个体收心越快，深冥想更慢。
 *   aftercast 收招：基础 5 刻 + 碰撞箱高度×1.0；夹 5..10。
 *   wait     冷却：基础 95 刻 − 等级×0.4，浅冥想 ×0.85／深冥想 ×1.3；夹 55..150。PP 20 的代价。
 * 配置 deep（深呼吸）双向取舍：深冥想＝特攻 +2／特防 +2、清明更久，但起手 +6 刻、冷却更长，容易被打断；
 *   浅冥想＝特攻 +1／特防 +1、瞬发短冷却，随时能补。两向各有局面（硬仗前坐深 vs 拉锯里随时补）。
 */
namespace PokemonSkills {
    actionParameters.define("calmmind", {
        /** 特攻等级：深冥想 2 级／浅冥想 1 级。 */
        insight: formula(
            F.when(F.pref("deep", text("worldcombat.skill.calmmind.preference.deep")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "特攻等级", {
                unit: " 级",
                description: "冥想把特攻抬高多少级；深冥想 2 级，浅冥想 1 级。"
            }),
        /** 特防等级：深冥想 2 级／浅冥想 1 级。 */
        poise: formula(
            F.when(F.pref("deep", text("worldcombat.skill.calmmind.preference.deep")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "特防等级", {
                unit: " 级",
                description: "冥想把特防抬高多少级；深冥想 2 级，浅冥想 1 级。"
            }),
        /** 清明时长：特攻决定专注撑多久，等级由成长阶梯拉长。 */
        stillness: seconds(
            F.base(200).plus(F.stat("specialAttack").times(0.5))
                .times(F.when(F.pref("deep", text("worldcombat.skill.calmmind.preference.deep")), F.const(1.3), F.const(0.8)))
                .clamp(150, 480).round(0),
            "清明时长", "收住的心神撑多久；特攻越高越久，等级在同级台阶上再拉长，深冥想再 ×1.3。窗口走完或被清除时，两项等级一起收回。"),
        /** 涟漪半径：体型越宽静气铺得越开。 */
        ripple: formula(
            F.base(0.9).plus(F.body("width").times(0.8)).plus(F.body("height").times(0.15))
                .times(F.when(F.pref("deep", text("worldcombat.skill.calmmind.preference.deep")), F.const(1.1), F.const(1)))
                .clamp(0.8, 2.2).round(2),
            "涟漪半径", {
                unit: " 格",
                description: "静气从身上铺开的半径，也是表现里静环的范围；体型越大铺得越开。"
            }),
        /** 静念微粒量：特攻与特防越高越多。 */
        motes: formula(
            F.base(24).plus(F.stat("specialAttack").plus(F.stat("specialDefence")).div(10)).clamp(20, 90).round(0),
            "静念微粒量", {
                unit: " 点",
                description: "一次静下来浮起的念力微粒数量；特攻与特防越高越多，粒子按它发射。"
            }),
        /** 呼吸拍数：等级越高多推几圈。 */
        breaths: formula(
            F.base(2).plus(F.level().div(22)).clamp(2, 4).round(0),
            "呼吸拍数", {
                unit: " 拍",
                description: "静气推开几圈；等级越高越多，画面按它一圈圈散开。"
            }),
        /** 起手：速度决定收心多快，深冥想更慢。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.calmmind.preference.deep")), F.const(6), F.const(0)))
                .clamp(4, 15).round(0),
            "起手", "收住心神需要多久；速度越快越短，深冥想更慢（也更容易被打断）。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.0)).clamp(5, 10).round(0),
            "收招", "静下来之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级由成长阶梯缩短，深冥想更长。 */
        wait: seconds(
            F.base(95)
                .times(F.when(F.pref("deep", text("worldcombat.skill.calmmind.preference.deep")), F.const(1.3), F.const(0.85)))
                .clamp(55, 150).round(0),
            "冷却", "两次冥想之间的等待；等级越高越短，深冥想更长。PP 20 的代价。")
    });

    stages("calmmind", [
        { level: 30, values: { stillness: 260, wait: 74 } },
        { level: 50, values: { stillness: 300, wait: 68 } }
    ]);

    describe("calmmind", [
        { key: "description.0", values: ["insight", "poise"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "description.1", values: ["stillness"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.stillness", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.stillness", "tier.1.wait"] }
    ]);
}
