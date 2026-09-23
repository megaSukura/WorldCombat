/**
 * 捕兽夹 / snaptrap 的参数与伤害段。
 *
 * 原生事实：Grass／物理／威力 35／命中 100／PP 15／单目标／contact／volatile partiallytrapped（4–5 回合）。
 *
 * 翻译：把「用捕兽夹夹住对手」落成一件**真的布在世界里的夹子**——施法者把合着的铁夹抛到选定的点上，
 * 夹子撑开等着；谁先踩进来就被一口咬住钉在原地，夹齿持续磨，直到撑满时长、被扯开或有人把它拆掉。
 * 施法者放完就走，这是它和贝壳夹击（自己也得被钉住）最大的区别。
 * 与同族分开：
 *   捕兽夹   —— 夹子布在地上，施法者自由离开，夹到谁是谁，草属的咬合。
 *   贝壳夹击 —— 施法者贴身咬住，双方一起被钉住，水属的厚度。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   bite        合上那口威力 26 + 物攻偏移 + 等级偏移（咬得实不实看爪子）。
 *   chew        夹齿每跳威力 12 + 物攻偏移 + 等级偏移（持续磨）。
 *   trigger     触发半径 1.1 格 + 宽度偏移（体型宽的人做得更大）。
 *   waitTicks   夹子待机 180 刻 + 等级偏移 + HP 偏移（等多久没人来就收）。
 *   armTicks    布下到能触发 10 刻 − 速度偏移（动作快的布得快）。
 *   holdTicks   咬住时长 110 刻 + 等级偏移。
 *   interval    两跳间隔 22 刻 − 速度偏移。
 *   escape      扯开距离 1.5 格 + 宽度偏移；被推出这个距离就滑脱。
 *   reach       抛夹距离 9 + 物攻偏移 + 速度偏移。
 *   throwSpeed  抛出速度 0.95 + 速度偏移。
 *   jaws        夹齿粒子量 10 + 物攻 ×0.1（同时驱动画面密度）。
 *   tempo       起手 12 刻 − 速度偏移。
 *
 * 配置 `wide`（广域式）：开启＝触发半径 ×1.45、咬合 ×0.8、待机 ×0.85，更容易踩到但更轻更短；
 * 关闭＝触发收紧到 0.85 倍、咬合满值、待机 ×1.15，埋得更久更狠。两向各有适用局面。
 *
 * 伤害段 `bite`（合上）与 `chew`（夹齿每跳）各自成段，走共享换算（原始类别 Physical）。
 */
