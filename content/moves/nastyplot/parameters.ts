/**
 * 诡计 / nastyplot — 参数与数值来源。
 *
 * 原生事实：Dark、变化、威力 —、命中必中、PP 20、目标 self、boosts { spa: +2 }、flags snatch/metronome。
 *
 * 翻译：把「谋划诡计，激活头脑」翻成**把心思盘起来换一段大幅特攻窗口**——头顶的想法汇成一个亮点，特攻抬上去。
 *   取原生「特攻 +2、PP 20、纯自我强化」；放弃回合制里永久保留的等级——即时交战里特攻等级挂在
 *   world_combat:nasty_plot_scheme 载体拥有的 boostWindow 上，诡计是一段可见窗口，窗口走完或被清除时
 *   只收回本招自己抬起的级数。它是本族里唯一**只抬特攻**的一招，也是唯一**没有敌人也能算**的一招。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   scheme   特攻等级：周密算计 2 级／快速算计 1 级；夹 1..2。原生 +2 是基准，配置把它在两向之间挪一格。
 *   reach    算计距离：基础 10 格 + 速度×0.04；夹 8..18。面前这个距离内有非友方活体时，这条毒计盘得更牢
 *            （窗口 ×1.15）——只是加成，没有对手也照样能算；同时也是「面前有没有人可盯」的判定距离。
 *   window   诡计窗口：基础 180 刻 + 特攻×0.4 + 等级×2.5，周密算计再 ×1.2／快速算计 ×0.85；夹 120..460。
 *            特攻越高、等级越高，这条毒计撑得越久；实际执行时若面前有对手再加成。
 *   swirl    标识半径：基础 0.4 格 + 碰撞箱宽度×0.35 + 碰撞箱高度×0.06；夹 0.3..0.9。体型越大，头顶标识略大
 *            （判定与表现同径，不再铺大范围舞台圈）。
 *   motes    暗念点数：基础 20 + 特攻×0.3 + 速度×0.1；夹 18..90。特攻与速度越高，汇成亮点的想法越多，粒子按它发射。
 *   beats    盘算拍数：基础 2 + 等级/24；夹 2..4。等级越高，亮点收拢的余环多转几圈。
 *   tempo    起手：基础 8 刻 − 速度×0.025，周密算计再 +4；夹 4..16。越快的个体起念越快，周密算计更慢。
 *   aftercast 收招：基础 5 刻 + 碰撞箱高度×1.0；夹 5..10。
 *   wait     冷却：基础 100 刻，周密算计 ×1.25／快速算计 ×0.85；夹 55..160。PP 20 的代价。
 * 配置 wary（命名在界面上是「周密算计／快速算计」）双向取舍：周密＝特攻 +2、窗口更久，但起手 +4 刻、冷却更长；
 *   快速＝特攻 +1、窗口更短、起手与冷却都更快。强而慢 vs 弱而快，两向各有局面；两者都随时可算，不再要求附近有敌。
 */
namespace PokemonSkills {
    actionParameters.define("nastyplot", {
        /** 特攻等级：周密算计 2 级／快速算计 1 级。 */
        scheme: formula(
            F.when(F.pref("wary", text("worldcombat.skill.nastyplot.preference.wary")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "特攻等级", {
                unit: " 级",
                description: "诡计把特攻抬高多少级；周密算计 2 级，快速算计 1 级。"
            }),
        /** 算计距离：面前有人可盯时窗口更牢。 */
        reach: formula(
            F.base(10).plus(F.stat("speed").times(0.04)).clamp(8, 18).round(0),
            "算计距离", {
                unit: " 格",
                description: "面前这个距离内有非友方活体时，会盯着它算、窗口更长（×1.15）；没有对手也照样能算。速度越快盯得越远。"
            }),
        /** 诡计窗口：特攻与等级决定这条毒计撑多久，面前有对手时更牢。 */
        window: seconds(
            F.base(180).plus(F.stat("specialAttack").times(0.4)).plus(F.level().times(2.5))
                .times(F.when(F.pref("wary", text("worldcombat.skill.nastyplot.preference.wary")), F.const(1.2), F.const(0.85)))
                .clamp(120, 460).round(0),
            "诡计窗口", "这条毒计在头顶盘多久；特攻与等级越高越久。窗口走完或被清除时，只收回本招抬起的等级；面前若有对手，实际窗口再 ×1.15。"),
        /** 标识半径：体型越宽标识略大。 */
        swirl: formula(
            F.base(0.4).plus(F.body("width").times(0.35)).plus(F.body("height").times(0.06)).clamp(0.3, 0.9).round(2),
            "标识半径", {
                unit: " 格",
                description: "头顶亮起后留下的轻量标识半径，也是亮点收拢的范围；体型越大略大，不再铺大范围舞台圈。"
            }),
        /** 暗念点数：特攻与速度越高越多。 */
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.3)).plus(F.stat("speed").times(0.1)).clamp(18, 90).round(0),
            "暗念点数", {
                unit: " 点",
                description: "一次盘算汇成亮点的想法数量；特攻与速度越高越多，粒子按它发射。"
            }),
        /** 盘算拍数：等级越高多盘几圈。 */
        beats: formula(
            F.base(2).plus(F.level().div(24)).clamp(2, 4).round(0),
            "盘算拍数", {
                unit: " 拍",
                description: "亮点落定后余环转几圈；等级越高越多。"
            }),
        /** 起手：速度决定起念多快，周密算计更慢。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.025))
                .plus(F.when(F.pref("wary", text("worldcombat.skill.nastyplot.preference.wary")), F.const(4), F.const(0)))
                .clamp(4, 16).round(0),
            "起手", "把心思盘起来需要多久；速度越快越短，周密算计更慢。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.0)).clamp(5, 10).round(0),
            "收招", "算完之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：快速算计更短，周密算计更长。 */
        wait: seconds(
            F.base(100)
                .times(F.when(F.pref("wary", text("worldcombat.skill.nastyplot.preference.wary")), F.const(1.25), F.const(0.85)))
                .clamp(55, 160).round(0),
            "冷却", "两次诡计之间的等待；快速算计更短，周密算计更长。PP 20 的代价。")
    });

    stages("nastyplot", [
        { level: 32, values: { window: 300, wait: 82 } },
        { level: 52, values: { window: 380, wait: 70 } }
    ]);

    describe("nastyplot", [
        { key: "description.0", values: ["scheme"] },
        { key: "wary.on", values: [], when: function (context) { return read(context.detail.values, ["wary"]) === true; } },
        { key: "wary.off", values: [], when: function (context) { return read(context.detail.values, ["wary"]) !== true; } },
        { key: "description.1", values: ["reach","window"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
