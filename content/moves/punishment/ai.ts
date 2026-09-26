/** punishment：行为、参数与目标条件以本单元实现为准。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.punishBoost`（默认开）按目标真实强化层数抬高优先级——能力等级加上药水／信标等正面状态层数
 *   （总数封顶），层数越多越优先；没有强化时本招只是一记普通近打，优先级很低，让位给其他基础招。
 *   `ai.finish` 收残血。
 * 出手位置：近身，由共享接近把身位收进射程；自由方向出手时不强求目标。
 * 放完之后：交回共享交战计划。
 */
namespace PokemonSkills {
    function punishmentValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 只读、回调内缓存的「目标正向能力等级总数」；由参数层的同一份阶梯读取。 */
    CompanionBehavior.registerFact("world_combat:move_punishment/boost", function (access, actor, _argument) {
        return access.valid(actor) ? punishmentBoosts(access, actor) : 0;
    });

    function punishmentBoostNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_punishment/boost", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(punishmentId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!punishmentValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) { return punishmentValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > capability.data.range) return 0;
            // 没有强化时只是一记普通近打，让位给其他基础招；有强化才显著抬分，且按封顶后的真实层数计。
            let score = 6;
            if (CompanionBehavior.ai<boolean>(capability, "punishBoost", true))
                score += Math.min(punishmentBoostCap, punishmentBoostNow(context, target)) * 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 10;
            return score;
        }
    });

    addPreferences(punishmentId, {}, [
        flag("heavy", "重判式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.punishBoost", "优先涨能力目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
