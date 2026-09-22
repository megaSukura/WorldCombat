/**
 * 手下留情 / holdback 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活、在 `ai.maxChase`（默认 7）格以内。它是一记不会打倒人的扇形横扫，
 * `ai.preferCrowd`（默认开）在身前挤着两个以上敌人时加分——一次把一片都削到低血，是它最值的用法。
 * 对谁出手：当前威胁；落单时也能用，但成群时优先级更高，焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑；它射程很短，伙伴会自己贴到扇面够得着的位置。
 * 放完之后：扇面里的目标都至少留下 1 HP；沉腰式伙伴会站定一瞬，随后交回共享顺序。
 */
namespace PokemonSkills {
    function holdbackCrowd(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context), reach = CompanionBehavior.ai<number>(item, "maxChase", 7);
        let count = 0;
        ((context.facts.nearby as CompanionBehavior.Entity[]) || []).forEach(function (other) {
            if (other.friendly || other.health <= 0 || !other.visible) return;
            if (CompanionBehavior.distance(self.point, other.point) <= reach) count++;
        });
        return count;
    }

    function holdbackWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse("holdback", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return holdbackWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !holdbackWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let value = 22;
            const crowd = holdbackCrowd(context, capability);
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true) && crowd >= 2) value += 12 + Math.min(10, crowd * 3);
            if (context.facts.focus === target.ref) value += 10;
            return value;
        }
    });

    addPreferences("holdback", {}, [
        number("ai.maxChase", "考虑距离", 1, 14, 1),
        flag("ai.preferCrowd", "优先扎堆目标")
    ]);
}
