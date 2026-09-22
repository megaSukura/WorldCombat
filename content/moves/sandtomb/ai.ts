/**
 * 流沙地狱 / sandtomb 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 以内；自己不在坐骑上；身上还没有
 * `partiallytrapped`（已经陷着再放是浪费）。`ai.preferGrounded` 开启时只对贴地的目标出手——
 * 流沙吃不到腾空的对手，放出去也是白费；关闭时对任何目标都愿意尝试（腾空的目标会扑空）。
 * 对谁出手：越满血、越难缠的地面目标越值得先陷住；焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑把身位收到射程内。
 * 放完之后：交回共享交战计划；目标仍陷在坑里时不再重复。
 */
namespace PokemonSkills {
    function sandtombWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "partiallytrapped")) return false;
        if (CompanionBehavior.ai<boolean>(item, "preferGrounded", false) && target.grounded === false) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    CompanionBehavior.registerUse("sandtomb", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return sandtombWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !sandtombWants(context, capability, target)) return 0;
            let base = 14 + Math.round(CompanionBehavior.ratio(target) * 24);
            if (context.facts.focus === target.ref) base += 16;
            return base;
        }
    });

    addPreferences("sandtomb", {}, [
        field(pathOf("deep"), "沉陷式", "boolean", {
            help: "开启：下陷 ×1.4、持续 ×1.15、半径 ×1.2、冷却 +8，但每次磨蚀 ×0.9，用更深的坑把目标埋得久。关闭：收得更紧、磨得更重、更快结束。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 22, step: 1,
            help: "威胁离自己这么远以内才考虑流沙；调小只在近处塌坑，调大愿意从更远处先手陷住。"
        }),
        field(pathOf("ai.preferGrounded"), "只陷贴地目标", "boolean", {
            help: "开启：只对贴地的威胁塌坑，跳过腾空的目标（流沙吃不到，避免浪费）；关闭：对任何范围内的威胁都愿意尝试，腾空的目标会扑空。"
        })
    ]);
}
