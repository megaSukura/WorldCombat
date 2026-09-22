/**
 * 千变万花 / flowertrick —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内；够不到交给共享接近逻辑。
 * 对谁出手：`ai.cluster`（默认开）打开时，目标附近还挤着别的敌人就抬高 priority——结环时花瓣能溅到一圈；
 *   `ai.finish`（默认开）打开时，残血目标排前，因为它必定命中、追击不落空。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 放完之后：落点花瓣交回共享交战计划，花瓣是租借地形会自己到期还原。
 */
namespace PokemonSkills {
    function flowertrickWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    CompanionBehavior.registerUse(flowertrickId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return flowertrickWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flowertrickWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const range = capability.data.range;
            let score = CompanionBehavior.distance(self.point, target.point) <= range ? 22 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                const nearby = context.facts.nearby as CompanionBehavior.Entity[];
                for (let index = 0; index < nearby.length; index++) {
                    const other = nearby[index];
                    if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 4
                        && CompanionBehavior.distance(self.point, other.point) <= range) { score += 12; break; }
                }
            }
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            return score;
        }
    });

    addPreferences(flowertrickId, {}, [
        field(pathOf("wreathe"), "结环", "boolean", {
            help: "开启（结环）：命中时花瓣向外结成一圈、溅到周围敌人（各按溅射系数）、落点花瓣更多，但绽开威力 ×0.85、花束更慢、冷却 +6 刻。关闭（贯心）：全部花瓣贯进一个目标，威力 ×1.14、更快更省。一个换「溅一圈」，一个换「贯一点」。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动投花，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.cluster"), "结环取材", "boolean", {
            help: "开启：目标身边还挤着别的敌人时优先投花，结环能溅到一圈；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前（这一招必定命中，追击不落空）；关闭则只按普通远程攻击排序。"
        })
    ]);
}
