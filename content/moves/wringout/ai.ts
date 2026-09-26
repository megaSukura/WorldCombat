/**
 * 绞紧 / wringout 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，与自己之间有一条没被墙挡住的直线，且在 `ai.maxChase` 之内；
 *   更远交给共享接近逻辑。隔墙时这一拧够不到，AI 跳过、交给别的招或先走位。
 * 这是一记「拧完整度」的特殊攻击：威力随**目标剩余生命比例**走高，所以 `ai.preferHealthy`（默认开）把血量更满的
 *   目标排在前面；目标已经残了就把评分压下去，让补刀招先上——残血目标也不值得再赌第二拧。特攻高的个体在同样局面下
 *   更该用它（伤害随特攻走），这由公式承担，不需要额外选项。
 * 对谁出手：单体；`twin`（双绞式）开启且目标还有大半条血时，一次进攻能反向补第二拧，适合打还拧不死的大目标，
 *   代价是更慢更费。
 * 放完之后：冷却中等，可以隔一会儿再拧；AI 用同一套判断继续寻找下一个还满着血的目标。
 */
namespace PokemonSkills {
    function wringoutWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(wringoutId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return wringoutWants(context, capability, target);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !wringoutWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const ratio = CompanionBehavior.ratio(target);
            let score = 17;
            if (CompanionBehavior.ai<boolean>(capability, "preferHealthy", true)) {
                score += Math.round(ratio * 30);
                // 已经残了的目标不值得再赌两拧，把机会让给补刀招。
                if (ratio < 0.33) score -= 16;
            }
            const config = capability.data.config;
            if (config && config.twin && ratio > 0.6) score += 10;
            return score;
        }
    });

    addPreferences(wringoutId, {}, [
        field(pathOf("twin"), "双绞式", "boolean", {
            help: "开启：第一拧之后隔几刻再反向拧一记，第二段按目标当时的血量重算、约再吃 0.9 倍；目标离开原施放范围或被墙隔开时第二拧落空。单段威力 ×0.89、起手 +2 刻、冷却 +5 刻。关闭：单绞式，一记拧完，单段更重、更快。"
        }),
        field(pathOf("ai.maxChase"), "绞紧距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标超过这个距离就先走近再出手。越大越会从远处伸手，也越容易在聚力时被走开。"
        }),
        field(pathOf("ai.preferHealthy"), "先绞完好的目标", "boolean", {
            help: "开启：按目标的剩余生命比例排序，血量越满越优先（这一拧对它最重），残血目标则降权让位给补刀；关闭：只按威胁本身选目标。"
        })
    ]);
}
