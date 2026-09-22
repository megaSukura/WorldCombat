/**
 * 破坏光线的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着且在光柱长度以内；光柱能一起打穿的活体数不少于 `ai.minLine`
 * （默认 1，即单个目标也放）。因为打完有一段较久的熄火，自身生命要高于 `ai.minHealth`（或这一束能收掉残血）才出手。
 * 对谁出手：在候选里挑「站得最成一条线」的那个——从自己到它拉出的走廊里敌人越多越优先（selectTarget）。
 * 怎么够到：共享接近把身位收到射程以内，然后沿目标方向射出光柱（`kind: "enemy"`）。
 * 出手前后：放完交回共享交战计划；熄火期间招式由共享起手门禁自动屏蔽。
 */
namespace PokemonSkills {
    /** 从自己指向 target 的走廊里，当前可见敌人的数量；用于「排队站」判断与排序。 */
    function hyperbeamLineup(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const reach = typeof capability.data.range === "number" ? capability.data.range : 11;
        const half = !!(capability.data.config && capability.data.config.focus) ? 0.7 : 1.5;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return 1;
        const hx = dx / length, hz = dz / length;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * hx + oz * hz;
            if (along <= 0.2 || along > reach) continue;
            const side = Math.abs(ox * hz - oz * hx);
            if (side <= half) count++;
        }
        return Math.max(1, count);
    }

    CompanionBehavior.registerUse("hyperbeam", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            if (proposed.friendly || !(proposed.health > 0) || !proposed.visible) return proposed;
            const self = CompanionBehavior.source(context);
            const reach = typeof capability.data.range === "number" ? capability.data.range : 11;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let best = proposed, bestScore = CompanionBehavior.distance(self.point, proposed.point) <= reach
                ? hyperbeamLineup(context, capability, proposed) : -1;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || !(other.health > 0) || !other.visible) continue;
                if (CompanionBehavior.distance(self.point, other.point) > reach) continue;
                const score = hyperbeamLineup(context, capability, other);
                if (score > bestScore) { best = other; bestScore = score; }
            }
            return best;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return false;
            const lineup = hyperbeamLineup(context, capability, target);
            if (lineup < CompanionBehavior.ai<number>(capability, "minLine", 1)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.35);
            return CompanionBehavior.ratio(self) >= minHealth || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const lineup = hyperbeamLineup(context, capability, target);
            const base = lineup >= 3 ? 66 : lineup >= 2 ? 34 : 24;
            return CompanionBehavior.ratio(target) <= 0.3 ? base + 12 : base;
        }
    });

    addPreferences("hyperbeam", {}, [
        field(pathOf("focus"), "聚焦", "boolean", {
            help: "开启：把光束收窄成一条更长的贯注——射程更远、单伤更高，但更容易漏掉并排的敌人，熄火也更久；关闭：光束更宽、更容易扫到站在一起的敌人，射程较短、单伤略低，熄火更短。"
        }),
        field(pathOf("ai.minLine"), "最少贯穿数", "number", {
            min: 1, max: 4, step: 1,
            help: "走廊里至少能贯穿几个敌人才主动放出。调高更惜用破坏光线、专等对手排队，调成 1 则对单个目标也放。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动放出（除非目标已残）。越高越怕留下熄火空挡。"
        })
    ]);
}
