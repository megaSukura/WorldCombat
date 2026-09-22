/**
 * 迎头一击 / firstimpression 的伙伴 AI 用途。
 *
 * 什么局面下出手：只有「刚出场」（这段时间内还没提交过任何招式的个体）才进入候选——这是本招的成立条件；
 *   已经出过手就直接 false，绝不白扣 PP。目标可见、敌对、存活且在 `ai.maxChase`（默认 7）格内。
 * 对谁出手：当前威胁；若那矛头正对着自己就排得更前，因为这一记重砸正好砸在它的起手上。
 * 够不到怎么办：射程由 `leap` 决定，共享任务把身位收进扑出距离后再砸。
 * 放完之后：交回共享交战计划；时机已过，本场它不会再被选中。
 */
namespace PokemonSkills {
    function firstimpressionWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        const world = CompanionBehavior.world(context);
        const actor = world.actor(CompanionBehavior.source(context).ref);
        if (actor === null || !firstimpressionFresh(world, actor)) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse(firstimpressionId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const world = CompanionBehavior.world(context);
            const actor = world.actor(CompanionBehavior.source(context).ref);
            if (actor === null || !firstimpressionFresh(world, actor)) return false;
            return !target || firstimpressionWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !firstimpressionWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            return target.attacking === self.ref ? 74 : 64;
        }
    });

    addPreferences(firstimpressionId, {}, [
        field(pathOf("reckless"), "舍身式", "boolean", {
            help: "开启：扑得更重（×1.12）、顶得更远（×1.25）、扑得更长（×1.08），但起手慢 3 刻、收招多 4 刻、冷却多 8 刻，落地后更难站起来。关闭：收势利落，落地后更快站定。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "对手离自己这么远以内才整段扑过去；本招扑出距离中等，调大愿意更早出手，调小则只在贴身开场时砸。"
        })
    ]);
}
