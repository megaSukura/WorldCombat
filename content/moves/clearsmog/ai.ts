/** clearsmog：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 只读、回调内缓存的目标正面等级合计。 */
    CompanionBehavior.registerFact("world_combat:move_clearsmog/stages", function (access, actor) {
        if (!access.valid(actor)) return 0;
        const stages = clearsmogStages(access, actor);
        let total = 0;
        for (let index = 0; index < clearsmogStats.length; index++) {
            const value = Number(stages[clearsmogStats[index]]) || 0;
            if (value > 0) total += value;
        }
        return total + MobEffects.levels(access, actor, "beneficial");
    });

    function clearsmogStageValue(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_clearsmog/stages", target);
        return typeof value === "number" ? value : 0;
    }

    function clearsmogWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
    }

    CompanionBehavior.registerUse(clearsmogId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return clearsmogWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !clearsmogWants(context, capability, target)) return 0;
            const stages = clearsmogStageValue(context, target);
            // 持续自强的目标身上有正向等级/增益时才抬到普通交战之上；已经攒完又没留下增益时，留给黑雾一类的整片重置更省。
            if (stages < CompanionBehavior.ai<number>(capability, "minStages", 2)) return 9;
            return Math.min(92, 34 + stages * 10);
        }
    });

    addPreferences(clearsmogId, {}, [
        field(pathOf("billow"), "漫烟式", "boolean", {
            help: "开启：烟团半径 ×1.5、黏烟时长 ×1.4，但威力 ×0.85、起手 +1 刻、冷却 +8 刻——罩得更广更久。关闭（聚泥式，默认）：威力 ×1.15、出手快、冷却短，但烟团小、黏烟短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动掷泥，先走近；越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.minStages"), "冲散门槛", "number", {
            min: 1, max: 6, step: 1,
            help: "对手正面等级合计达到这么多时，才把清除之烟抬到高于普通交战；调 1 见一丝增益就优先冲，调大只在对手攒大了才优先。"
        })
    ]);
}
