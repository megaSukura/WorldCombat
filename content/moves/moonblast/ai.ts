/**
 * 月亮之力 / moonblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 13）格内；这是本组射程最远的单发妖精炮。
 * 对谁出手：当前威胁；目标离得较远时更值（别的招够不到，它能打到），目标生命低于一半时再抬一档当收尾。
 * 够不到怎么办：`reach` 就是射程，共享任务先把它收到射程内；它是单发弹道，不需要贴脸。
 * 放完之后：目标掉一段血、偶尔掉特攻，伙伴交回共享顺序。
 *
 * 月光强弱是世界事实，AI 不为之加条件：夜里露天打出去的每一发自然更重，白天也只是普通一炮。
 */
namespace PokemonSkills {
    function moonblastWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 13);
    }

    CompanionBehavior.registerUse(moonblastId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return moonblastWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !moonblastWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let base = 26;
            if (distance > 6) base += 6;
            if (CompanionBehavior.ratio(target) < 0.5) base += 8;
            return base;
        }
    });

    addPreferences(moonblastId, { ai: { maxChase: 13 } }, [
        number("ai.maxChase", "考虑距离", 4, 20, 1)
    ]);
}
