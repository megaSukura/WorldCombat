/**
 * 诡计 / nastyplot — 参数与数值来源。
 *
 * 原生事实：Dark、变化、威力 —、命中必中、PP 20、目标 self、boosts { spa: +2 }、flags snatch/metronome。
 *
 * 翻译：把「谋划诡计，激活头脑」翻成**把心思全部堆到一个眼前的对手身上**——算计要有人可算。
 *   取原生「特攻 +2、PP 20、纯自我强化、不需要目标」；放弃回合制里永久保留的等级——即时交战里等级立刻写入
 *   公共能力阶梯，诡计是一段可见窗口（暗念在头顶盘旋），窗口走完或被清除时收回。
 *   本招独有的条件：配置「算计活人」开启时，**面前必须有一个非友方活体**才算得动（同一族里唯一带出手条件的招）；
 *   关掉则在开战前也能闭门先垫一档，代价是只 +1。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   scheme   特攻等级：算计活人 2 级／闭门算计 1 级；夹 1..2。原生 +2 是基准，配置把它在两向之间挪一格。
 *   reach    算计距离：基础 10 格 + 速度×0.04；夹 8..18。「面前」由速度决定——身手越快，能算计到越远的目标。
 *   window   诡计窗口：基础 180 刻 + 特攻×0.4 + 等级×2.5，算计活人再 ×1.2／闭门 ×0.85；夹 120..460。
 *            特攻越高、等级越高，这条毒计撑得越久；有具体对象时算得更牢。
 *   swirl    暗念半径：基础 0.9 格 + 碰撞箱宽度×0.9 + 碰撞箱高度×0.12；夹 0.8..2.2。体型越大，暗念铺得越开（判定与表现同径）。
 *   motes    暗念点数：基础 20 + 特攻×0.3 + 速度×0.1；夹 18..90。特攻与速度越高，盘旋的暗念越多，粒子按它发射。
 *   beats    盘算拍数：基础 2 + 等级/24；夹 2..4。等级越高，暗念多盘几圈。
 *   tempo    起手：基础 8 刻 − 速度×0.025，算计活人再 +4；夹 4..16。越快的个体起念越快，要盯人更慢。
 *   aftercast 收招：基础 5 刻 + 碰撞箱高度×1.0；夹 5..10。
 *   wait     冷却：基础 100 刻，算计活人 ×1.25／闭门 ×0.85；夹 55..160。PP 20 的代价。
 * 配置 wary（算计活人）双向取舍：开启＝特攻 +2、窗口更久，但**只在面前有对手时能出手**（对手藏起来就没法算）；
 *   关闭＝特攻 +1、随时可算（开战前也能先垫），冷却更短。强而受限 vs 弱而随时，两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("nastyplot", {
        /** 特攻等级：算计活人 2 级／闭门算计 1 级。 */
        scheme: formula(
            F.when(F.pref("wary", text("worldcombat.skill.nastyplot.preference.wary")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "特攻等级", {
                unit: " 级",
                description: "诡计把特攻抬高多少级；算计活人 2 级，闭门算计 1 级。"
            }),
        /** 算计距离：速度决定能盯多远。 */
        reach: formula(
            F.base(10).plus(F.stat("speed").times(0.04)).clamp(8, 18).round(0),
            "算计距离", {
                unit: " 格",
                description: "「面前」有多远：范围内有非友方活体才算得动；速度越快盯得越远。"
            }),
        /** 诡计窗口：特攻与等级决定这条毒计撑多久，有对象时更牢。 */
        window: seconds(
            F.base(180).plus(F.stat("specialAttack").times(0.4)).plus(F.level().times(2.5))
                .times(F.when(F.pref("wary", text("worldcombat.skill.nastyplot.preference.wary")), F.const(1.2), F.const(0.85)))
                .clamp(120, 460).round(0),
            "诡计窗口", "这条毒计在头上盘旋多久；特攻与等级越高越久，盯着具体对手时更牢。窗口走完或被清除时，等级收回。"),
        /** 暗念半径：体型越宽铺得越开。 */
        swirl: formula(
            F.base(0.9).plus(F.body("width").times(0.9)).plus(F.body("height").times(0.12)).clamp(0.8, 2.2).round(2),
            "暗念半径", {
                unit: " 格",
                description: "暗念从身上铺开的半径，也是表现里暗环的范围；体型越大铺得越开。"
            }),
        /** 暗念点数：特攻与速度越高越多。 */
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.3)).plus(F.stat("speed").times(0.1)).clamp(18, 90).round(0),
            "暗念点数", {
                unit: " 点",
                description: "一次盘算浮起的暗念数量；特攻与速度越高越多，粒子按它发射。"
            }),
        /** 盘算拍数：等级越高多盘几圈。 */
        beats: formula(
            F.base(2).plus(F.level().div(24)).clamp(2, 4).round(0),
            "盘算拍数", {
                unit: " 拍",
                description: "暗念盘几圈；等级越高越多，画面按它一圈圈收拢再炸开。"
            }),
        /** 起手：速度决定起念多快，盯人更慢。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.025))
                .plus(F.when(F.pref("wary", text("worldcombat.skill.nastyplot.preference.wary")), F.const(4), F.const(0)))
                .clamp(4, 16).round(0),
            "起手", "把心思堆起来需要多久；速度越快越短，算计活人更慢（要盯着人算）。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.0)).clamp(5, 10).round(0),
            "收招", "算完之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：闭门算计更短，算计活人更长。 */
        wait: seconds(
            F.base(100)
                .times(F.when(F.pref("wary", text("worldcombat.skill.nastyplot.preference.wary")), F.const(1.25), F.const(0.85)))
                .clamp(55, 160).round(0),
            "冷却", "两次诡计之间的等待；闭门算计更短，算计活人更长。PP 20 的代价。")
    });

    stages("nastyplot", [
        { level: 32, values: { window: 300, wait: 82 } },
        { level: 52, values: { window: 380, wait: 70 } }
    ]);

    describe("nastyplot", [
        { key: "description.0", values: ["scheme"] },
        { key: "wary.on", values: [], when: function (context) { return read(context.detail.values, ["wary"]) === true; } },
        { key: "wary.off", values: [], when: function (context) { return read(context.detail.values, ["wary"]) !== true; } },
        { key: "description.1", values: ["reach", "window"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
