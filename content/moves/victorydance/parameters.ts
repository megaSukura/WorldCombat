/**
 * 胜利之舞 / victorydance 的参数与数值来源。
 *
 * 原生事实：Fighting、Status、威力 —、命中必中、PP 10、目标 self、boosts { atk: +1, def: +1, spe: +1 }。
 * 已实装学习者只有洗翠形态的裙儿小姐（level 1 学会）。PP 10 是它最贵的一支。
 *
 * 翻译：把「激烈地跳起唤来胜利的舞蹈」翻成一场**仪典**——舞者立定行礼，然后一下一下把脚步踏进地面，
 * 每踏一步从脚下荡开一圈金环；踏到终拍，一顶桂冠在头顶升起，攻击、防御、速度一起抬高。
 * 它是这一族里最长、最贵、最隆重的一支，并且是唯一「越打越持久」的舞：凯旋存续期间，舞者每命中一次，
 * 这份胜利就向上延续一段（有上限），直到很久没有战果才落幕。
 * 取原生「三项各 +1、PP 10、纯自我强化」；放弃回合制里永久保留的等级——这里「凯旋」以可见窗口存在，
 * 窗口走完冠冕散去，三项等级一并收回。
 *
 * 数值来源（每一项读不同的精灵数据或现场事实，分散到不同参数）：
 *   gift      固定 1 级：原生「攻击、防御、速度各 +1」的对位，是这招的身份而不是成长点。
 *   beats     基础 3 + （等级 − 30）/40，再按「隆重」+2，夹 3..6：等级越高、越隆重，踏得越多拍。
 *   pace      每拍间隔：速度每比 60 快 1 减 0.03 刻，夹 5..8。
 *   crown     冠冕半径：基础 0.9 格 + 碰撞箱高度 ×0.35，夹 0.8..1.8：身板越大冠张得越开。
 *   span      凯旋窗口：基础 260 刻 + 等级 ×4 +（物攻 + 防御 + 速度）/6，夹 240..560；隆重 ×1.4。
 *   laurels   桂叶数量：基础 20 +（物攻 + 防御 + 速度）/10 + 等级 /3，夹 16..70：三项越强画面里的金叶越密。
 *   rallyGain 每次命中的延续量：固定 6 秒。
 *   rallyCap  延续上限：固定 60 秒；到顶后不再延长，凯旋终会落幕。
 *   tempo     起式：速度每比 60 快 1 减 0.03 刻，夹 7..14；隆重 +4。
 *   aftercast 收招：基础 7 刻 + 碰撞箱高度 ×1.5，夹 7..12。
 *   wait      冷却：基础 140 刻 − 等级 ×0.6，夹 100..160；隆重 +20。PP 10 的代价。
 * 配置 grand（隆重）：开启时多踏两拍、窗口 ×1.4，代价是起式 +4 刻、冷却 +20；关闭时简办、出手更快。
 */
namespace PokemonSkills {
    actionParameters.define("victorydance", {
        /** 凯旋增益：原生三项各 +1。 */
        gift: formula(F.const(1), "凯旋增益", {
            unit: " 级",
            description: "这场仪典把攻击、防御、速度各抬高多少级；原生「提高攻击、防御和速度」的对位。"
        }),
        /** 踏步拍数：等级与隆重程度决定。 */
        beats: formula(
            F.base(3).plus(F.level().minus(30).max(0).div(40))
                .plus(F.when(F.pref("grand", text("worldcombat.skill.victorydance.preference.grand")), F.const(2), F.const(0)))
                .clamp(3, 6).round(0),
            "踏步拍数", {
                unit: " 拍",
                description: "立冠前把脚步踏进地面几拍；等级越高、越隆重，踏得越多，画面里的金环也越多。"
            }),
        /** 每拍间隔：越快越急。 */
        pace: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03)).clamp(5, 8).round(0),
            "拍子", "两拍之间隔多久；速度越高踏得越急。"),
        /** 冠冕半径：身板越大张得越开。 */
        crown: formula(
            F.base(0.9).plus(F.body("height").times(0.35)).clamp(0.8, 1.8).round(2),
            "冠冕半径", {
                unit: " 格",
                description: "桂冠在头顶张开的半径；身板越大张得越开。判定与表现读同一个半径。"
            }),
        /** 凯旋窗口：三项留在身上的时长。 */
        span: seconds(
            F.base(260).plus(F.level().times(4)).plus(F.stat("attack").plus(F.stat("defence")).plus(F.stat("speed")).div(6))
                .times(F.when(F.pref("grand", text("worldcombat.skill.victorydance.preference.grand")), F.const(1.4), F.const(1)))
                .clamp(240, 560).round(0),
            "凯旋窗口", "「凯旋」在身上的时长；等级与三项越高撑得越久，隆重再 ×1.4。窗口走完，这场舞抬起的三项一并收回。"),
        /** 桂叶数量：三项派生。 */
        laurels: formula(
            F.base(20).plus(F.stat("attack").plus(F.stat("defence")).plus(F.stat("speed")).div(10)).plus(F.level().div(3))
                .clamp(16, 70).round(0),
            "桂叶数量", {
                unit: " 片",
                description: "冠冕升起与余韵里飘落的金色桂叶粒子总数；三项越高、等级越高越密。"
            }),
        /** 每次命中的延续量。 */
        rallyGain: seconds(F.const(120), "延续量", "凯旋存续期间，舞者每命中一次，这份胜利向上延续多久。"),
        /** 延续上限。 */
        rallyCap: seconds(F.const(1200), "延续上限", "凯旋最多被延续到多久；到顶后不再延长，仪典终会落幕。"),
        /** 起式：速度决定行礼多快。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("grand", text("worldcombat.skill.victorydance.preference.grand")), F.const(4), F.const(0)))
                .clamp(7, 14).round(0),
            "起式", "立定行礼需要多久；速度越高越快，隆重要多花 4 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(7).plus(F.body("height").times(1.5)).clamp(7, 12).round(0),
            "收招", "立冠收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练；PP 10 的代价最重。 */
        wait: seconds(
            F.base(140).minus(F.level().times(0.6))
                .plus(F.when(F.pref("grand", text("worldcombat.skill.victorydance.preference.grand")), F.const(20), F.const(0)))
                .clamp(100, 160).round(0),
            "冷却", "两场凯旋之间的等待；等级越高越短，隆重更长。PP 10 的代价。")
    });

    stages("victorydance", [
        { level: 30, values: { wait: 128, span: 300 } },
        { level: 50, values: { wait: 110, span: 380 } }
    ]);

    describe("victorydance", [
        { key: "description.0", values: ["gift", "beats", "laurels"] },
        { key: "description.1", values: ["span", "crown"] },
        { key: "rally", values: ["rallyGain", "rallyCap"] },
        { key: "grand.on", values: [], when: function (context) { return read(context.detail.values, ["grand"]) === true; } },
        { key: "grand.off", values: [], when: function (context) { return read(context.detail.values, ["grand"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.span"] }
    ]);
}
