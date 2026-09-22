/**
 * 绞紧 / wringout 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一记「拧完整度」的特殊攻击：威力随**目标剩余生命比例**走，所以 `ai.preferHealthy`（默认开）把血量更满的
 *   目标排在前面；特攻高的个体在同样局面下更该用它（伤害随特攻走），这由公式承担，不需要额外选项。
 * 对谁出手：单体；`twin`（双绞式）开启时一次进攻能补第二拧，适合打还拧不死的大目标，代价是更慢更费。
 * 放完之后：冷却中等，可以隔一会儿再拧；AI 用同一套判断继续寻找下一个还满着血的目标。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(wringoutId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 17;
            if (CompanionBehavior.ai<boolean>(capability, "preferHealthy", true))
                score += Math.round(CompanionBehavior.ratio(target) * 30);
            const config = capability.data.config;
            if (config && config.twin && CompanionBehavior.ratio(target) > 0.6) score += 10;
            return score;
        }
    });

    addPreferences(wringoutId, {}, [
        field(pathOf("twin"), "双绞式", "boolean", {
            help: "开启：第一拧之后隔几刻再拧一记，第二段按目标当时的血量重算、约再吃 0.9 倍，总伤更高但每一下可能更轻；代价是单段威力 ×0.89、起手 +2 刻、冷却 +5 刻。关闭：单绞式，一记拧完，单段更重、更快。"
        }),
        field(pathOf("ai.maxChase"), "绞紧距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标超过这个距离就先走近再出手。越大越会从远处伸手，也越容易在聚力时被走开。"
        }),
        field(pathOf("ai.preferHealthy"), "先绞完好的目标", "boolean", {
            help: "开启：按目标的剩余生命比例排序，血量越满越优先（这一拧对它最重）；关闭：只按威胁本身选目标，会先去拧残血。"
        })
    ]);
}
