/** Both native status/trait readers and all-domain damage facts see the same ordered temporary type layers. */
namespace NativeTypes {
    export function read(world: CombatWorld, actor: CombatActor, state: NativeEffects.State): string[] {
        const pokemon = CobblemonCombat.pokemon(actor), base: string[] = state.types ? state.types.split(",") : [];
        if (!state.types) for (let i = 0; i < pokemon.typeCount(); i++) base.push(String(pokemon.type(i)));
        const layers: CombatTypes.Layer[] = [];
        world.effects(actor, "cobblemon_world_combat:modifier").forEach(view => {
            const value: NativeModifiers.Options = JSON.parse(String(view.data()));
            if (value.pending || value.types === undefined
                || (value.carrier || value.owner) && !CombatStages.windowAlive(world, actor, value)) return;
            layers.push({ order: view.id(), operation: "replace", types: value.types });
        });
        return CombatTypes.resolve(world, actor, base, layers);
    }
    CombatTypes.policy.define({ id: "cobblemon:type-lock", apply: context => {
        if (NativeModifiers.typeLocked(context.world, context.actor)) context.allowed = false;
    } });
    // Ordinary bodies retain provider facts and native damage kinds. This only changes matchup/STAB type facts.
    // Further final type filters can declare after:["world_combat:actor_types"].
    PokemonDamage.combatants.resolved.define({ id: "world_combat:actor_types", apply: context => {
        if (String(context.actor.domain()) !== "cobblemon")
            context.facts.types = CombatTypes.resolve(context.world, context.actor, context.facts.types);
    } });
}
