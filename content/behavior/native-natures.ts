/** Native identity adapter; a mint changes effective stats, not the individual's behavior identity. */
namespace NativeNatures {
    export var registry = new WorldTraits.Registry<WorldBehavior.Frame>();
    export function define(id: string, values: { [key: string]: number }): void {
        registry.define({ id: id, data: { behavior: values }, hooks: { behavior: function (frame, _data, identity) {
            BehaviorProfiles.add(frame, "nature:" + identity, registry.data(identity).behavior);
        } } });
    }
    export function apply(frame: WorldBehavior.Frame, pokemon: CombatPokemon): void {
        var nature = String(pokemon.nature()).replace(/^cobblemon:/, "");
        frame.facts.nature = nature;
        frame.facts.knownNature = registry.has(nature);
        registry.dispatch("behavior", frame, frame, [nature]);
    }
}
