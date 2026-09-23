/** 用水击进攻并打湿目标；清除敌方灼伤会损失持续伤害，因此默认降低这种出手的优先级。 */
namespace PokemonSkills {
    function jetpunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse(jetpunchId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return jetpunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !jetpunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 24;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "preserveBurn", true) && CompanionBehavior.status(context, target, "burn")) score -= 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferDry", true) && CompanionBehavior.status(context, target, "soaked")) score -= 8;
            if (target.attacking === self.ref) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences(jetpunchId, {}, [
        field(pathOf("hammer"), "水锤式", "boolean", {
            help: "开启：水柱在接触瞬间炸开，顶开 ×1.7、判定更宽，把目标推得更远；代价是威力 ×0.9、拳程 −0.4 格、浇透更短、冷却多 6 刻。关闭（直拳式）：更长、更重、湿得更久，但顶得近。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才主动出拳；本招拳程短，设大也常常要先走近。"
        }),
        field(pathOf("ai.preserveBurn"), "保留灼伤", "boolean", {
            help: "开启：对带有灼伤的敌人降低本招优先级，优先保留持续伤害；紧急顶退和残血补刀仍可出手。关闭：按普通进攻收益排序。"
        }),
        field(pathOf("ai.preferDry"), "先打干的", "boolean", {
            help: "开启：已经带着 soaked 的目标排后，先换一个干的打；关闭：当普通先制候选排序。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一拳；关闭：只按普通先制候选排序。"
        })
    ]);
}
