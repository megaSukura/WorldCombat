/**
 * 换场 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、进入 ai.maxChase 内，且以自身射程内扫得到至少一处**敌方**领域（世界里的
 *   `world_combat:field` 效果，来源不是自己一方）——没有值得接管的东西就不该空放这一记。
 * 什么时候最想出手：扫到敌方领域时 priority 100 越过共享交战次序；没有敌方领域时返回 0，不进入候选。
 * 对谁出手：不选对象——落点由 `target` 钩子定为最近的一处敌方领域中心，法阵铺在那里；`approachTarget` 保持自身。
 * 够不到怎么办：敌方领域在射程外就先不理会；法阵半径决定实际能圈住多大一片。
 * 放完之后：敌方领域过户给我、我方领域过户给最近的敌人，交回共享顺序继续战斗；领域只换主人，不改规则。
 * 配置：ai.maxChase 决定追多远，ai.leaveStation 决定驻守时是否离位；swift（速换／稳换）改变半径与冷却。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("courtchange", { ai: { maxChase: 12, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 26, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function courtchangeThreat(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity | null {
        if (context.facts.mounted) return null;
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat || threat.health <= 0 || !threat.visible) return null;
        return distance(source(context).point, threat.point) <= ai<number>(item, "maxChase", 14) ? threat : null;
    }
    /** 射程内最近的敌方领域中心与数量；同一决策帧内只扫一次。 */
    function courtchangeTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability): { point: number[]; count: number } | null {
        const cached = context.scratch.courtFieldScan;
        if (cached !== undefined) return cached;
        let result: { point: number[]; count: number } | null = null;
        if (courtchangeThreat(context, item)) {
            const world = CompanionBehavior.world(context), self = source(context);
            const fields = PokemonSkills.courtChangeScan(world, point(self.point), item.data.range);
            let best: number[] | null = null, bestDistance = Infinity, count = 0;
            for (let index = 0; index < fields.length; index++) {
                const entry = fields[index];
                if (entry.friendly) continue;
                count++;
                const d = distance(self.point, [entry.point.x(), entry.point.y(), entry.point.z()]);
                if (d >= bestDistance) continue;
                best = [entry.point.x(), entry.point.y(), entry.point.z()]; bestDistance = d;
            }
            if (best !== null) result = { point: best, count: count };
        }
        context.scratch.courtFieldScan = result;
        return result;
    }

    registerUse("courtchange", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, item, _purpose, _target) { return courtchangeTarget(context, item) !== null; },
        selectTarget: function (context) { return source(context); },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        target: function (context, item, _target) {
            const found = courtchangeTarget(context, item), self = source(context);
            if (found === null) return null;
            const copy: Entity = JSON.parse(JSON.stringify(self));
            copy.point = found.point.slice();
            return copy;
        },
        priority: function (context, item, _target) {
            const found = courtchangeTarget(context, item);
            return found === null ? 0 : 100;
        }
    });
}
