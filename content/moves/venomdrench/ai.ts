/**
 * 毒液陷阱 / venomdrench 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、泼洒半径内至少站着 ai.minFoes 个
 *   **已经中毒**的非友方（默认 1）——毒液只黏中毒的人，没人中毒就白泼。移动中（骑乘）不泼。
 * 对谁出手：当前威胁；由共享任务把身体带进泼洒半径，毒性不看视线。
 * 放完之后：圈里中毒的对手攻／特攻／速度一起下降、挂上印记；交回共享顺序，再决定追击还是趁对方变钝拉开。
 * 倾向：圈里中毒的人越多越先泼。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("venomdrench", { ai: { maxChase: 8, minFoes: 1 } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "最少中毒人数", 1, 5, 1)
    ]);

    /** 与参数公式同源的泼洒半径估算；实际命中仍走招式自己的 spread。 */
    function venomdrenchSpread(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        const deep = !!(item.data.config && item.data.config.deep);
        return Math.max(2.0, Math.min(7.5, (3.0 + width * 1.2) * (deep ? 0.8 : 1.25)));
    }

    /** 以自身为心、泼洒半径内已经中毒的非友方数量。 */
    function venomdrenchPoisoned(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0) continue;
            if (distance(other.point, centre) > radius) continue;
            if (status(context, other, "poison")) count++;
        }
        return count;
    }

    function venomdrenchWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 8)) return false;
        return venomdrenchPoisoned(context, self.point, venomdrenchSpread(context, item)) >= ai<number>(item, "minFoes", 1);
    }

    CompanionBehavior.registerUse("venomdrench", {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return venomdrenchSpread(context, item); },
        available: function (context, item, _purpose, target) { return !target || venomdrenchWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !venomdrenchWants(context, item, target)) return 0;
            return Math.min(95, 60 + venomdrenchPoisoned(context, source(context).point, venomdrenchSpread(context, item)) * 8);
        }
    });
}
