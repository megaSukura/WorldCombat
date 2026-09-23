/**
 * 宇宙力量 / cosmicpower — 参数与数值来源。
 *
 * 原生事实：Psychic、变化、威力 —、命中必中、PP 20、目标 self、boosts { def: +1, spd: +1 }。
 *
 * 翻译：把「汲取宇宙中神秘的力量」翻成**站定，一道星光柱从头顶垂直落进身体**——防御与特防一起抬起来。
 *   取原生「防御 +1、特防 +1、PP 20、纯自我强化」；放弃回合制里永久保留的等级 → 即时交战里两项等级立刻写入
 *   公共能力阶梯，星辉是一段可见窗口，窗口走完或被清除时两项一起收回。它是本组里唯一**从天上取力**的一招：
 *   起手最长、最容易被中途打断，代价换来的是夜里星光更盛——同样的招，在夜里多抬 1 级。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   aegis    防御等级：基础 1，夜里（日光 < 0.25）多 1；夹 1..2。原生 +1 是基准，星光盛时更强。
 *   ward     特防等级：与 aegis 同一份世界条件，两项各成一个公式叶子。
 *   shaft    星柱高度：基础 4 格 + 碰撞箱高度×1.5；夹 3..7。身板越高，落下的光柱越长（表现里的柱长与判定无关，是这招的形）。
 *   dwell    星辉时长：基础 220 刻 + 等级×3 + 特防×0.5；夹 180..460。等级与特防越高，星辉撑得越久。
 *   halo     星尘量：基础 20 +（防御 + 特防）/12 + 等级×0.3；夹 20..80。两防与等级越高，一次落下的星尘越多，粒子按它发射。
 *   constellation 星座点数：基础 5 + 等级/10；夹 5..9。等级越高，脚边浮出的星座点越多。
 *   ring     星环半径：基础 1.0 格 + 碰撞箱宽度×0.9；夹 0.9..2.4。体型越宽，脚边星座铺得越开（判定与表现同径）。
 *   tempo    起手：基础 24 刻 − 速度×0.05；夹 16..30。本组最长的起手，速度越快越短，也最容易被中途打断。
 *   aftercast 收招：基础 8 刻 + 碰撞箱高度×1.2；夹 8..14。
 *   wait     冷却：基础 150 刻 − 等级×0.5；夹 110..185。PP 20、本组最长冷却的代价。
 * 无配置项：这招的取舍在**什么时候放**——夜里多 1 级、但起手长易被打断，交给玩家与 AI 的时机判断，没有需要玩家长期设定的方向。
 */
namespace PokemonSkills {
    actionParameters.define("cosmicpower", {
        /** 防御等级：夜里星光更盛。 */
        aegis: formula(
            F.base(1).plus(F.when(F.world("sunlight", text("worldcombat.value.sunlight")).lt(0.25), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "防御等级", {
                unit: " 级",
                description: "星辉把防御抬高多少级；夜里（日光低于四分之一）星光更盛，多抬 1 级。"
            }),
        /** 特防等级：与防御同一份世界条件。 */
        ward: formula(
            F.base(1).plus(F.when(F.world("sunlight", text("worldcombat.value.sunlight")).lt(0.25), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "特防等级", {
                unit: " 级",
                description: "星辉把特防抬高多少级；夜里星光更盛，多抬 1 级。"
            }),
        /** 星柱高度：身板越高光柱越长。 */
        shaft: formula(
            F.base(4).plus(F.body("height").times(1.5)).clamp(3, 7).round(2),
            "星柱高度", {
                unit: " 格",
                description: "从头顶落下的星光柱有多高；碰撞箱越高大，柱子越长。它只描述这招的形状，不参与判定。"
            }),
        /** 星辉时长：特防决定撑多久，等级由成长阶梯拉长。 */
        dwell: seconds(
            F.base(220).plus(F.stat("specialDefence").times(0.5)).clamp(180, 460).round(0),
            "星辉时长", "星辉在身上撑多久；特防越高越久，等级在同级台阶上再拉长。窗口走完或被清除时，两项等级一起收回。"),
        /** 星尘量：两防与等级越高越多。 */
        halo: formula(
            F.base(20).plus(F.stat("defence").plus(F.stat("specialDefence")).div(12)).plus(F.level().times(0.3)).clamp(20, 80).round(0),
            "星尘量", {
                unit: " 点",
                description: "一次落下的星尘数量；防御、特防与等级越高越多，粒子按它发射。"
            }),
        /** 星座点数：等级越高越多。 */
        constellation: formula(
            F.base(5).plus(F.level().div(10)).clamp(5, 9).round(0),
            "星座点数", {
                unit: " 点",
                description: "脚边浮起的星座光点数量；等级越高越多，表现里的星点按它铺开。"
            }),
        /** 星环半径：体型越宽铺得越开。 */
        ring: formula(
            F.base(1.0).plus(F.body("width").times(0.9)).clamp(0.9, 2.4).round(2),
            "星环半径", {
                unit: " 格",
                description: "脚边星座与表现里星环的半径；碰撞箱越宽铺得越开。"
            }),
        /** 起手：本组最长的起手。 */
        tempo: seconds(
            F.base(24).minus(F.stat("speed").times(0.05)).clamp(16, 30).round(0),
            "起手", "站定、等星光落下需要多久；速度越快越短。本组最长的起手，也最容易被中途打断。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(8).plus(F.body("height").times(1.2)).clamp(8, 14).round(0),
            "收招", "星辉落下之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级由成长阶梯缩短。 */
        wait: seconds(
            F.base(150).clamp(110, 185).round(0),
            "冷却", "两次汲取之间的等待；等级越高越短。PP 20、本组最长冷却的代价。")
    });

    stages("cosmicpower", [
        { level: 30, values: { dwell: 280, wait: 138 } },
        { level: 50, values: { dwell: 340, wait: 128 } }
    ]);

    describe("cosmicpower", [
        { key: "description.0", values: ["aegis", "ward"] },
        { key: "description.1", values: ["dwell"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.dwell", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.dwell", "tier.1.wait"] }
    ]);
}
