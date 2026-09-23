/**
 * 写生 / sketch —— 参数与机制数值来源。
 *
 * 核心念头：写生是一次性的永久描摹——把对手刚用过的那一手当场描进写生自己占的招式格，
 * 描完写生就从招式表里消失（PP 只有 1）。
 *
 * 原生事实：Normal／变化／威力 0／必中／PP 1／noPPBoosts／noSketch／单体；`onHit` 取 `target.lastMove`，
 * 写进 `source.moveSlots` 里 Sketch 所在的那一格（连同 `baseMoveSlots`，是永久学会），
 * 已有该招或招式带 noSketch 标记（写生自己）时失败。即时化保留这两件事：占自己的格、永久写进原生招式表。
 *
 * 每个参数依赖不同的精灵数据（分散到不同参数）：
 *   reach      描摹距离：体型（碰撞箱高度）决定能靠近到多远看清那一手。
 *   study      描摹起手：速度决定落笔前观察得多快。
 *   afterglow  收笔：等级决定收势。
 *   recharge   冷却：等级与速度决定重新起笔（虽然只有一次机会）。
 *   strokes    笔触数：特攻决定表现里落笔的笔触数量。
 */
namespace PokemonSkills {
    actionParameters.define("sketch", {
        reach: formula(
            F.base(6).plus(F.body("height").minus(1.4).times(0.7)).clamp(5, 9).round(1),
            "描摹距离", {
                unit: "格",
                description: "能靠近到多远看清那一手；个头越高看得越远。它也是本招的实际射程来源。"
            }),
        study: seconds(
            F.base(12).minus(F.stat("speed").minus(40).times(0.06).clamp(-3, 7)).clamp(6, 18).round(0),
            "描摹起手", "落笔前观察目标那一手的时间；速度越快看得越利落。"),
        afterglow: seconds(
            F.base(8).plus(F.level().minus(30).times(0.15).clamp(0, 5)).clamp(7, 14).round(0),
            "收笔", "描完之后的收势。"),
        recharge: seconds(
            F.base(160).minus(F.level().times(1.2)).minus(F.stat("speed").times(0.4)).clamp(80, 300).round(0),
            "冷却", "重新起笔需要多久；写生只有一次机会，这个值只影响它重新装备后的节奏。"),
        strokes: formula(
            F.base(8).plus(F.stat("specialAttack").div(50)).clamp(8, 20).round(0),
            "笔触数", {
                unit: "笔",
                description: "落笔时画出的笔触数量；特攻越高越密。"
            })
    });

    describe("sketch", [
        { key: "world", values: [] },
        { key: "description.0", values: ["reach", "study"] },
        { key: "description.1", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
