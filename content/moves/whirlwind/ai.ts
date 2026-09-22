/**
 * 吹飞 / whirlwind —— 伙伴 AI 用途。
 *
 * 什么局面下出手：一道向前推进的风墙，所以要看「站在哪条线上最值」。`ready` 要求 `ai.maxChase`（默认 12）
 *   格内至少站着 `ai.minFoes`（默认 1）个可见、敌对的敌人。
 * 对谁出手：`selectTarget` 在候选里挑「身后串着最多敌人的那一个」当瞄准点——以施法者为起点、目标方向为轴，
 *   数一数还有几个敌人落在 `ai.laneWidth`（默认 2 格）半宽的走廊里；串得越多越优先。玩家用「关注」点名的
 *   焦点目标直接 honored，不被这条启发式改掉。
 * 什么时候最想出手：走廊里串的人越多 priority 越高；自己血量偏低时再加一段（把扑上来的一排人一次吹走）。
 * 够不到怎么办：reach 就是风道长度，共享任务先把身位收进 `ai.maxChase` 再出手。
 * 放完之后：被扫到的敌人失去目标、沿风向被逐出交战圈，伙伴交回共享顺序。
 * `ai.leaveStation`：驻守中的伙伴是否愿意离位去吹（默认关闭）。
 */
namespace CompanionBehavior {
    function whirlwindLane(context: WorldBehavior.Context, item: WorldBehavior.Capability, subject: Entity): number {
        const self = source(context), limit = ai<number>(item, "maxChase", 12), lane = ai<number>(item, "laneWidth", 2);
        const dx = subject.point[0] - self.point[0], dz = subject.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1;
        let count = 1;
        (context.facts.nearby as Entity[]).forEach(function (other) {
            if (other.ref === subject.ref || other.friendly || other.health <= 0 || !other.visible) return;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = (ox * dx + oz * dz) / length;
            if (along <= 0 || along > limit) return;
            if (Math.abs((ox * dz - oz * dx) / length) <= lane) count++;
        });
        return count;
    }

    function whirlwindCandidates(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity[] {
        const self = source(context), limit = ai<number>(item, "maxChase", 12);
        return (context.facts.nearby as Entity[]).filter(function (other) {
            return !other.friendly && other.health > 0 && other.visible && distance(self.point, other.point) <= limit;
        });
    }

    registerUse("whirlwind", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        ready: function (context, item) {
            return item.data.ready !== false && whirlwindCandidates(context, item).length >= ai<number>(item, "minFoes", 1);
        },
        selectTarget: function (context, item, proposed) {
            if (proposed && proposed.ref === context.facts.focus) return proposed;
            const candidates = whirlwindCandidates(context, item);
            if (!candidates.length) return proposed || null;
            let best = candidates[0], bestScore = whirlwindLane(context, item, candidates[0]);
            for (let i = 1; i < candidates.length; i++) {
                const score = whirlwindLane(context, item, candidates[i]);
                if (score > bestScore) { bestScore = score; best = candidates[i]; }
            }
            return best;
        },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 12);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            return !status(context, target, "routed");
        },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target) return 0;
            let base = 38 + Math.min(18, whirlwindLane(context, item, target) * 6);
            if (ratio(source(context)) < 0.5) base += 6;
            return Math.min(86, base);
        }
    });

    PokemonSkills.addPreferences("whirlwind", { ai: { maxChase: 12, minFoes: 1, laneWidth: 2, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "吹飞距离", 3, 20, 1),
        PokemonSkills.number("ai.minFoes", "附近最少人数", 1, 6, 1),
        PokemonSkills.number("ai.laneWidth", "走廊半宽", 1, 4, 0.5),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
