/**
 * 缝影 / spiritshackle 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活、在 `ai.maxChase`（默认 14）格以内。它是一记中远距离的定身箭：
 * `ai.catchRunners`（默认开）在目标正在逃跑时加分——一箭钉住影子，谁也跑不掉；对已经被缝住的目标大幅降分，
 * 不浪费一次箭去钉同一个目标。
 * 对谁出手：当前威胁；正在逃跑、距离较远、还没被缝住的优先，焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑；它射程很长，多数时候不需要贴身。
 * 放完之后：目标被钉住一段时间，伙伴交回共享顺序决定继续射击还是走位。
 */
namespace PokemonSkills {
    function spiritshackleWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 14);
    }

    CompanionBehavior.registerUse("spiritshackle", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return spiritshackleWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !spiritshackleWants(context, capability, target)) return 0;
            const trapped = CompanionBehavior.status(context, target, "trapped");
            if (trapped) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let value = 24;
            if (CompanionBehavior.ai<boolean>(capability, "catchRunners", true) && CompanionBehavior.fleeing(context, target)) value += 16;
            if (distance > 6) value += 10;
            if (context.facts.focus === target.ref) value += 10;
            return value;
        }
    });

    addPreferences("spiritshackle", {}, [
        number("ai.maxChase", "考虑距离", 3, 20, 1),
        flag("ai.catchRunners", "优先逃跑目标")
    ]);
}
