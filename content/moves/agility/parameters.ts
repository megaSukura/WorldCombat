/**
 * 高速移动 / agility — 参数与数值来源。
 *
 * 原生事实：Psychic、变化、威力 —、命中必中、PP 30、目标 self、boosts { spe: +2 }、flags snatch/metronome。
 *
 * 翻译：把「让身体放松变得轻盈」翻成**一瞬的松劲与回弹**——全身的力先卸掉，脚下一圈风先收再炸，
 *   身体比周围先动起来；速度大幅提高，并在身上留下一段「轻身」余韵（残影拖尾）。取原生「+2 速度、30 PP、
 *   纯自我强化、不需要目标」；放弃回合制里永久保留的等级 → 即时交战里立刻写入公共能力阶梯
 *   （宝可梦走原生等级，其他战斗者落到移动速度属性），轻身窗口是它留给场上的读法，也是 AI 不重复施放的理由。
 *   本族里它最便宜、最快、最不留痕迹：起手极短、冷却最低，世上什么都不留下。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift      提速等级：基础 2，基础速度 ≥ 110 再 +1；夹 2..3。天生快的个体把这一档推得更高。
 *   surge     风爆半径：基础 0.8 格 + 碰撞箱宽度×0.7；夹 0.7..2.0。体型越宽，脚下一圈风炸得越开。
 *   rushTicks 轻身窗口：基础 90 刻 + 速度×1.2；夹 90..260。速度越高，轻身余韵留得越久。
 *   motes     风点数量：基础 24 + 速度×0.4；夹 24..90。速度越高风点越密，也是画面里的数量。
 *   tempo     起手：速度每比 60 快 1 减 0.03 刻；夹 4..9。越快的个体越早松劲。
 *   aftercast 收招：基础 4 刻 + 体重（kg）×0.02；夹 4..9。身体越重，松下来之后收得越慢。
 *   wait      冷却：基础 60 刻 − 等级×0.4；夹 40..70。等级越高越熟练。PP 30 的代价。
 * 无玩法配置项：这招的取舍只在「什么时候用」，没有第二种可调的玩法。
 */
namespace PokemonSkills {
    actionParameters.define("agility", {
        /** 提速等级：原生「大幅提速」的对位，天生快的个体再推一档。 */
        gift: formula(
            F.base(2).plus(F.when(F.stat("speed").gte(110), F.const(1), F.const(0))).clamp(2, 3).round(0),
            "提速等级", {
                unit: " 级",
                description: "松劲之后抬高的速度等级；基础速度 ≥ 110 的个体多推一档。"
            }),
        /** 风爆半径：体型越宽炸得越开。 */
        surge: formula(
            F.base(0.8).plus(F.body("width").times(0.7)).clamp(0.7, 2.0).round(2),
            "风爆半径", {
                unit: " 格",
                description: "脚下一圈风炸开的半径；碰撞箱越宽炸得越开。画面里的地环就是这个半径。"
            }),
        /** 轻身窗口：速度越高余韵越久。 */
        rushTicks: seconds(
            F.base(90).plus(F.stat("speed").times(1.2)).clamp(90, 260).round(0),
            "轻身窗口", "「轻身」在身上留多久；速度越高留得越久。窗口内 AI 不会重复施放。"),
        /** 风点数量：速度越高越密。 */
        motes: formula(
            F.base(24).plus(F.stat("speed").times(0.4)).clamp(24, 90).round(0),
            "风点数量", {
                unit: " 点",
                description: "一次爆发带起的风点数量；速度越高越密，粒子按它发射。"
            }),
        /** 起手：速度决定松劲多快。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03)).clamp(4, 9).round(0),
            "起手", "卸力、松劲需要多久；速度越快越早完成。"),
        /** 收招：身体越重收得越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("weight").div(10).times(0.02)).clamp(4, 9).round(0),
            "收招", "松劲之后的收势；身体越重收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(60).minus(F.level().times(0.4)).clamp(40, 70).round(0),
            "冷却", "两次高速移动之间的等待；等级越高越短。PP 30 的代价。")
    });

    stages("agility", [
        { level: 45, values: { wait: 52 } },
        { level: 60, values: { wait: 46 } }
    ]);

    describe("agility", [
        { key: "description.0", values: ["gift"] },
        { key: "description.1", values: ["rushTicks"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
