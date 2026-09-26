/**
 * 随机光 / ficklebeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着、在 `ai.maxChase` 之内。没有自损，所以门槛低——这是伙伴在中远距离
 * 稳定消耗的默认手段，随时可以放，不挑局面。
 * 对谁出手：挑最近的目标（这一招够快够便宜，不必专等残血），最近里有残血的优先；宽身架目标与
 *   沿准线排开的目标略加分——它们更能吃到齐射时数股并行的覆盖。
 * 怎么够到：共享接近把身位收进光柱长度以内，再沿目标方向射出。
 * 放完之后：交回共享交战计划，继续正常交战。
 * 随机结果不进决策：AI 不看几率、股数或是否齐射，只按目标本身选择。
 */
namespace PokemonSkills {
    function ficklebeamValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 从自己指向 target 的窄走廊里，够得到的可见敌人数量（不含自己正前方过近处）。 */
    function ficklebeamLineup(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const reach = typeof capability.data.range === "number" ? capability.data.range : 10;
        const half = 0.6;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return 1;
        const hx = dx / length, hz = dz / length;
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * hx + oz * hz;
            if (along <= 0.2 || along > reach) continue;
            if (Math.abs(ox * hz - oz * hx) <= half) count++;
        }
        return Math.max(1, count);
    }

    /** 宽身架目标更能同时跨过齐射的几条股线。 */
    function ficklebeamBroad(target: CompanionBehavior.Entity): number {
        const width = typeof target.width === "number" ? target.width : 0.9;
        return Math.min(6, Math.round(width * 4));
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
                const score = -range + (1 - CompanionBehavior.ratio(candidate)) * 6
                    + ficklebeamBroad(candidate) + Math.min(8, (ficklebeamLineup(context, capability, candidate) - 1) * 4);
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
            let score = CompanionBehavior.ratio(target) <= 0.3 ? 28 : 20;
            score += ficklebeamBroad(target);
            score += Math.min(8, (ficklebeamLineup(context, capability, target) - 1) * 4);
            return score;
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
