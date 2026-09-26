/**
 * 极光束 / aurorabeam —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 17）格内；够不到交给共享接近逻辑。
 * 它射程长、冷却适中，是常规远程手段。
 * 对谁出手：`ai.disarm`（默认开）打开时，正在攻击自己或主人的目标排前——压掉它的攻击收益最大；
 *   `ai.finish`（默认开）打开时，残血目标排前。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 折射：AI 默认直射；冰面折射是玩家可用的几何选择，AI 不为反射随机寻路——没有已验证的一跳可达解时
 *   就朝目标直射，命中落点照常结霜。
 * 放完之后：降攻与落点的霜斑交回共享交战计划；霜本身是租借的地形，会自己到期还原。
 */
namespace PokemonSkills {
    function aurorabeamWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    CompanionBehavior.registerUse(aurorabeamId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return aurorabeamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !aurorabeamWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 20 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "disarm", true)) {
                const owner = context.facts.owner;
                if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) score += 14;
            }
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            return score;
        }
    });

    addPreferences(aurorabeamId, {}, [
        field(pathOf("spectrum"), "虹谱", "boolean", {
            help: "开启（广谱）：射程 ×1.12、判定更粗、霜斑更大更久、降攻更容易触发，但威力 ×0.94、光速 ×0.85、起手 +2 刻、冷却 +5 刻。关闭（聚谱）：更快更强更省的一束，代价是射程、霜斑与降攻都收窄。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 26, step: 1,
            help: "超过这个距离就不主动发射，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.disarm"), "先照正在出手的", "boolean", {
            help: "开启：正在攻击自己或主人的目标优先，把它的攻击压下去收益最大；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前；关闭则只按普通远程攻击排序。"
        })
    ]);
}
