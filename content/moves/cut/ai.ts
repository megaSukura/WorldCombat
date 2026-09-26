/**
 * 居合斩 / cut 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 5）格以内；更远交给共享接近逻辑。
 * 它是一趟贴地的宽弧，所以「值不值得挥」取决于刀弧里挤着几个敌人：`ai.cluster`（默认开）用本个体实际的
 * 扫距与张角数一数目标方向扇内的非友方，达到两个以上时抬高优先级，把这一记当成一次清场；
 * 关掉后只把它当普通的单体平A排序。手动探索时可以对着草地直接挥刀，不受这里的锁敌要求影响。
 * 放完之后：弧内的敌人都挂了彩、草也被割走，交回共享顺序决定继续贴上去还是走位。
 */
namespace PokemonSkills {
    /** 以目标方向为中线，按本个体实际的扫距与张角数一数刀弧内还有几个非友方（含目标）。 */
    function cutCrowd(item: WorldBehavior.Capability, context: WorldBehavior.Context, self: CompanionBehavior.Entity,
                      target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const origin = CompanionBehavior.point(self.point), aimPoint = CompanionBehavior.point(target.point);
        const reach = typeof item.data.range === "number" ? item.data.range : 2.5;
        const arc = p(cutId, "arc", world);
        const region = WorldGeometry.sector(origin, aimPoint.minus(origin), reach, arc, { below: 1.0, above: 2.2 });
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (region.contains(CompanionBehavior.point(other.point))) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(cutId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const crowd = cutCrowd(capability, context, self, target);
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return crowd >= 2 ? 28 : 20;
            return crowd >= 2 ? 28 + Math.min(18, crowd * 6) : 20;
        }
    });

    addPreferences(cutId, {}, [
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.cluster", "围住才挥")
    ]);
}
