/**
 * 随机光 / ficklebeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着、在 `ai.maxChase` 之内。没有自损，所以门槛低——这是伙伴在中远距离
 * 稳定消耗的默认手段，随时可以放，不挑局面。
 * 对谁出手：挑最近的目标（这一招够快够便宜，不必专等残血），最近里有残血的优先。
 * 怎么够到：共享接近把身位收进光柱长度以内，再沿目标方向射出。
 * 放完之后：交回共享交战计划，继续正常交战。
 */
namespace PokemonSkills {
    function ficklebeamValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse(ficklebeamId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            const self = CompanionBehavior.source(context);
            const reach = CompanionBehavior.ai<number>(capability, "maxChase", 13);
            const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
            let best: CompanionBehavior.Entity | null = null, bestScore = -Infinity;
            const consider = function (candidate: CompanionBehavior.Entity): void {
                if (!ficklebeamValid(candidate)) return;
                const range = CompanionBehavior.distance(self.point, candidate.point);
                if (range > Math.max(reach, capability.data.range)) return;
                const score = -range + (1 - CompanionBehavior.ratio(candidate)) * 6;
                if (score > bestScore) { best = candidate; bestScore = score; }
            };
            consider(proposed);
            for (let i = 0; i < nearby.length; i++) consider(nearby[i]);
            return best || proposed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!ficklebeamValid(target)) return false;
            const self = CompanionBehavior.source(context);
            return CompanionBehavior.distance(self.point, target.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) { return ficklebeamValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            return CompanionBehavior.ratio(target) <= 0.3 ? 28 : 20;
        }
    });

    addPreferences(ficklebeamId, {}, [
        field(pathOf("unison"), "齐心式", "boolean", {
            help: "开启：齐射几率 +0.12，代价是基础威力 ×0.88、起手 +2 刻——赌那一发翻倍。关闭（随意式）：基础威力 ×1.12，几率按个体数据走，稳稳地打。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 4, max: 18, step: 1,
            help: "超过这个距离不主动发起随机光，先靠近。这一招没有自损，调大可以让伙伴更早开始消耗。"
        })
    ]);
}
