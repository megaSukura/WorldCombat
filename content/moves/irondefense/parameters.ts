/**
 * 铁壁 / irondefense — 参数与数值来源。
 *
 * 原生事实：Steel、变化、威力 —、命中必中、PP 15、目标 self、boosts { def: +2 }。
 *
 * 翻译：把「将皮肤变得坚硬如铁」翻成**一层铁水从脚下浇上来、把身体凝成一座铁像**——硬，也沉。
 *   取原生「防御 +2、PP 15、纯自我强化」；放弃回合制里永久保留的等级 → 即时交战里防御等级立刻写入公共能力阶梯，
 *   铁壳是一段可见窗口，被撕掉、被清除或到期时等级一起收回（对手有一次磨掉它的反制）。
 *   「铁」这一层是这招的身份：铁壳本身带**击退抗性**（撼不动）与**沉重减速**（沉得挪不开），这是本族里唯一
 *   会把身体变成金属、并站得更稳的一招。它与同为防护的棉花防守分开：棉花是软的、慢一点但不动防御等级以外的东西，
 *   铁壁是硬的、扛得住推挤。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift       防御等级：固定 2，原生「大幅提高防御」的对位，是这招的身份常数。
 *   shell      铁壳时长：基础 200 刻 + 等级×3 + 防御×0.8；夹 160..480。防御厚、等级高的个体铁壳撑得更久。
 *   clad       铁环半径：基础 0.9 格 + 碰撞箱宽度×0.8；夹 0.8..2.2。体型越宽，浇上来的铁环铺得越开（判定与表现同径）。
 *   filings    铁屑数量：基础 28 + 体重（kg）/10×0.6；夹 24..96。身体越沉，一次溅出的铁屑越多，粒子按它发射。
 *   tempo      起手：基础 9 刻 − 速度×0.03；夹 5..12。越快的个体浇铸越快。
 *   aftercast  收招：基础 6 刻 + 碰撞箱高度×1.2；夹 6..11。身板越高大收得越慢。
 *   wait       冷却：基础 120 刻 − 等级×0.5；夹 80..140。等级越高越熟练。PP 15 的代价。
 * 无玩法配置项：这招的取舍只在「什么时候站成铁像」，没有第二种可调的玩法（击退抗性与减速是「铁」这一材料的固定性质）。
 */
namespace PokemonSkills {
    actionParameters.define("irondefense", {
        /** 防御等级：原生 +2，本招的身份常数。 */
        gift: formula(F.const(2), "防御等级", {
            unit: " 级",
            description: "铁壳把防御抬高多少级；原生「大幅提高防御」的对位。"
        }),
        /** 铁壳时长：防御与等级决定铁像能撑多久。 */
        shell: seconds(
            F.base(200).plus(F.level().times(3)).plus(F.stat("defence").times(0.8)).clamp(160, 480).round(0),
            "铁壳时长", "铁壳在身上撑多久；等级与防御越高撑得越久。铁壳被撕掉或到期时，这段防护抬起的等级一起收回。"),
        /** 铁环半径：体型越宽铺得越开。 */
        clad: formula(
            F.base(0.9).plus(F.body("width").times(0.8)).clamp(0.8, 2.2).round(2),
            "铁环半径", {
                unit: " 格",
                description: "铁水从脚边铺开的半径，也是表现里那道铁环的半径；碰撞箱越宽铺得越开。"
            }),
        /** 铁屑数量：身体越沉溅得越多。 */
        filings: formula(
            F.base(28).plus(F.body("weight").div(10).times(0.6)).clamp(24, 96).round(0),
            "铁屑数量", {
                unit: " 片",
                description: "浇铸时溅起的铁屑数量；身体越沉越多，粒子按它发射。"
            }),
        /** 起手：速度决定浇铸多快。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.03)).clamp(5, 12).round(0),
            "起手", "铁水浇满全身需要多久；速度越快越早完成。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.2)).clamp(6, 11).round(0),
            "收招", "凝成铁像之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5)).clamp(80, 140).round(0),
            "冷却", "两次铁壁之间的等待；等级越高越短。PP 15 的代价。")
    });

    stages("irondefense", [
        { level: 30, values: { shell: 260, wait: 100 } },
        { level: 50, values: { shell: 320, wait: 88 } }
    ]);

    describe("irondefense", [
        { key: "description.0", values: ["gift","shell"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shell", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shell", "tier.1.wait"] }
    ]);
}
