/**
 * 破灭之光 / lightofruin 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着、在 `ai.maxChase` 之内；从自己指向目标的这条走廊里至少能贯穿
 * `ai.minLine` 个敌人（默认 1，即单个目标也放）；因为反噬按打出的总伤害结算，自身生命还要高于 `ai.minHealth`
 * （或这一束能收掉残血）才出手——穿一排人虽然收益大，自己也可能被反噬打残，所以比随机光保守。
 * 对谁出手：挑「站得最成一条线」的那个——从自己到它拉出的走廊里敌人越多越优先，把贯穿的收益最大化。
 * 怎么够到：共享接近把身位收进射程以内，再沿目标方向射出光柱。
 * 放完之后：交回共享交战计划；反噬刚付过，通常会退开或转用便宜的招。
 */
namespace PokemonSkills {
    /** 从自己指向 target 的走廊里，够得到的可见敌人数量；用于贯穿判断与排序。 */
    function lightofruinLineup(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const reach = typeof capability.data.range === "number" ? capability.data.range : 11;
        const half = 0.95;
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

    function lightofruinValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse(lightofruinId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            const self = CompanionBehavior.source(context);
            const reach = CompanionBehavior.ai<number>(capability, "maxChase", 14);
            const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
            let best: CompanionBehavior.Entity | null = null, bestScore = -1;
            const consider = function (candidate: CompanionBehavior.Entity): void {
                if (!lightofruinValid(candidate)) return;
                if (CompanionBehavior.distance(self.point, candidate.point) > Math.max(reach, capability.data.range)) return;
                const score = lightofruinLineup(context, capability, candidate);
                if (score > bestScore) { best = candidate; bestScore = score; }
            };
            consider(proposed);
            for (let i = 0; i < nearby.length; i++) consider(nearby[i]);
            return best || proposed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!lightofruinValid(target)) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            if (lightofruinLineup(context, capability, target) < CompanionBehavior.ai<number>(capability, "minLine", 1)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.5);
            const ratio = CompanionBehavior.ratio(self);
            // 自己越虚越惜用：仅略高于门槛时要求贯穿更多人，才肯吃这笔按实伤走的总反噬。
            if (ratio < minHealth) return CompanionBehavior.ratio(target) <= 0.3;
            if (ratio < minHealth + 0.15 && lightofruinLineup(context, capability, target) < CompanionBehavior.ai<number>(capability, "minLine", 1) + 1) return false;
            return true;
        },
        accepts: function (context, capability, target) { return lightofruinValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const lineup = lightofruinLineup(context, capability, target);
            const base = lineup >= 3 ? 60 : lineup >= 2 ? 34 : 22;
            // 反噬按打出的总伤害走：自己越虚，越不愿拿一列人去赌这一发。
            const drain = Math.round((1 - CompanionBehavior.ratio(self)) * 30);
            const score = (CompanionBehavior.ratio(target) <= 0.3 ? base + 10 : base) - drain;
            return Math.max(1, score);
        }
    });

    addPreferences(lightofruinId, {}, [
        field(pathOf("overdraw"), "透支式", "boolean", {
            help: "开启：向永恒之花多借一档，威力 ×1.1、光柱更粗、贯穿更狠，代价是反噬 ×1.15、起手 +2 刻、冷却 +6 刻。关闭（节制式）：反噬 ×0.8，代价是威力 ×0.95——还得少，但每一下也轻。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离不主动发起破灭之光，先靠近。越大越早发起，也越容易白付一笔反噬。"
        }),
        field(pathOf("ai.minLine"), "最少贯穿数", "number", {
            min: 1, max: 4, step: 1,
            help: "走廊里至少能贯穿几个敌人才主动放出。调高更惜用、专等对手排队，调成 1 则对单个目标也放。"
        }),
        field(pathOf("ai.minHealth"), "反噬门槛", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动出手（除非对手已残）。反噬随打出的总伤害走，门槛越低越敢赌一发贯穿。"
        })
    ]);
}
