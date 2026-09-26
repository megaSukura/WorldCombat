/** Recycle only a real consumption receipt when the carried slot is empty. */
namespace PokemonSkills {
    CompanionBehavior.registerUse("recycle", {
        protocols: ["world_combat:fortify"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
            if (!actor) return false;
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
