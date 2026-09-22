/**
 * 爬击 / skittersmack 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 6）格之内；它是贴身招，超出交给共享接近逻辑。
 * 对谁出手：当前威胁；目标正在攻击别人（或主人）时最值——它背对着自己，这一记更容易从背后落下。
 * 够不到怎么办：`reach` 就是出手距离，共享任务先把身位收进射程。
 * 放完之后：目标掉特攻，伙伴交回共享顺序继续交战；本招是一次绕背突击，不负责收尾。
 */
namespace PokemonSkills {
    function skittersmackWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    CompanionBehavior.registerUse(skittersmackId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return skittersmackWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !skittersmackWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context), owner = context.facts.owner;
            let base = 24;
            if (target.attacking && target.attacking !== self.ref) base += 10;
            if (owner && target.attacking === owner.ref) base += 6;
            return base;
        }
    });

    addPreferences(skittersmackId, { ai: { maxChase: 6 } }, [
        number("ai.maxChase", "出手距离", 2, 12, 1)
    ]);
}
