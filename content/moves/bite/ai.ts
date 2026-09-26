/**
 * 咬住 / bite 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 9）格内。它冷却最短，是本组最便宜的起手；
 * `priority` 把「贴身、且对手还没被咬懵」的一口排在前面（用它开场并把目标拽回身前），
 * 对正在拉开距离的对手再加一档——那一口正好把人拽回来。
 *
 * `ai.reelIn`（默认开）实际改变选目标与排序：开启时只对「够得着的正常目标」和「正在逃开的目标」优先出手；
 * 关闭时把它当普通近身招，不再为拉人加分。
 */
namespace PokemonSkills {
    function biteWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("bite", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return biteWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !biteWants(context, capability, target)) return 0;
            var close = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range;
            var deep = !!(capability.data.config && capability.data.config.deep === true);
            if (CompanionBehavior.ai<boolean>(capability, "reelIn", true) && CompanionBehavior.fleeing(context, target)) return 46;
            // 死咬式要的是短距控制：贴身且目标还没中招时最值得咬。
            if (close && !CompanionBehavior.status(context, target, "flinch")) return deep ? 44 : 40;
            if (CompanionBehavior.status(context, target, "flinch")) return 16;
            return 24;
        }
    });

    addPreferences("bite", {}, [
        field(pathOf("deep"), "死咬式", "boolean", {
            help: "开启：咬得更深、把目标拽得更近、畏缩更久更易，但起手更慢、单发略轻、冷却更长，适合把人留在身前接着打。关闭：快咬，出手快、单发更高，但拽不回多少。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。越大追得越执着，也越容易扑空后停在对手身边。"
        }),
        field(pathOf("ai.reelIn"), "留人优先", "boolean", {
            help: "开启：对正在拉开距离或贴身未中招的对手优先咬住，把目标拽回身前；关闭：只把咬住当普通近身招排序，不再为拉人加分。"
        })
    ]);
}
