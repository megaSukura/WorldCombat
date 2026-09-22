/**
 * 薄雾球 / mistball 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，在 `ai.maxChase`（默认 11）格内，且身上还没有被雾糊住（再糊一次是浪费）。
 * 对谁出手：当前威胁；正在攻击自己或主人的目标优先——把羽绒雾糊在正在进攻的人身上最值。
 * 够不到怎么办：`reach` 就是射程，共享任务先把身位收进射程；它是一条慢弧线，所以要留出提前量。
 * 放完之后：目标掉一段血、多半被糊住减速，伙伴交回共享顺序。
 */
namespace PokemonSkills {
    function mistballWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            > CompanionBehavior.ai<number>(item, "maxChase", 11)) return false;
        return !CompanionBehavior.status(context, target, "downcast");
    }

    CompanionBehavior.registerUse(mistballId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return mistballWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "downcast");
        },
        priority: function (context, capability, target) {
            if (!target || !mistballWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context), owner = context.facts.owner;
            let base = 24;
            if (target.attacking && (target.attacking === self.ref || !!owner && target.attacking === owner.ref)) base += 10;
            return base;
        }
    });

    addPreferences(mistballId, { ai: { maxChase: 11 } }, [
        number("ai.maxChase", "考虑距离", 3, 18, 1)
    ]);
}
