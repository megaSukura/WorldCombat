/**
 * 千变万花 / flowertrick —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内；够不到交给共享接近逻辑。
 * 对谁出手：默认先看「一个值得点掉的重要目标」——必定命中与必定要害让它把可靠伤害压在残血或高价值单敌身上；
 *   `ai.cluster`（默认开）只在结环配置（`wreathe`）下才把挤在一起的敌人排前，因为只有结环会溅到一圈；
 *   贯心配置下不再因为旁边有人就虚抬价值，也不把铺花当成伤害场来经营。
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
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 10);
            // 只有结环配置会溅到一圈；贯心时不因为旁边有人就虚抬价值，也不经营铺花。
            const wreathe = !!(capability.data.config && capability.data.config.wreathe === true);
            if (wreathe && CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                const nearby = context.facts.nearby as CompanionBehavior.Entity[];
                for (let index = 0; index < nearby.length; index++) {
                    const other = nearby[index];
                    if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 4
                        && CompanionBehavior.distance(self.point, other.point) <= range) { score += 12; break; }
                }
            }
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
            help: "开启且当前为结环时：目标身边还挤着别的敌人就优先投花，结环能溅到一圈。贯心配置或关闭时：只按重点目标的收益排序，不因旁边有人而虚抬价值，也不把铺花当伤害场经营。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前（这一招必定命中，追击不落空）；关闭则只按普通远程攻击排序。"
        })
    ]);
}
