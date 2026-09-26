/**
 * 暴风雪 / blizzard 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 之内；风雪会落在目标所在处，够不到先走近。
 * 对谁出手：默认（ai.cluster 开）优先挑周围挤着同伴的目标——这一片风雪会一次盖住他们；关闭则按射程与
 *   目标血量排序，把它当成一个覆盖广但很贵的单体打击。若目标附近有己方火属性伙伴（会把冰冻解掉），
 *   风雪的控场收益打折，优先级相应下调。
 * 放完之后：风雪会驻留扑打数阵，伙伴交回共享顺序继续交战（这一招很贵，交回后通常轮到更便宜的招）。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("blizzard", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 20, 1),
        PokemonSkills.flag("ai.cluster", "优先扎堆目标"),
        PokemonSkills.number("ai.clusterRadius", "扎堆半径", 2, 8, 0.5)
    ]);

    /** 目标周围（扎堆半径内）还有几个其他敌人，就是这一片风雪大概能一起盖住几个。 */
    function blizzardCluster(context: WorldBehavior.Context, target: Entity, radius: number): number {
        const nearby = (context.facts.nearby as Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(target.point, other.point) <= radius) count++;
        }
        return count;
    }

    /** 目标附近有没有己方火属性伙伴：他们会把这里的冰冻解掉，风雪的控场收益随之打折。 */
    function blizzardFireAlly(context: WorldBehavior.Context, target: Entity): boolean {
        const nearby = (context.facts.nearby as Entity[]) || [];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (distance(target.point, other.point) > 6) continue;
            const facts = pokemonFacts(context, other);
            if (facts && facts.types.indexOf("fire") >= 0) return true;
        }
        return false;
    }

    registerUse("blizzard", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || target.friendly || !target.visible) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            const inRange = distance(self.point, target.point) <= capability.data.range;
            let score = inRange ? 20 : 0;
            if (ai<boolean>(capability, "cluster", true))
                score += Math.min(30, blizzardCluster(context, target, ai<number>(capability, "clusterRadius", 4)) * 12);
            if (blizzardFireAlly(context, target)) score -= 6;
            return score + Math.round(ratio(target) * 6);
        }
    });
}
