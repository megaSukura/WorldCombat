/**
 * 击掌奇袭 / fakeout 的伙伴 AI 用途。
 *
 * 什么局面下出手：只有「刚出场」（这段时间内还没提交过任何招式的个体）才进入候选——这正是本招的成立条件；
 *   一旦已经出过手，`available` 直接 false，它根本不会白扣 PP。目标可见、敌对、存活且在 `ai.maxChase`（默认 6）格内。
 * 对谁出手：当前威胁；若那矛头正对着自己（`attacking` 是自己）就排得更靠前，因为它很可能正要出手、
 *   这一掌正好把它按停。
 * 够不到怎么办：射程由 `blink` 决定，共享任务把身位收进闪身距离后再拍。
 * 放完之后：交回共享交战计划；时机已过，本场它不会再被选中。
 */
namespace PokemonSkills {
    function fakeoutWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        const world = CompanionBehavior.world(context);
        const actor = world.actor(CompanionBehavior.source(context).ref);
        if (actor === null || !fakeoutFresh(world, actor)) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    CompanionBehavior.registerUse(fakeoutId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const world = CompanionBehavior.world(context);
            const actor = world.actor(CompanionBehavior.source(context).ref);
            if (actor === null || !fakeoutFresh(world, actor)) return false;
            return !target || fakeoutWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !fakeoutWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            return target.attacking === self.ref ? 78 : 68;
        }
    });

    addPreferences(fakeoutId, {}, [
        field(pathOf("feint"), "佯攻式", "boolean", {
            help: "开启：拍得更轻（×0.85），但拍懵更久（持续 ×1.35）且起手快 1 刻，适合先手压制。关闭：硬拍式，拍得更重（×1.12）、懵得短（×0.9），适合开场抢一点伤害。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才闪身拍过去；本招闪身距离短，调大也常够不到，调小则只在贴身开场时用。"
        })
    ]);
}
