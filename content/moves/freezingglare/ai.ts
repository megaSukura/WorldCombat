/**
 * 冰冷视线 / freezingglare 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 之内；这一招需要通视，够不到先走近。
 * 对谁出手：默认（ai.preferChains 开）优先挑身边挨着别人的目标，好让念力线跳过去；关闭则只看单个目标。
 *   免冻的冰属性/特性目标照常吃精神主伤，不再专门优先去冻它们。
 * 放完之后：瞬发结算，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("freezingglare", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 22, 1),
        PokemonSkills.flag("ai.preferChains", "优先可连跳目标")
    ]);

    /** 目标身边（4 格内）还有几个其他敌人，就是念力线大概能连跳几个。 */
    function freezingglareNeighbours(context: WorldBehavior.Context, target: Entity): number {
        const nearby = (context.facts.nearby as Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(target.point, other.point) <= 4) count++;
        }
        return count;
    }

    registerUse("freezingglare", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || target.friendly || !target.visible) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 15);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            const inRange = distance(self.point, target.point) <= capability.data.range;
            let score = inRange ? 22 : 0;
            if (ai<boolean>(capability, "preferChains", true)) score += Math.min(16, freezingglareNeighbours(context, target) * 8);
            return score + Math.round(ratio(target) * 5);
        }
    });
}
