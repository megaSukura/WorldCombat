/**
 * 影子分身 / doubleteam 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中 必中、PP 15、目标 self／boosts={evasion:+1}。
 * 世界化：这不是一次「闪避率 +1」的抽象加成，而是用极快的身法留下一圈与本体同步的残影——
 * 来袭的攻击先打在残影上，残影替本体挨下这一击，挨得越多越淡，磨完就散。
 * 机制用共享 GuardEffects 的 pool 模式承接这份「替身预算」；同时给自己挂共享身份
 * world_combat:status/doubleteam 的真实 MobEffect（物品栏可见、移速小幅提升），宝可梦再抬一级闪避等级。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   copies        2 + 速度 × 0.01 + 等级 × 0.01，取整夹 1..5；身法越快、越熟练，留的残影越多。
 *   mirrorPool    0.35 + 速度 × 0.002，夹 18%..70%；残影合起来能替本体挨下多少（按最大生命比例）。
 *   mirrorWindow  160 刻 + 等级 × 3 + 速度 × 0.5，夹 100..420；残影能撑多久。
 *   tempo         12 - 速度 × 0.05 秒，夹 4..18；快速移动留下残影的时间。
 *   aftercast     6 - 速度 × 0.01 秒，夹 3..10；收势。
 *   recharge      140 - 速度 × 0.15 秒，夹 60..220；再次留影前的等待。
 *   motes         12 + 速度 × 0.1，夹 8..40；残影光点数量，也驱动粒子。
 * 配置 deploy 双向取舍：群影残影更多、预算更大、持续更久，代价是起手 +3 刻、冷却 ×1.2 且不加移速；
 * 疾影残影更少、预算更小，但起手 -2 刻、冷却 ×0.75，并额外给自己一段加速。
 */
namespace PokemonSkills {
    export const doubleteamId = "doubleteam";
    export const doubleteamEffect = "world_combat:doubleteam_mirror";
    export const doubleteamScene = "world_combat:move_doubleteam";
    export const doubleteamSpot = "world_combat:status/doubleteam";
    export const doubleteamRule = "world_combat:doubleteam";

    actionParameters.define(doubleteamId, {
        copies: formula(
            F.const(2).plus(F.stat("speed").times(0.01)).plus(F.level().times(0.01)).floor().clamp(1, 5),
            "分身数", { unit: " 个", description: "留下的残影数量；身法越快、等级越高越多。" }),
        mirrorPool: percent(
            F.const(0.35).plus(F.stat("speed").times(0.002)).clamp(0.18, 0.70),
            "残影总量", "残影合起来能替本体挨下的伤害，按最大生命比例；速度越快预算越大。"),
        mirrorWindow: seconds(
            F.const(160).plus(F.level().times(3)).plus(F.stat("speed").times(0.5)).clamp(100, 420),
            "残影时长", "残影能维持多久；等级与速度让它撑得更久。"),
        tempo: seconds(F.const(12).minus(F.stat("speed").times(0.05)).clamp(4, 18), "起手",
            "快速移动留下残影所需的时间；速度越快越短。"),
        aftercast: seconds(F.const(6).minus(F.stat("speed").times(0.01)).clamp(3, 10), "收招",
            "留影之后的收势。"),
        recharge: seconds(F.const(140).minus(F.stat("speed").times(0.15)).clamp(60, 220), "冷却",
            "两次留影之间的等待。"),
        motes: formula(F.const(12).plus(F.stat("speed").times(0.1)).clamp(8, 40).round(0), "残影光点数", {
            unit: " 个", description: "残影周围浮动光点的数量；速度越快越密。" })
    });
    describe(doubleteamId, [
        { key: "description.0", values: ["mirrorPool"] },
        { key: "description.1", values: ["mirrorWindow"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] }
    ]);
}
