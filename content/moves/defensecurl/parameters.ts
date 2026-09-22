/**
 * 变圆 / defensecurl — 参数与数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中必中、PP 40、目标 self、boosts { def: +1 }，
 *   并附带 volatile "defensecurl"（原作里它让滚动招式威力翻倍）。
 *
 * 翻译：把「将身体蜷曲变圆」翻成**把自己缩成一颗滚圆的球**——球一成形，防御提高；挨打时球顺势滚开一段，
 *   把冲力卸成位移，而不是站着踉跄。取原生「防御 +1、PP 40、纯自我强化」与那颗「球」的意象（滚动）；
 *   放弃回合制里永久保留的等级——即时交战里防御等级立刻写入公共能力阶梯，卷球是一段可见窗口，
 *   窗口走完或被清除时等级一起收回（对手有一次磨掉它的反制）。它是本族里唯一会移动的一招：
 *   别的三招站定护住自己，变圆靠滚动把被打的位置换掉。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift      防御等级：固定 1，原生「提高防御」的对位，是这招的身份常数。
 *   window    卷球时长：基础 120 刻 + 等级×2 + 防御×0.5；夹 100..320。等级与防御越高，球多撑一会儿。
 *   ball      球半径：基础 0.55 格 + 碰撞箱宽度×0.45；夹 0.5..1.4。体型越宽，蜷成的球越大（判定与表现同径）。
 *   roll      滚开距离：基础 0.8 格 + 速度×0.012 − 体重（kg）/10×0.02；夹 0.5..2.4。轻而快的个体滚得越远。
 *   spin      滚动尘量：基础 18 + 体重（kg）/8；夹 16..64。身体越沉，滚动时掀起的尘点越多，粒子按它发射。
 *   rollGap   滚动间隔：基础 14 刻 − 等级×0.05；夹 8..18。等级越高越熟练，多段攻击不会每一下都把人滚飞。
 *   tempo     起手：基础 6 刻 − 速度×0.02；夹 4..9。越快的个体缩成球越快。
 *   aftercast 收招：基础 4 刻 + 碰撞箱高度×1.2；夹 4..8。身板越高大收得越慢。
 *   wait      冷却：基础 90 刻 − 等级×0.4；夹 60..110。等级越高越熟练。PP 40 的代价。
 * 配置 counter（滚向）双向取舍：关闭＝顺势滚开，远离打你的人、把身位换掉；开启＝反撞回去，挨打反而切进对手
 *   怀里。一侧保命走位、一侧贴身续压，两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("defensecurl", {
        /** 防御等级：原生 +1，本招的身份常数。 */
        gift: formula(F.const(1), "防御等级", {
            unit: " 级",
            description: "蜷成球时把防御抬高多少级；原生「提高防御」的对位。"
        }),
        /** 卷球时长：等级与防御决定球能撑多久。 */
        window: seconds(
            F.base(120).plus(F.level().times(2)).plus(F.stat("defence").times(0.5)).clamp(100, 320).round(0),
            "卷球时长", "球在身上撑多久；等级与防御越高撑得越久。窗口走完或被清除时，这段防护抬起的等级一起收回。"),
        /** 球半径：体型越宽蜷成的球越大。 */
        ball: formula(
            F.base(0.55).plus(F.body("width").times(0.45)).clamp(0.5, 1.4).round(2),
            "球半径", {
                unit: " 格",
                description: "蜷成的球有多大，也是表现里那颗球与滚动尘环的半径；碰撞箱越宽球越大。"
            }),
        /** 滚开距离：轻而快的个体滚得越远。 */
        roll: formula(
            F.base(0.8).plus(F.stat("speed").times(0.012)).minus(F.body("weight").div(10).times(0.02)).clamp(0.5, 2.4).round(2),
            "滚开距离", {
                unit: " 格",
                description: "挨打时一次滚开多远；速度越快越远，身体越沉越短。滚向由配置「滚向」决定。"
            }),
        /** 滚动尘量：身体越沉掀起的尘越多。 */
        spin: formula(
            F.base(18).plus(F.body("weight").div(8)).clamp(16, 64).round(0),
            "滚动尘量", {
                unit: " 点",
                description: "滚动时掀起的尘点数量；身体越沉越多，粒子按它发射。"
            }),
        /** 滚动间隔：等级越高越熟练。 */
        rollGap: seconds(
            F.base(14).minus(F.level().times(0.05)).clamp(8, 18).round(0),
            "滚动间隔", "两次滚动之间至少隔多久；等级越高越短，避免多段攻击把人反复推走。"),
        /** 起手：速度决定缩球多快。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").times(0.02)).clamp(4, 9).round(0),
            "起手", "把头一缩、缩成一颗球需要多久；速度越快越短。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(1.2)).clamp(4, 8).round(0),
            "收招", "展开身子之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(90).minus(F.level().times(0.4)).clamp(60, 110).round(0),
            "冷却", "两次变圆之间的等待；等级越高越短。PP 40 的代价。")
    });

    stages("defensecurl", [
        { level: 25, values: { window: 160, wait: 80 } },
        { level: 45, values: { window: 200, wait: 70 } }
    ]);

    describe("defensecurl", [
        { key: "description.0", values: ["gift", "window"] },
        { key: "description.1", values: ["ball", "roll", "spin"] },
        { key: "roll.away", values: [], when: function (context) { return read(context.detail.values, ["counter"]) !== 1; } },
        { key: "roll.into", values: [], when: function (context) { return read(context.detail.values, ["counter"]) === 1; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
