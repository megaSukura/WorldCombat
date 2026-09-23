/**
 * 怨恨 / spite —— 参数与机制数值来源。
 *
 * 核心念头：怨恨是慢的记性——它读目标最近一次真正放出的那一手，等自己缠上目标时从那招里抠走 4 点 PP，
 * 并让一份怀恨留在目标身上拖慢它。已出过手的目标当场被抽；还没出过手的目标，这一手抽空，但怀恨照挂。
 *
 * 原生事实：Ghost／变化／威力 0／命中 100／PP 10／单体；`onHit` 取 `target.lastMove`，`deductPP(move.id, 4)`，
 * 没有 lastMove 或扣不动就失败。即时化把「必中」换成一枚缓慢的自导怨念弹（命中 100 落成“转得够紧”），
 * 并把「目标最后使用的招式」限定在 memory 窗口内——记忆会淡，太久以前的出手不再值得怀恨。
 *
 * 每个参数依赖不同的精灵数据（分散到不同参数）：
 *   reach          射程：等级决定怨念能送多远。
 *   boltSpeed      弹速：速度决定怨念飞得快不快。
 *   wispTurn       追踪转向：特攻决定怨念黏不黏人。
 *   collisionRadius 判定半径：碰撞箱高度决定怨念团的大小。
 *   ppCut          削减 PP：固定 4 点，与原生一致；这是本招的身份常量，不随个体变。
 *   memory         记忆窗口：等级决定怨恨能记住多久以前的出手。
 *   grudgeTicks    怀恨时长：特防支撑怀恨的稳定，等级延长它。
 *   shards         怨念碎片：特攻决定表现里迸出的碎片数量。
 *   charge/afterglow/recharge 起手／收势／冷却：速度越快，凝聚与恢复越快。
 */
namespace PokemonSkills {
    actionParameters.define("spite", {
        reach: formula(
            F.base(12).plus(F.level().minus(30).times(0.12)).clamp(10, 17).round(1),
            "施放距离", {
                unit: "格",
                description: "能把怨念送到多远；等级越高够得越远。它也是本招的实际射程来源。"
            }),
        boltSpeed: formula(
            F.base(0.85).plus(F.stat("speed").minus(40).times(0.003).clamp(-0.2, 0.5)).clamp(0.5, 1.6).round(2),
            "怨念速度", {
                unit: "格/刻",
                description: "怨念弹脱手时的飞行速度；速度快的个体追得更急。"
            }),
        wispTurn: formula(
            F.base(9).plus(F.stat("specialAttack").minus(60).times(0.1).clamp(-3, 10)).clamp(6, 26).round(1),
            "追踪转向", {
                unit: "度/刻",
                description: "怨念每刻最多朝目标转多少度；特攻越高越难甩开。"
            }),
        collisionRadius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.2, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "怨念团飞行与命中的判定半径；体型越高团越大。"
            }),
        ppCut: formula(
            F.base(4),
            "削减 PP", {
                unit: "点",
                description: "命中时从目标最后使用的那一招扣掉的 PP；原生固定 4 点，是本招的记恨份量。"
            }),
        memory: seconds(
            F.base(120).plus(F.level().minus(30).times(1.6).clamp(0, 96)).clamp(100, 240).round(0),
            "记忆窗口", "怨恨能记住多久以前的那次出手；超过这个窗口的招式不再被记恨，但怀恨仍会挂上。"),
        grudgeTicks: seconds(
            F.base(220)
                .plus(F.level().minus(30).times(3))
                .plus(F.stat("specialDefence").minus(50).times(1.2).clamp(-40, 90))
                .clamp(180, 460).round(0),
            "怀恨时长", "怀恨在目标身上停留多久；特防越高越稳，等级越高越久。"),
        shards: formula(
            F.base(8).plus(F.stat("specialAttack").div(45)).clamp(8, 22).round(0),
            "怨念碎片", {
                unit: "片",
                description: "命中时画面里迸出的怨念碎片数量；特攻越高越密。"
            }),
        charge: seconds(
            F.base(9).minus(F.stat("speed").minus(40).times(0.03).clamp(-2, 5)).clamp(5, 13).round(0),
            "起手", "凝聚怨念的时间；速度越快抬得越快。"),
        afterglow: seconds(
            F.base(8).plus(F.level().minus(30).times(0.15).clamp(0, 5)).clamp(7, 14).round(0),
            "收势", "放完怨念回收手的余势。"),
        recharge: seconds(
            F.base(48).minus(F.stat("speed").times(0.22)).clamp(26, 90).round(0),
            "冷却", "重新积起足以记恨的怨念需要多久；速度快的个体更快恢复。")
    });

    stages("spite", [
        { level: 40, values: { memory: 150, grudgeTicks: 260 } },
        { level: 50, values: { memory: 190, reach: 15 } }
    ]);

    describe("spite", [
        { key: "description.0", values: ["reach","boltSpeed","collisionRadius"] },
        { key: "description.1", values: ["ppCut","memory"] },
        { key: "description.2", values: ["grudgeTicks","wispTurn"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.memory", "tier.0.grudgeTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.memory", "tier.1.reach"] }
    ]);
}
