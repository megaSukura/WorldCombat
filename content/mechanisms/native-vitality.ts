/** Maps cultivation HP into world durability; content supplies the scale or an alternative policy. */
namespace NativeVitality {
    export function install(id: string, capacity: (pokemon: CombatPokemon) => number): void {
        function update(event: CombatWorldEvent): void {
            var actor = event.actor();
            if (String(actor.domain()) !== "cobblemon") return;
            var pokemon = CobblemonCombat.pokemon(actor);
            CobblemonCombat.healthCapacity(event.world(), actor, capacity(pokemon));
        }
        WorldCombat.on(id + "/bound", "world_combat:actor_bound", "", update);
        // Capacity follows the Pokemon's own facts (level, stats, form); any change to them arrives here.
        WorldCombat.on(id + "/changed", "world_combat:actor_changed", "", update);
    }
}
