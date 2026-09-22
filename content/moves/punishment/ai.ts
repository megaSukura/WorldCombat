/**
 * 惩罚 / punishment 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 6）格内；臂程中等，够不到先让共享接近逻辑送进来。
 * 对谁出手：`ai.punishBoost`（默认开）在目标身上有正向能力等级时显著抬分——本招威力随目标的涨能力上升，
 *   越涨越值得罚；`ai.finish` 收残血。目标没有涨能力时它威力平平，只在没有更好的选择时用。
 * 出手位置：约 1.5 格内，踏进射程再砸。
 * 放完之后：交回共享交战计划；目标的能力没有变化，本招可以再罚。
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
            let score = 12;
            if (CompanionBehavior.ai<boolean>(capability, "punishBoost", true))
                score += Math.min(38, punishmentBoostNow(context, target) * 6);
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
