/**
 * 冲浪 / surf 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、整圈漫开的水漫。`ready` 要求身周 `ai.maxChase`（默认 8）格内
 *   至少有 `ai.minFoes`（默认 2）个可见、敌对、存活的目标——一次只淹一个不划算，它本来就是拿来罩一圈的。
 *   空中目标也算数：水是体积，离地的人一样被淹。
 * 对谁出手：候选就是当前威胁；`accepts` 只排除友方、已死、看不见的。
 * 够不到怎么办：交给共享接近逻辑；走进浪墙半径以内就原地掀浪。
 * 放完接什么：交回共享交战计划；被浇透的人带着湿身份，接下来的追击或脱离由共享顺序决定。
 * 排序：目标每多一个 +8（上限 +30）；自己湿透（雨里、水里）时再 +12——那正是水势最盛的时候。
 */
namespace PokemonSkills {
    function surfCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 8);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function surfWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    CompanionBehavior.registerUse("surf", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && surfCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return surfWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !surfWants(context, capability, target)) return 0;
            let base = 20;
            const count = surfCount(context, capability);
            if (count >= 3) base += Math.min(30, (count - 2) * 8);
            if (CompanionBehavior.source(context).wet) base += 12;
            return base;
        }
    });

    addPreferences("surf", {}, [
        field(pathOf("tide"), "涨潮式", "boolean", {
            help: "开启（涨潮式）：威力约 ×1.14、浪头更高 ×1.3、推开更远 ×1.25、浸湿更久，但浪墙收窄到 0.82 倍、起手 +3 刻、冷却 +10——打一两个重点目标的狠。关闭（平铺式）：浪墙 ×1.15 更广、更快，适合一次罩住一群。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑掀浪；调小只在贴身漫，调大愿意先追进去。"
        }),
        field(pathOf("ai.minFoes"), "掀浪人数", "number", {
            min: 1, max: 6, step: 1,
            help: "浪墙半径内至少这么多可见、存活的目标才掀浪；调大只被围住时用，调 1 见一个也掀。"
        })
    ]);
}