namespace PokemonSkills {
    actionParameters.define("snaptrap", {
        /** 合上威力：26 + 物攻偏移[−8,30] + 等级(≥25)偏移[0,12]；广域 ×0.8；夹 16..82。 */
        bite: formula(
            F.base(26)
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-8, 30))
                .plus(F.level().minus(25).times(0.3).clamp(0, 12))
                .times(F.when(F.pref("wide"), F.const(0.8), F.const(1)))
                .clamp(16, 82).round(1),
            "合上威力", {
                base: 26, unit: "威力",
                description: "目标踩进来、夹齿合上那一下的基础威力；物攻与等级越高咬得越实。对手防御、相性与暴击在命中时另算。"
            }),
        /** 夹齿每跳威力：12 + 物攻偏移[−3,14] + 等级(≥25)偏移[0,6]；夹 8..36。 */
        chew: formula(
            F.base(12)
                .plus(F.stat("attack").minus(60).times(0.1).clamp(-3, 14))
                .plus(F.level().minus(25).times(0.15).clamp(0, 6))
                .clamp(8, 36).round(1),
            "夹齿每跳威力", {
                base: 12, unit: "威力",
                description: "咬住后夹齿每隔一次间隔磨一下的伤害；物攻与等级越高磨得越狠。"
            }),
        /** 触发半径：1.25 + 宽度偏移[−0.15,0.8]；广域 ×1.45 / 精准 ×0.85；夹 0.9..2.5。 */
        trigger: formula(
            F.base(1.25)
                .plus(F.body("width").minus(0.9).times(0.6).clamp(-0.15, 0.8))
                .times(F.when(F.pref("wide"), F.const(1.45), F.const(0.85)))
                .clamp(0.9, 2.5).round(2),
            "触发半径", {
                base: 1.1, unit: "格",
                description: "夹子能咬住多大范围内的目标；体型越宽、广域式越大，越容易咬到走过的人。"
            }),
        /** 待机时长：180 + 等级(≥25)偏移[0,40] + HP 偏移[−10,20]；广域 ×0.85 / 精准 ×1.15；夹 100..280。 */
        waitTicks: seconds(
            F.base(180)
                .plus(F.level().minus(25).times(1.2).clamp(0, 40))
                .plus(F.stat("hp").minus(60).times(0.2).clamp(-10, 20))
                .times(F.when(F.pref("wide"), F.const(0.85), F.const(1.15)))
                .clamp(100, 280).round(0),
            "待机时长", "夹子从布下到自行收起的时间；等这么久没人踩进来就收走。"),
        /** 布设延迟：10 − 速度偏移[−3,4]；夹 6..16。 */
        armTicks: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(6, 16).round(0),
            "布设延迟", "夹子落地后撑开到能触发的时间；速度快的个体布得更快，目标更难在触发前走开。"),
        /** 咬住时长：110 + 等级(≥30)偏移[0,20]；夹 70..170。 */
        holdTicks: seconds(
            F.base(110).plus(F.level().minus(30).times(0.6).clamp(0, 20)).clamp(70, 170).round(0),
            "咬住时长", "夹齿咬着目标不放的时长；等级越高咬得越久。"),
        /** 两跳间隔：22 − 速度偏移[−2,5]；夹 12..30。 */
        interval: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 5)).clamp(12, 30).round(0),
            "两跳间隔", "夹齿两次磨之间隔多久；速度快的个体磨得更密。"),
        /** 扯开距离：1.5 + 宽度偏移[−0.1,0.6]；夹 1.2..2.2。 */
        escape: formula(
            F.base(1.5).plus(F.body("width").minus(0.9).times(0.5).clamp(-0.1, 0.6)).clamp(1.2, 2.2).round(2),
            "扯开距离", {
                base: 1.5, unit: "格",
                description: "目标被带离夹子超过这个距离就从夹齿里滑脱；体型宽的人夹得稳一些。"
            }),
        /** 抛夹距离：9 + 物攻偏移[−1,2] + 速度偏移[−1,1.5]；夹 7..13。 */
        reach: formula(
            F.base(9)
                .plus(F.stat("attack").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-1, 1.5))
                .clamp(7, 13).round(2),
            "抛夹距离", {
                base: 9, unit: "格",
                description: "能把夹子抛到多远；物攻与速度越高扔得越远，也是本招的实际射程。"
            }),
        /** 抛出速度：0.95 + 速度偏移[−0.15,0.4]；夹 0.8..1.5。 */
        throwSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4)).clamp(0.8, 1.5).round(2),
            "抛出速度", {
                base: 0.95, unit: "格/刻",
                description: "夹子脱手飞向落点的速度；速度快的个体抛得更急。"
            }),
        /** 夹齿粒子量：10 + 物攻 ×0.1；夹 8..32。同时驱动画面密度。 */
        jaws: formula(
            F.base(10).plus(F.stat("attack").times(0.1)).clamp(8, 32).round(0),
            "夹齿数量", { visible: false,
                base: 10, unit: "个",
                description: "合上时迸出的夹齿碎屑量；随物攻增长，也决定画面里那一口的密度。"
            }),
        /** 起手：12 − 速度偏移[−1.5,2.0] + 广域 1；夹 7..16。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.0))
                .plus(F.when(F.pref("wide"), F.const(1), F.const(0)))
                .clamp(7, 16).round(0),
            "起手", "把夹子撑开再抛出的时间；速度越快起手越短。"),
        maxTargets: hidden(1)
    });

    defineDamage("snaptrap", "bite", {}, { contact: true });
    defineDamage("snaptrap", "chew", {}, { contact: true });

    stages("snaptrap", [
        { level: 44, values: { bite: 38, chew: 16, trigger: 1.3 } }
    ]);

    describe("snaptrap", [
        { key: "description.0", values: ["bite"] },
        { key: "description.1", values: ["trigger","waitTicks","armTicks"] },
        { key: "description.2", values: ["holdTicks","chew","interval"] },
        { key: "description.3", values: ["escape","reach","throwSpeed"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bite", "tier.0.chew", "tier.0.trigger"] }
    ]);
}
