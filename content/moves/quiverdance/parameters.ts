/**
 * 蝶舞 / quiverdance 的参数与数值来源。
 *
 * 原生事实：Bug、Status、威力 —、命中必中、PP 20、目标 self、boosts { spa: +1, spd: +1, spe: +1 }、dance 标签。
 *
 * 翻译：把「轻巧地跳起神秘而又美丽的舞蹈」翻成一圈**扬起的鳞粉**——舞者只轻轻几拍，翅膀一抖就落下成片
 * 鳞粉，鳞粉在身周悬停成一圈薄幕，越抖越密；特攻、特防、速度依次抬起。它是这一族里最轻、最快、也唯一
 * 管特防的舞，并且真的会在场上留下悬停的鳞幕。
 * 取原生「三项各 +1、20 PP、纯自我强化」；放弃回合制里永久保留的等级——这里「鳞幕」以可见窗口存在，
 * 窗口走完鳞粉散落，三项等级一并收回，对手因此有一次拖过窗口的反制。
 *
 * 数值来源（每一项读不同的精灵数据或现场事实，分散到不同参数）：
 *   gift     固定 1 级：原生「特攻、特防、速度各 +1」的对位，是这招的身份而不是成长点。
 *   flutters 基础 2 + 速度偏移，夹 2..5：腿快的个体抖得更多拍。
 *   scales   基础 16 +（特攻 + 特防）/8 + 等级 /3，夹 12..64：特攻特防越高、等级越高，鳞粉越密。
 *   veil     鳞幕半径：基础 0.6 格 + 碰撞箱高度 ×0.35，夹 0.5..1.4：身板越大幕张得越开。
 *   drift    鳞粉飘散速度：基础 0.06 + 速度 /1600，夹 0.05..0.14：越快飘得越急。
 *   beat     每拍间隔：速度每比 60 快 1 减 0.03 刻，夹 3..6。
 *   span     鳞幕窗口：基础 200 刻 + 等级 ×4 + 特防 ×0.8，夹 180..480；配置「厚幕」×1.35。
 *   tempo    起式：速度每比 60 快 1 减 0.03 刻，夹 4..9；配置「厚幕」+2。
 *   aftercast 收招：基础 5 刻 + 碰撞箱高度 ×1.2，夹 5..8。
 *   wait     冷却：基础 96 刻 − 等级 ×0.5，夹 64..110；配置「厚幕」+12。PP 20 的代价。
 * 配置 veil（厚幕）：开启时鳞粉更多、窗口 ×1.35，代价是起式 +2 刻、冷却 +12；关闭时轻缀、出手更快。
 */
namespace PokemonSkills {
    actionParameters.define("quiverdance", {
        /** 蝶舞增益：原生三项各 +1。 */
        gift: formula(F.const(1), "蝶舞增益", {
            unit: " 级",
            description: "这支舞把特攻、特防、速度各抬高多少级；原生「提高特攻、特防和速度」的对位。"
        }),
        /** 扬鳞拍数：腿快的人抖得更密。 */
        flutters: formula(
            F.base(2).plus(F.stat("speed").minus(40).div(80)).clamp(2, 5).round(0),
            "扬鳞拍数", {
                unit: " 拍",
                description: "起式之后抖几拍；速度越高越密，画面里的鳞环层数也越多。"
            }),
        /** 鳞粉数量：特攻与特防共同派生。 */
        scales: formula(
            F.base(16).plus(F.stat("specialAttack").plus(F.stat("specialDefence")).div(8)).plus(F.level().div(3))
                .times(F.when(F.pref("veil", text("worldcombat.skill.quiverdance.preference.veil")), F.const(1.4), F.const(1)))
                .clamp(12, 64).round(0),
            "鳞粉数量", {
                unit: " 片",
                description: "整支舞抖落的鳞粉粒子总数；特攻、特防与等级越高越密，厚幕再 ×1.4。画面里的数量与机制一致。"
            }),
        /** 鳞幕半径：身板越大张得越开。 */
        veil: formula(
            F.base(0.6).plus(F.body("height").times(0.35)).clamp(0.5, 1.4).round(2),
            "鳞幕半径", {
                unit: " 格",
                description: "鳞粉悬停成幕的半径；身板越大张得越开。判定与表现读同一个半径。"
            }),
        /** 飘散速度：越快飘得越急。 */
        drift: formula(
            F.base(0.06).plus(F.stat("speed").div(1600)).clamp(0.05, 0.14).round(3),
            "飘散速度", {
                unit: " 格/刻",
                description: "鳞粉离体后向外飘散的速度；速度越高飘得越急。"
            }),
        /** 每拍间隔：越快越急。 */
        beat: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03)).clamp(3, 6).round(0),
            "拍子", "两拍之间隔多久；速度越高越急。"),
        /** 鳞幕窗口：三项留在身上的时长。 */
        span: seconds(
            F.base(200).plus(F.level().times(4)).plus(F.stat("specialDefence").times(0.8))
                .times(F.when(F.pref("veil", text("worldcombat.skill.quiverdance.preference.veil")), F.const(1.35), F.const(1)))
                .clamp(180, 480).round(0),
            "鳞幕窗口", "「鳞幕」在身上的时长；等级与特防越高撑得越久，厚幕再 ×1.35。窗口走完，这段舞抬起的三项一并收回。"),
        /** 起式：速度决定收翅多快。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("veil", text("worldcombat.skill.quiverdance.preference.veil")), F.const(2), F.const(0)))
                .clamp(4, 9).round(0),
            "起式", "收翅、起式需要多久；速度越高越快，厚幕要多花 2 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 8).round(0),
            "收招", "垂幕收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(96).minus(F.level().times(0.5))
                .plus(F.when(F.pref("veil", text("worldcombat.skill.quiverdance.preference.veil")), F.const(12), F.const(0)))
                .clamp(64, 110).round(0),
            "冷却", "两次蝶舞之间的等待；等级越高越短，厚幕更长。PP 20 的代价。")
    });

    stages("quiverdance", [
        { level: 30, values: { wait: 88, span: 260 } },
        { level: 50, values: { wait: 74, span: 330 } }
    ]);

    describe("quiverdance", [
        { key: "description.0", values: ["gift"] },
        { key: "description.1", values: ["span"] },
        { key: "veil.on", values: [], when: function (context) { return read(context.detail.values, ["veil"]) === true; } },
        { key: "veil.off", values: [], when: function (context) { return read(context.detail.values, ["veil"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.span"] }
    ]);
}
