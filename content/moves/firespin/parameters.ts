/**
 * 火焰旋涡 / firespin 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Fire、特殊、威力 35、命中 85、PP 15、优先度 0、
 * flags protect/mirror/metronome、volatile partiallytrapped（4–5 回合，期间对手无法逃走）。
 *
 * 翻译：保留「把对手困在激烈的火焰旋涡里、持续攻击」，翻成即时战斗里**一道贴着目标走的回旋火柱**：
 * 火舌命中先结算一次特殊伤害，随后火柱绕着目标立起、跟着它移动，每 `interval` 舔一次（灼烧），
 * 并以 `burnChance` 点燃目标（共享主异常 burn，会持续掉血）。目标跑，火柱跟着走——除非把火扑灭：
 * 只要目标变得**湿透**（入水、雨里、被水招式打湿），火柱立刻熄灭。
 * 与同族分开：
 *   潮旋     —— 锚在一点把圈内的人拽回；火柱则贴着目标走。
 *   火焰旋涡 —— 把目标身上点着，靠持续灼烧与 burn 施加压力；水是它唯一的直接反制。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   scorch      灼烧威力 15 + 特攻偏移 + 等级偏移（特攻越高、等级越高烧得越重）。
 *   duration    火柱持续 175 刻 + 特攻偏移 + 等级；猛火式 ×0.8（烧得快也灭得快）。
 *   interval    舔火间隔 20 刻 − 速度偏移；猛火式 ×0.8。
 *   burnChance  点燃概率 0.22 + 特攻偏移；猛火式 ×1.25；夹 0.10..0.60。
 *   burnTicks   点燃时长 90 刻 + 等级偏移（等级越高灼烧越久）。
 *   radius      火柱半径 0.85 格 + **目标体型高度**偏移；猛火式 ×1.15。
 *   height      火柱高度 2.2 格 + 目标体型高度偏移（越高的目标火柱立得越高）。
 *   speed       火种速度 0.9 + 速度偏移。
 *   reach       射程 10 格 + 特攻偏移。
 *   charge      起手 8 刻 − 速度偏移。
 *
 * 配置 `blaze`（猛火式）：开启＝威力 ×1.1、间隔更短、点燃率更高、半径更大，但持续 ×0.8、冷却 +6，
 * 打得更凶也更快结束；关闭＝烧得久、更稳，适合磨。两向各有适用局面。
 *
 * 伤害段 `scorch` 与参数同名，走共享换算（原生类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("firespin", {
        /** 灼烧威力：15 + 特攻偏移[−8,14] + 等级(≥20)偏移[0,10]；猛火 ×1.1；夹 12..54。 */
        scorch: formula(
            F.base(15)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-8, 14))
                .plus(F.level().minus(20).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("blaze"), F.const(1.1), F.const(1)))
                .clamp(12, 54).round(1),
            "灼烧威力", {
                base: 15, unit: "威力",
                description: "火舌每舔一下的基础威力；对手防御、相性与暴击在命中时另算。"
            }),
        /** 火柱持续：175 + 特攻偏移[−30,80] + 等级(≥30)偏移[0,30]；猛火 ×0.8；夹 100..280 刻。 */
        duration: seconds(
            F.base(175)
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-30, 80))
                .plus(F.level().minus(30).times(0.5).clamp(0, 30))
                .times(F.when(F.pref("blaze"), F.const(0.8), F.const(1)))
                .clamp(100, 280).round(0),
            "火柱持续", "火柱跟着目标烧多久；期间每过一段就舔一下并尝试点燃。"),
        /** 舔火间隔：20 − 速度偏移[−8,8]；猛火 ×0.8；夹 10..28 刻。 */
        interval: seconds(
            F.base(20).minus(F.stat("speed").minus(60).times(0.05).clamp(-8, 8))
                .times(F.when(F.pref("blaze"), F.const(0.8), F.const(1)))
                .clamp(10, 28).round(0),
            "舔火间隔", "每隔多久舔一次；速度越快、猛火式下火舌越密。"),
        /** 点燃概率：0.22 + 特攻偏移[−0.08,0.24]；猛火 ×1.25；夹 0.10..0.60。 */
        burnChance: percent(
            F.base(0.22).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.08, 0.24))
                .times(F.when(F.pref("blaze"), F.const(1.25), F.const(1)))
                .clamp(0.10, 0.60).round(4),
            "点燃概率", "每舔一次把目标点着的概率；点着后按共享灼伤持续掉血。"),
        /** 点燃时长：90 + 等级(≥20)偏移[0,60]；夹 60..180 刻。 */
        burnTicks: seconds(
            F.base(90).plus(F.level().minus(20).times(1.0).clamp(0, 60)).clamp(60, 180).round(0),
            "点燃时长", "成功点燃后灼伤持续多久；等级越高烧得越久。"),
        /** 火柱半径：0.85 + 目标高度偏移[−0.1,0.7]；猛火 ×1.15；夹 0.7..1.8 格。 */
        radius: formula(
            F.base(0.85)
                .plus(F.target("body.height").as("目标体型高度").minus(1.4).times(0.4).clamp(-0.1, 0.7))
                .times(F.when(F.pref("blaze"), F.const(1.15), F.const(1)))
                .clamp(0.7, 1.8).round(2),
            "火柱半径", {
                base: 0.85, unit: "格",
                description: "火柱的横截面半径，也是画面里那圈火舌的半径；目标越高大，火柱铺得越开。"
            }),
        /** 火柱高度：2.2 + 目标高度偏移[−0.2,1.0]；夹 1.6..3.4 格。 */
        height: formula(
            F.base(2.2).plus(F.target("body.height").as("目标体型高度").minus(1.4).times(0.6).clamp(-0.2, 1.0)).clamp(1.6, 3.4).round(2),
            "火柱高度", {
                base: 2.2, unit: "格",
                description: "火柱沿竖直方向的高度；越高的目标，火焰沿它身体爬得越高。"
            }),
        /** 火种速度：0.9 + 速度偏移[−0.3,0.5]；夹 0.6..1.5 格/刻。 */
        speed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.3, 0.5)).clamp(0.6, 1.5).round(2),
            "火种速度", {
                base: 0.9, unit: "格/刻",
                description: "甩出的火种飞向目标的速度。"
            }),
        /** 射程：10 + 特攻偏移[−2,7]；夹 9..17 格。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-2, 7)).clamp(9, 17).round(1),
            "射程", {
                base: 10, unit: "格",
                description: "能把火种甩到多远的目标身上。"
            }),
        /** 起手：8 − 速度偏移[−2,3]；夹 5..12 刻。 */
        charge: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(5, 12).round(0),
            "起手", "把火卷起来、对准目标的时间；速度越快起手越短。")
    });

    defineDamage("firespin", "scorch", {}, {});

    stages("firespin", [
        { level: 30, values: { scorch: 24, duration: 200, burnChance: 0.32 } }
    ]);

    describe("firespin", [
        { key: "description.0", values: ["scorch"] },
        { key: "description.1", values: ["duration","interval","burnChance","burnTicks","scorch"] },
        { key: "description.2", values: ["reach","speed"] },
        { key: "description.douse", values: [] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["blaze"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["blaze"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.scorch", "tier.0.burnChance"] }
    ]);
}
