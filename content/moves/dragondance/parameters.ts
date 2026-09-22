/**
 * 龙之舞 / dragondance 的参数与数值来源。
 *
 * 原生事实：Dragon、Status、威力 —、命中必中、PP 20、目标 self、boosts { atk: +1, spe: +1 }、dance 标签。
 *
 * 翻译：把「激烈地跳起神秘且强有力的舞蹈」翻成一道**螺旋上升的龙气**——舞者原地拧身盘旋，一圈比一圈高，
 * 龙气沿身侧盘成上升的螺旋；收势时落回地面，龙气向外炸成一圈。物攻与速度一起抬起。
 * 取原生「攻速各 +1、20 PP、纯自我强化」；放弃回合制里永久保留的等级——这里「龙势」以可见窗口存在，
 * 窗口走完锋芒散去，攻速等级一并收回，对手因此有一次拖过窗口的反制。
 *
 * 数值来源（每一项读不同的精灵数据或现场事实，分散到不同参数）：
 *   gift    固定 1 级：原生「攻速各 +1」的对位，是这招的身份而不是成长点。
 *   turns   基础 2 + 速度偏移，夹 2..4：腿快的个体盘得更多圈。
 *   gyre    基础 0.55 格 + 碰撞箱高度 ×0.2，夹 0.4..0.95：身板越大旋开得越宽。
 *   lift    每个上升拍抬升的高度，体重越轻抬得越高（0.12..0.42）。
 *   beat    盘旋的拍子，速度越快越急；夹 5..8。
 *   span    龙势窗口：基础 220 刻 + 等级 ×4 + 速度 ×0.8，夹 200..520。
 *   drakes  龙气数量：基础 16 +（物攻 + 速度）/8，夹 14..60：越强的个体画面里的龙气越密。
 *   tempo   起式：速度每比 60 快 1 减 0.03 刻，夹 6..12。
 *   aftercast 收招：基础 6 刻 + 碰撞箱高度 ×1.5，夹 6..10。
 *   wait    冷却：基础 108 刻 − 等级 ×0.5，夹 72..118；配置「高飞」+12。PP 20 的代价。
 * 配置 soar（高飞）：开启时每个上升拍真的离地一点、龙势窗口 ×1.2，代价是起式 +3 刻、冷却 +12；
 *   关闭时贴地快旋，收得快。两个方向都各有适用局面。
 */
namespace PokemonSkills {
    actionParameters.define("dragondance", {
        /** 龙舞增益：原生攻速各 +1。 */
        gift: formula(F.const(1), "龙舞增益", {
            unit: " 级",
            description: "这支舞把物攻与速度各抬高多少级；原生「提高攻击和速度」的对位。"
        }),
        /** 盘旋圈数：腿快的人盘得更多。 */
        turns: formula(
            F.base(2).plus(F.stat("speed").minus(40).div(90)).clamp(2, 4).round(0),
            "盘旋圈数", {
                unit: " 圈",
                description: "起式之后盘几圈；速度越高盘得越多，画面里的螺旋层数也越多。"
            }),
        /** 螺旋半径：身板越大旋开得越宽。 */
        gyre: formula(
            F.base(0.55).plus(F.body("height").times(0.2)).clamp(0.4, 0.95).round(2),
            "螺旋半径", {
                unit: " 格",
                description: "盘旋时身位画出的螺旋半径；身板越大旋得越开。"
            }),
        /** 每拍抬升：体重越轻抬得越高。 */
        lift: formula(
            F.base(0.36).minus(F.body("weight").div(2000)).clamp(0.12, 0.42).round(3),
            "每拍抬升", {
                unit: " 格",
                description: "「高飞」下每个上升拍离地的高度；体重越轻抬得越高。"
            }),
        /** 拍子：速度决定盘旋多急。 */
        beat: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03)).clamp(5, 8).round(0),
            "拍子", "一圈与下一圈之间的间隔；速度越高转得越急。"),
        /** 龙势窗口：攻速留在身上的时长。 */
        span: seconds(
            F.base(220).plus(F.level().times(4)).plus(F.stat("speed").times(0.8))
                .times(F.when(F.pref("soar", text("worldcombat.skill.dragondance.preference.soar")), F.const(1.2), F.const(1)))
                .clamp(200, 520).round(0),
            "龙势窗口", "「龙势」在身上的时长；等级与速度越高撑得越久，高飞再 ×1.2。窗口走完，这段舞抬起的攻速一并收回。"),
        /** 龙气数量：攻速之和派生。 */
        drakes: formula(
            F.base(16).plus(F.stat("attack").plus(F.stat("speed")).div(8)).clamp(14, 60).round(0),
            "龙气数量", {
                unit: " 点",
                description: "整支舞发射的龙气粒子总数；物攻与速度越高越密，粒子数量与机制里的数值一致。"
            }),
        /** 起式：速度决定盘起多快。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("soar", text("worldcombat.skill.dragondance.preference.soar")), F.const(3), F.const(0)))
                .clamp(6, 12).round(0),
            "起式", "拧身盘起需要多久；速度越高越快，高飞要多花 3 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.5)).clamp(6, 10).round(0),
            "收招", "落地收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(108).minus(F.level().times(0.5))
                .plus(F.when(F.pref("soar", text("worldcombat.skill.dragondance.preference.soar")), F.const(12), F.const(0)))
                .clamp(72, 118).round(0),
            "冷却", "两次龙之舞之间的等待；等级越高越短，高飞更长。PP 20 的代价。")
    });

    stages("dragondance", [
        { level: 30, values: { wait: 98, span: 280 } },
        { level: 50, values: { wait: 82, span: 350 } }
    ]);

    describe("dragondance", [
        { key: "description.0", values: ["gift", "turns", "drakes"] },
        { key: "description.1", values: ["span", "gyre"] },
        { key: "soar.on", values: ["lift"], when: function (context) { return read(context.detail.values, ["soar"]) === true; } },
        { key: "soar.off", values: [], when: function (context) { return read(context.detail.values, ["soar"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.span"] }
    ]);
}
