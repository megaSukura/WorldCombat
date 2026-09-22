/**
 * 飞水手里剑 / watershuriken 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 13）格内。它是瞬发的远程特殊连发，
 *   愿意在中远距离先手；更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 选择偏好：中远距离（大于 6 格）时多一档分——这是它作为远程连发的价值；`ai.preferDry`（默认开）时已经湿透的目标排后；
 *   `ai.finish`（默认开）时残血目标多一档分收尾；贴到脸上（2 格内）让位给近战，分数压低。
 * 优先次序：基础 20；距离大于 6 格 +6；已带 soaked 的目标 −6；残血 +8；距离小于 2 格 −6。
 * 够不到怎么办：射程由 `reach` 决定，共享任务先把身位收进甩程再甩。
 * 放完之后：目标被反复浇透；交回共享交战计划继续打，聚式少而重、散式多而密。
 */
namespace PokemonSkills {
    function watershurikenWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    CompanionBehavior.registerUse(watershurikenId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return watershurikenWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !watershurikenWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 20;
            if (distance <= capability.data.range) score += 4;
            if (distance > 6) score += 6;
            if (distance < 2) score -= 6;
            if (CompanionBehavior.ai<boolean>(capability, "preferDry", true) && CompanionBehavior.status(context, target, "soaked")) score -= 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences(watershurikenId, {}, [
        field(pathOf("focused"), "聚式", "boolean", {
            help: "开启：甩出的水星 −1 枚（最少 2）、每枚 ×1.3、散布 ×0.6、更准更重，但连发间隔 +1 刻、收招 +2、冷却 +6 刻。关闭（散式）：多甩一枚（最多 5 枚）、每枚 ×0.85、散布更开、回得更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "对手离自己这么远以内才主动甩水星；本招射程很远，设大愿意从更外面先手。"
        }),
        field(pathOf("ai.preferDry"), "先打干的", "boolean", {
            help: "开启：已经带着 soaked 的目标排后，先换一个干的打；关闭：当普通先制候选排序。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先用这一轮收尾；关闭：只按普通先制候选排序。"
        })
    ]);
}
