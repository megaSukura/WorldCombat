/**
 * 毒粉 / Poison Powder — 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带毒粉的伙伴在没有攻击可用时用它。对还没中毒、可见、敌对、
 *   还活着、在 ai.maxChase 以内、与施法者通视的目标撒粉；落点取目标当前位置。
 * 对谁出手：当前威胁。它最爱目标身边先站着一小撮人的时候——一次点上好几个。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒，会先靠近再撒。
 * 放完之后：圈里的人一起中毒、开始掉血，伙伴交回共享顺序继续交战。它的冷却最短，可以反复顺手点毒。
 * 优先级：目标附近 2.5 格内每多站一个非友方就 +7，最高 80；孤立目标给 40。
 *   草属性穿过粉末，毒属性与钢属性穿过中毒，这三种目标直接跳过。
 */
namespace PokemonSkills {
    /** 草属性穿过粉末，毒／钢属性穿过中毒：这三种目标都不值得为它撒粉。 */
    function poisonpowderImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && (facts.types.indexOf("grass") >= 0 || facts.types.indexOf("poison") >= 0 || facts.types.indexOf("steel") >= 0);
    }

    /** 目标身边 2.5 格内（含自己）站着几个非友方。 */
    function poisonpowderCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 2.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(poisonpowderId, {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.status(context, target, "poison")) return false;
            if (poisonpowderImmune(context, target)) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 7)) return false;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
            return poisonpowderCluster(context, target) >= CompanionBehavior.ai<number>(capability, "minFoes", 1);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || CompanionBehavior.status(context, target, "poison") || poisonpowderImmune(context, target)) return 0;
            return Math.min(80, 40 + poisonpowderCluster(context, target) * 7);
        }
    });

    addPreferences(poisonpowderId, {}, [
        field(pathOf("cling"), "黏附", "boolean", {
            help: "开启：落点半径 ×0.8、中毒 ×1.3，但冷却 ×1.1，用来把单个硬目标毒得久；关闭：撒得更开（半径 ×1.15）、冷却 ×0.9、中毒 ×0.8，用来一次点上挤在一起的一小群。"
        }),
        field(pathOf("ai.maxChase"), "撒粉距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动撒粉，先走近。越大越执着接近，粉也越容易落在够不到的地方。"
        }),
        field(pathOf("ai.minFoes"), "最少人数", "number", {
            min: 1, max: 4, step: 1,
            help: "目标身边 2.5 格内至少站着这么多非友方才撒；调 1 表示只要目标在就打。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为撒粉离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
