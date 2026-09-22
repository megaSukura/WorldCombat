/**
 * 点到为止 / falseswipe 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活、在 `ai.maxChase`（默认 6）格以内。它是一记不会打倒人的浅切，
 * 所以 `ai.spareHigh`（默认开）在目标血厚时加分——用在「削血但不想打死」的局面；目标已经很残时降低分，
 * 把收尾交给能打倒的招。
 * 对谁出手：当前威胁；血厚的优先，焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑；它射程很短，伙伴会自己贴上去。
 * 放完之后：目标至少留下 1 HP，伙伴交回共享顺序决定继续削还是换招。
 */
namespace PokemonSkills {
    function falseSwipeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    CompanionBehavior.registerUse("falseswipe", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return falseSwipeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !falseSwipeWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let value = 20;
            if (CompanionBehavior.ai<boolean>(capability, "spareHigh", true) && CompanionBehavior.ratio(target) > 0.55) value += 12;
            if (CompanionBehavior.ratio(target) < 0.3) value -= 6;
            if (context.facts.focus === target.ref) value += 10;
            return value;
        }
    });

    addPreferences("falseswipe", {}, [
        number("ai.maxChase", "考虑距离", 1, 12, 1),
        flag("ai.spareHigh", "优先厚血目标")
    ]);
}
