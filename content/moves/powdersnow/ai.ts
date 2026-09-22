/**
 * 细雪 / powdersnow 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 之内；这一招射程很短，够不到先走近。
 * 对谁出手：默认（ai.spread 开）优先挑身边挨着别人的目标——这一口扇面能一次吹到几个、多掷几次冰冻；
 *   关闭则只按射程与血量挑一个目标，当便宜的近身点伤用。
 * 放完之后：瞬发结算，伙伴交回共享顺序；因为冷却很短，它会被反复使用。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("powdersnow", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 12, 1),
        PokemonSkills.flag("ai.spread", "优先挨着的目标")
    ]);

    /** 目标身边（2.5 格内）还挤着几个其他敌人，就是这一口雪大概能一起吹到几个。 */
    function powdersnowNeighbours(context: WorldBehavior.Context, target: Entity): number {
        const nearby = (context.facts.nearby as Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(target.point, other.point) <= 2.5) count++;
        }
        return count;
    }

    registerUse("powdersnow", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || target.friendly || !target.visible) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            const inRange = distance(self.point, target.point) <= capability.data.range;
            let score = inRange ? 18 : 0;
            if (ai<boolean>(capability, "spread", true)) score += Math.min(16, powdersnowNeighbours(context, target) * 8);
            return score + Math.round(ratio(target) * 5);
        }
    });
}
