/**
 * 手下留情 / holdback 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活、在 `ai.maxChase`（默认 7）格以内。它是一记不会打倒人的扇形横扫，
 * `ai.preferCrowd`（默认开）在身前扇面里挤着两个以上还能削血的敌人时加分——一次把一片都削到低血，是它最值的用法。
 * 扇面按本个体实际的扫距、总张角与扫击高度圈定，并沿真实刀路用 `world.clear` 排除被实墙挡住的目标；
 * 因此身后的敌人再多也不会被算进来，抬不动它的优先级。
 * 目标已到 1 HP 时不再抡扫：这一记最多把目标削到 1 HP，全部候选都是这样时伙伴直接停手。
 * 对谁出手：当前威胁；落单时也能用，但成群时优先级更高，焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑；它射程很短，伙伴会自己贴到扇面够得着的位置。
 * 放完之后：扇面里的目标都至少留下 1 HP；沉腰式伙伴会站定一瞬，随后交回共享顺序。
 */
namespace PokemonSkills {
    /** 以目标方向为中线，按本个体实际的扫距、总张角与扫击高度数一数真扇内还能削血的非友方（含目标、排墙外）。 */
    function holdbackFront(item: WorldBehavior.Capability, context: WorldBehavior.Context, self: CompanionBehavior.Entity,
                           target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const origin = CompanionBehavior.point(self.point), aimPoint = CompanionBehavior.point(target.point);
        const reach = typeof item.data.range === "number" ? item.data.range : 2.6;
        const angle = p("holdback", "angle", world);
        const depth = p("holdback", "depth", world);
        const region = WorldGeometry.sector(origin, aimPoint.minus(origin), reach, angle, { below: 0.8, above: depth });
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || other.friendly || other.health <= 1 || !other.visible) continue;
            const point = CompanionBehavior.point(other.point);
            if (!region.contains(point)) continue;
            if (!world.clear(origin, point)) continue;
            count++;
        }
        return count;
    }

    function holdbackWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 1 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse("holdback", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return holdbackWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 1 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !holdbackWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const crowd = holdbackFront(capability, context, self, target);
            let value = 18;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true) && crowd >= 2) value += 12 + Math.min(10, crowd * 3);
            if (context.facts.focus === target.ref) value += 10;
            return value;
        }
    });

    addPreferences("holdback", {}, [
        number("ai.maxChase", "考虑距离", 1, 14, 1),
        flag("ai.preferCrowd", "优先扎堆目标")
    ]);
}
