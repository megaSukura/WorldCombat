/** 站定敌人承受完整虫份，快速运动敌人能逐簇甩落；保持基础伤害用途。 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("infestation", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            return !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const close = CompanionBehavior.distance(self.point, target.point) <= capability.data.range;
            if (!close) return 0;
            const scope = CompanionBehavior.world(context), actor = scope.actor(target.ref), body = actor === null ? null : scope.observe(actor);
            const motionCost = body === null ? 0 : Math.min(25, body.velocity().length() * 60);
            return Math.round(CompanionBehavior.ratio(target) * 40 - motionCost) + (context.facts.focus === target.ref ? 24 : 0);
        }
    });

    addPreferences("infestation", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 24, step: 1,
            help: "对手离自己这么远以内才考虑死缠烂打；调小只在近身甩虫，调大愿意从更远处先手缠上。"
        }),
        field(pathOf("ai.leaveStation"), "离桩追击", "boolean", {
            help: "开启：看到值得缠的目标会离开点位追上去先手放；关闭：只在射程内出手，优先守在原位。"
        })
    ]);
}
