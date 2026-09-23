/**
 * 模仿 / mimic —— 参数与机制数值来源。
 *
 * 核心念头：模仿是当场把对手的上一手借进自己手里——牵出一条念线读走它，织进模仿自己占的那个招式格，
 * 直到这场战斗结束。它不改属性、不造成伤害，只把「你刚用过的那一手」变成「我现在也会」。
 *
 * 原生事实：Normal／变化／威力 0／必中／PP 10／单体；`onHit` 取 `target.lastMove`，把它写进
 * `source.moveSlots` 里 Mimic 所在的那一格（`virtual`，用那一手自己的 PP）。已有该招、招式带 failmimic
 * 标记（模仿、写生等）时失败。即时化保留「占用模仿自己的格」与「战斗内有效」：换格走共享的
 * NativeModifiers moves 层，随维持时长自动恢复，被收回或重载的个体不会留下脏招。
 *
 * 每个参数依赖不同的精灵数据（分散到不同参数）：
 *   reach      模仿距离：体型（碰撞箱高度）决定能隔着多远看清对手。
 *   watch      读取时长：速度快的个体一眼就学会。
 *   window     记忆窗口：特攻决定能记住多久以前的出手；细学时更长。
 *   hold       维持时长：等级与特防支撑换来的招式在自己身上稳定多久。
 *   strands    念线条数：特攻决定表现里牵出的念线数量。
 *   afterglow  收势：等级决定织完后的平复。
 *   recharge   冷却：速度决定重新起念的快慢；细学更慢。
 * 配置 deep（细学）：换取更长的记忆窗口与维持时长，代价是更慢的起手与更长的冷却。
 */
namespace PokemonSkills {
    actionParameters.define("mimic", {
        reach: formula(
            F.base(6).plus(F.body("height").minus(1.4).times(0.8)).clamp(5, 10).round(1),
            "模仿距离", {
                unit: "格",
                description: "念线能够到多远；个头越高看得越远。它也是本招的实际射程来源。"
            }),
        watch: seconds(
            F.base(8).times(F.const(80).div(F.stat("speed").max(1)).pow(0.5))
                .times(F.when(F.pref("deep"), F.const(1.6), F.const(1)))
                .clamp(3, 22).round(0),
            "读取时长", "念线搭上目标读走它上一手所需的时间；速度越快读得越快，细学要多花时间。"),
        window: seconds(
            F.base(120).plus(F.stat("specialAttack").minus(50).times(0.8).clamp(0, 120))
                .times(F.when(F.pref("deep"), F.const(1.6), F.const(1)))
                .clamp(100, 360).round(0),
            "记忆窗口", "能记住多久以前的出手；特攻越高、细学时记得越久，太老的招式读不到。"),
        hold: seconds(
            F.base(420).plus(F.level().minus(30).times(8)).plus(F.stat("specialDefence").minus(50).times(2).clamp(-40, 120))
                .times(F.when(F.pref("deep"), F.const(1.35), F.const(1)))
                .clamp(360, 1200).round(0),
            "维持时长", "借来的那只手在自己身上留多久；等级与特防越高越稳，细学留得更久。"),
        strands: formula(
            F.base(6).plus(F.stat("specialAttack").div(55)).clamp(6, 18).round(0),
            "念线条数", {
                unit: "条",
                description: "念线搭出去时画出的条数；特攻越高越密。"
            }),
        afterglow: seconds(
            F.base(7).plus(F.level().minus(30).times(0.12).clamp(0, 4)).clamp(5, 12).round(0),
            "收势", "织完招式后的平复时间。"),
        recharge: seconds(
            F.base(36).minus(F.stat("speed").times(0.14))
                .times(F.when(F.pref("deep"), F.const(1.4), F.const(1)))
                .clamp(22, 80).round(0),
            "冷却", "重新聚起一条念线需要多久；速度快的个体更快，细学更慢。")
    });

    stages("mimic", [
        { level: 40, values: { window: 180, hold: 560 } }
    ]);

    describe("mimic", [
        { key: "world", values: ["window", "hold"] },
        { key: "description.0", values: ["reach", "watch"] },
        { key: "description.1", values: ["window", "hold"] },
        { key: "description.2", values: ["pref.deep"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.hold"] }
    ]);
}
