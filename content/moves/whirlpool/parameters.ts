/**
 * 潮旋 / whirlpool 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Water、特殊、威力 35、命中 85、PP 15、优先度 0、
 * flags protect/mirror/metronome、volatile partiallytrapped（4–5 回合，期间对手无法逃走）。
 *
 * 翻译：保留「把对手困在激烈的水流旋涡里、持续攻击」，翻成即时战斗里**一处锚在命中点的曳引水旋**：
 * 水箭命中先结算一次特殊伤害，随后在目标脚下立起涡心；此后每 2 刻把圈内的非友方朝涡心拉回一段、
 * 每 `interval` 灌水一次；卷入者被水流拖慢。它不是定身——目标能动、能打，但会不断被拽回涡心；
 * 被外力拽出 `escape` 格，或水流走完 `duration`，水旋散开。
 * 与同族分开：
 *   潮旋   —— 锚在一点，把圈内的人往涡心**拽回**并灌水；靠位移而不是定身。
 *   龙卷风 —— 短促的爆发涡，把人往外卷、抬飞。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   drown       灌水威力 16 + 特攻偏移 + 等级偏移（特攻越高、等级越高灌得越重）。
 *   drag        回拉强度 0.62 + 特攻偏移，再按**目标体重**衰减（越重越难拽动）；
 *               这一拍的总预算一半用于切向绕行、一半用于向心收拢，靠原生击退抗性与碰撞真实生效。
 *   duration    水流持续 190 刻 + 特攻偏移 + 等级；滞水式 ×1.15。
 *   interval    灌水间隔 24 刻 − 速度偏移（出手快的水流更密）。
 *   escape      脱身距离 2.6 格 + 速度偏移 + **目标体型宽度**偏移（越宽越难整个罩住）。
 *   radius      涡面半径 1.15 格 + 目标宽度偏移；滞水式 ×1.3。
 *   slowStages  减速级数 1 + 特攻偏移（0..2）；驱动 navigate 减速与状态等级。
 *   speed       水箭速度 0.85 + 速度偏移。
 *   reach       射程 11 格 + 特攻偏移。
 *   charge      起手 8 刻 − 速度偏移。
 *
 * 配置 `mire`（滞水式）：开启＝涡面更宽、回拉更紧、持续更久、冷却 +8，但灌水威力 ×0.85，磨而不是打；
 * 关闭＝涡面小、回拉弱、持续短、冷却更短，灌水威力满值，打完就撤。两向各有适用局面。
 *
 * 伤害段 `drown` 与参数同名，走共享换算（原生类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("whirlpool", {
        /** 灌水威力：16 + 特攻偏移[−8,14] + 等级(≥20)偏移[0,10]；滞水 ×0.85；夹 12..52。 */
        drown: formula(
            F.base(16)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-8, 14))
                .plus(F.level().minus(20).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("mire"), F.const(0.85), F.const(1)))
                .clamp(12, 52).round(1),
            "灌水威力", {
                base: 16, unit: "威力",
                description: "水箭命中那一下的基础威力；之后每一趟灌水按同一段结算。对手防御、相性与暴击在命中时另算。"
            }),
        /** 回拉强度：0.62 + 特攻偏移[−0.10,0.30]，再 ÷(1 + 目标体重/180)；滞水 ×1.15；夹 0.20..0.85 格/拍。 */
        drag: formula(
            F.base(0.62)
                .plus(F.stat("specialAttack").minus(60).times(0.0022).clamp(-0.10, 0.30))
                .times(F.when(F.pref("mire"), F.const(1.15), F.const(1)))
                .div(F.const(1).plus(F.target("body.weight").as("目标体重").div(180)))
                .clamp(0.20, 0.85).round(3),
            "回拉强度", {
                base: 0.62, unit: "格/拍",
                description: "每一拍曳引目标的总距离，一半用于绕涡心打转、一半用于朝涡心收拢；目标越重惯性越大，被拽得越少，原生抗推也会真实抵消。"
            }),
        /** 水流持续：190 + 特攻偏移[−30,80] + 等级(≥30)偏移[0,30]；滞水 ×1.15；夹 120..300 刻。 */
        duration: seconds(
            F.base(190)
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-30, 80))
                .plus(F.level().minus(30).times(0.5).clamp(0, 30))
                .times(F.when(F.pref("mire"), F.const(1.15), F.const(1)))
                .clamp(120, 300).round(0),
            "水流持续", "水旋在原地存续多久；期间目标一直被朝涡心拉并持续灌水。"),
        /** 灌水间隔：24 − 速度偏移[−8,8]；夹 12..30 刻。 */
        interval: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.05).clamp(-8, 8)).clamp(12, 30).round(0),
            "灌水间隔", "每隔多久灌一次水；速度越快的个体水势越急。"),
        /** 脱身距离：2.6 + 速度偏移[−0.4,0.6] + 目标宽度偏移[−0.2,1.0]；夹 2.2..4.2 格。 */
        escape: formula(
            F.base(2.6)
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.4, 0.6))
                .plus(F.target("body.width").as("目标体型宽度").minus(0.9).times(0.6).clamp(-0.2, 1.0))
                .clamp(2.2, 4.2).round(2),
            "脱身距离", {
                base: 2.6, unit: "格",
                description: "被拽离涡心超过这个距离，水旋就绷断；被击退、冲刺或瞬移都有可能一步跨出去。"
            }),
        /** 涡面半径：1.15 + 目标宽度偏移[−0.1,0.8]；滞水 ×1.3；夹 0.9..2.4 格。 */
        radius: formula(
            F.base(1.15)
                .plus(F.target("body.width").as("目标体型宽度").minus(0.9).times(0.5).clamp(-0.1, 0.8))
                .times(F.when(F.pref("mire"), F.const(1.3), F.const(1)))
                .clamp(0.9, 2.4).round(2),
            "涡面半径", {
                base: 1.15, unit: "格",
                description: "涡心处的水面大小，也是画面里那道回旋水环的半径；目标越宽，水面铺得越开。"
            }),
        /** 减速级数：1 + 特攻偏移[0,2]；夹 1..3 级。 */
        slowStages: formula(
            F.base(1).plus(F.stat("specialAttack").minus(70).times(0.012).clamp(0, 2)).round(0).clamp(1, 3),
            "减速级数", {
                base: 1, unit: "级",
                description: "卷入者被水流拖慢的力度；同时驱动导航减速与状态等级。"
            }),
        /** 水箭速度：0.85 + 速度偏移[−0.25,0.5]；夹 0.55..1.4 格/刻。 */
        speed: formula(
            F.base(0.85).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.25, 0.5)).clamp(0.55, 1.4).round(2),
            "水箭速度", {
                base: 0.85, unit: "格/刻",
                description: "卷起的水箭飞向目标的速度；它一路追着目标走。"
            }),
        /** 射程：11 + 特攻偏移[−3,7]；夹 10..18 格。 */
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-3, 7)).clamp(10, 18).round(1),
            "射程", {
                base: 11, unit: "格",
                description: "能把水旋甩到多远的目标脚下。"
            }),
        /** 起手：8 − 速度偏移[−2,3]；夹 5..12 刻。 */
        charge: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(5, 12).round(0),
            "起手", "把水卷起来对准目标的时间；速度越快起手越短。")
    });

    defineDamage("whirlpool", "drown", {}, {});

    stages("whirlpool", [
        { level: 30, values: { drown: 26, duration: 220, drag: 0.72 } }
    ]);

    describe("whirlpool", [
        { key: "description.0", values: ["drown"] },
        { key: "description.1", values: ["duration","drag","interval"] },
        { key: "description.2", values: ["escape","slowStages","reach","speed"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["mire"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["mire"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.drown", "tier.0.duration"] }
    ]);
}
