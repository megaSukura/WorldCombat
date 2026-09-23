/** punishment：行为、参数与目标条件以本单元实现为准。 */
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
