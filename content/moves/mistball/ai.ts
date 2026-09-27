/**
 * 薄雾球 / mistball 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标敌对、存活，在 `ai.maxChase`（默认 11）格内。它必须有一条真实的抛路：
 *   用本招真实的初速与重力解出可达的低/高弧，再逐段用 `WorldGeometry.blockHit` 验墙（`clipBlocks`
 *   畅通也返回 MISS），并要求整段弧在球的判定半径内净空。因此它优先选择能压低障碍的抛法，
 *   而不是把高弧当穿墙；直线被挡住但真有畅通高弧时才用弧线，两种都不可达就不出手。
 * 对谁出手：当前威胁；正在攻击自己或主人的目标优先。身上已有羽绒减速的目标控收益降低（不再完全拒用），
 *   剩余主伤仍有价值；目标残血时当斩杀手段再抬一档。
 * 够不到怎么办：`reach` 就是射程，共享任务先把身位收进射程；它是一条慢弧线，所以要留出提前量。
 * 放完之后：目标掉一段血、多半被糊住减速，伙伴交回共享顺序。
 */
namespace PokemonSkills {
    function mistballValues(context: WorldBehavior.Context, item: WorldBehavior.Capability): FactContext {
        const world = CompanionBehavior.world(context);
        return { world: world, actor: world.source(), skill: skills[mistballId], detail: { values: item.data.config } };
    }

    function mistballWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    /** 用本招真实公式解一条落点在本招射程内、净空容得下球的低/高弧；直线通视优先，否则要弧线畅通。 */
    function mistballPath(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): "direct" | "arc" | "none" {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const origin = CompanionBehavior.point(self.point), goal = CompanionBehavior.point(target.point);
        const delta = goal.minus(origin), distance = delta.length();
        if (!(distance > 0.05)) return "none";
        const values = mistballValues(context, item);
        const speed = Math.max(0.35, p(mistballId, "lob", values));
        const gravity = Math.max(0.01, p(mistballId, "fall", values));
        const radius = Math.max(0.15, p(mistballId, "collisionRadius", values));
        const reach = Math.max(1, item.data.range);
        const landing = origin.plus(delta.unit().scale(Math.min(distance, reach)));
        if (mistballArc(world, origin, landing, speed, gravity, radius) === null) return "none";
        return world.clear(origin, goal) ? "direct" : "arc";
    }

    CompanionBehavior.registerUse(mistballId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!mistballWants(context, capability, target)) return false;
            return mistballPath(context, capability, target) !== "none";
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0;
        },
        priority: function (context, capability, target) {
            if (!target || !mistballWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context), owner = context.facts.owner;
            let base = 24;
            if (target.attacking && (target.attacking === self.ref || !!owner && target.attacking === owner.ref)) base += 10;
            if (CompanionBehavior.status(context, target, "downcast")) base -= 8;
            const path = mistballPath(context, capability, target);
            if (path === "direct") base += 2;
            else if (path === "arc") base += 6;
            else base -= 12;
            if (CompanionBehavior.ratio(target) < 0.35) base += 6;
            return base;
        }
    });

    addPreferences(mistballId, { ai: { maxChase: 11 } }, [
        number("ai.maxChase", "考虑距离", 3, 18, 1)
    ]);
}
