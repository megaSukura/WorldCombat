/**
 * 珍藏 / lastresort 的伙伴 AI 用途。
 *
 * 什么局面下出手：只有账本攒满（其他已实装的招都出过一次）才进入候选——解锁前 `available` 直接 false，
 *   伙伴会照常去打别的招，把招式表走一遍。目标可见、敌对、存活且在 `ai.maxChase`（默认 9）格内。
 * 对谁出手：当前威胁；自己伤得越重，排序越靠前，因为这一记的威力随已损失生命上涨，正是翻盘的时机。
 * 够不到怎么办：射程由 `dash` 决定，共享任务把身位收进冲撞距离后再掏。
 * 放完之后：账本清空，交回共享交战计划，重新开始攒下一轮。
 */
namespace PokemonSkills {
    function lastresortActor(context: WorldBehavior.Context): CombatActor | null {
        const world = CompanionBehavior.world(context);
        return world.actor(CompanionBehavior.source(context).ref);
    }

    function lastresortWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        const world = CompanionBehavior.world(context), actor = lastresortActor(context);
        if (actor === null || !lastresortUnlocked(world, actor)) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse(lastresortId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const actor = lastresortActor(context);
            if (actor === null || !lastresortUnlocked(CompanionBehavior.world(context), actor)) return false;
            return !target || lastresortWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !lastresortWants(context, capability, target)) return 0;
            const ratio = Math.max(0, Math.min(1, 1 - CompanionBehavior.ratio(CompanionBehavior.source(context))));
            return Math.min(100, Math.round(82 + ratio * 16));
        }
    });

    addPreferences(lastresortId, {}, [
        field(pathOf("desperation"), "背水式", "boolean", {
            help: "开启：压上全部身家（威力 ×1.12、冲得更远 ×1.1），但起手慢 3 刻、收招多 3 刻、冷却多 8 刻，掏得越狠破绽越大。关闭：收势利落，冷却更短，适合稳妥地兑现。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才掏珍藏；本招冲撞距离中等，调大愿意更早兑现，调小则只在贴身决胜时掏。"
        })
    ]);
}
