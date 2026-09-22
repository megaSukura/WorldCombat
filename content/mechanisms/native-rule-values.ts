/** Binds native sources to a value without prescribing which results they are allowed to influence. */
namespace NativeRuleValues {
    export interface Source {
        pokemon: CombatPokemon; world?: CombatWorld | null; actor?: CombatActor | null; state?: NativeEffects.State;
    }
    export function bind<C>(registry: RuleValues.Registry<C>, id: string, read: (context: C) => Source): void {
        registry.contribute(id, "native:rules", function (scope, value) {
            var source = read(scope.context), world = source.world || null, actor = source.actor || null;
            var state = source.state || (world && actor && world.valid(actor) ? NativeEffects.read(world, actor) : NativeEffects.empty());
            var result = { id: id, value: value, scope: scope };
            NativeAbilities.applyFacts(source.pokemon, state, "value", result, world, actor);
            NativeItems.applyFacts(source.pokemon, state, "value", result, world, actor);
            return result.value;
        });
    }
}
