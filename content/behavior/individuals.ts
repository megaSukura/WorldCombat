/** Optional individual designs add facts, capabilities and policies to the existing live agent. */
namespace PokemonIndividuals {
    export interface Context { pokemon: CombatPokemon; world: CombatWorld; actor: CombatActor; frame: WorldBehavior.Frame; }
    export interface Design extends WorldContributions.Rule<Context> {
        matches(pokemon: CombatPokemon): boolean;
        /** Enables behavior even when none of the equipped native moves have a world implementation. */
        autonomous?: boolean;
    }
    export class Registry {
        private entries: { [id: string]: Design } = Object.create(null);
        private rules = new WorldContributions.Registry<Context>();
        define(design: Design): void {
            if (this.entries[design.id]) throw new Error("Duplicate individual design: " + design.id);
            this.entries[design.id] = design;
            this.rules.define({ id: design.id, after: design.after, before: design.before,
                applies: context => design.matches(context.pokemon) && (!design.applies || design.applies(context)), apply: design.apply });
        }
        supports(pokemon: CombatPokemon): boolean {
            return Object.keys(this.entries).some(id => this.entries[id].autonomous === true && this.entries[id].matches(pokemon));
        }
        apply(context: Context): void { this.rules.apply(context); }
    }
    export const registry = new Registry();
}
