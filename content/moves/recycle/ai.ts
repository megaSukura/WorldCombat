/**
 * 回收利用 / recycle —— AI 用途。
 *
 * 什么局面下有意义：自己空手、并且记得一件刚在战斗中失去的持有物（本单元的规则在持有物从「有」变「空」时记下它）。
 * 手里已经有东西、或没有记忆时不参与候选；剩下本招时也不会空转（ready 会以 no-memory／already-held 拒绝）。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：那件持有物回到手里，记忆清空；若再次失去，规则会重新记下，才值得再来一次。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("recycle", {
        protocols: ["world_combat:fortify"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
            if (!actor || String(actor.domain()) !== "cobblemon") return false;
            if (!recycleEmptyHanded(world, actor)) return false;
            return !!recycleMemory(world, actor).id;
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        approachTarget: function (context: WorldBehavior.Context): WorldMethods.Subject { return CompanionBehavior.source(context); },
        priority: function (): number { return 70; }
    });

    addPreferences("recycle", { ai: {} }, []);
}
