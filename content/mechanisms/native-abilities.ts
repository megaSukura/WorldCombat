/** Native ability selection over the open trait library; mechanics and content supply the rules. */
namespace NativeAbilities {
    export interface Context {
        world: CombatWorld | null; actor: CombatActor | null; pokemon: CombatPokemon; state: NativeEffects.State; ability: string;
    }
    export var registry = new WorldTraits.Registry<Context>();
    export function define(id: string, data: WorldTraits.Bag = {}, hooks: WorldTraits.Definition<Context>["hooks"] = {}): void {
        registry.define({ id: id, data: data, hooks: hooks });
    }
    /**
     * Native markers taken from the installed Cobblemon data (failroleplay, cantsuppress, typeLock, ...), used only
     * when no independent ability trait declares the key. Content overrides a key by declaring it on its own trait;
     * `provideFlags` is the single entry a generated data file uses.
     */
    var provided: { [id: string]: { [key: string]: any } } = Object.create(null);
    export function provideFlags(table: { [id: string]: { [key: string]: any } }): void {
        Object.keys(table || {}).forEach(function (id) {
            var entry = provided[id] || (provided[id] = {});
            Object.keys(table[id] || {}).forEach(function (key) { entry[key] = table[id][key]; });
        });
    }
    export function property<T>(id: string, key: string, fallback: T): T {
        var data = registry.data(id);
        if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
        var native = provided[id];
        if (native && Object.prototype.hasOwnProperty.call(native, key)) return native[key];
        return fallback;
    }
    export function flag(id: string, key: string): boolean { return property(id, key, false); }
    export function has(id: string, key: string, value: string): boolean { return property<string[]>(id, key, []).indexOf(value) >= 0; }
    export function apply<T>(world: CombatWorld, actor: CombatActor, event: string, value: T,
        state?: NativeEffects.State, selected?: string): T {
        var pokemon = CobblemonCombat.pokemon(actor), current = state || NativeEffects.read(world, actor);
        var id = selected === undefined ? NativeEffects.ability(pokemon, current) : selected;
        return registry.dispatch(event, { world: world, actor: actor, pokemon: pokemon, state: current, ability: id }, value, id ? [id] : []);
    }
    export function applyFacts<T>(pokemon: CombatPokemon, state: NativeEffects.State, event: string, value: T,
                                  world: CombatWorld | null = null, actor: CombatActor | null = null): T {
        var id = NativeEffects.ability(pokemon, state);
        return registry.dispatch(event, { world: world, actor: actor, pokemon: pokemon, state: state, ability: id }, value, id ? [id] : []);
    }
    /** Content can connect new world protocols to ability rules without adding dispatcher branches. */
    export function bind(id: string, topic: string, hook: string, after: string = "",
        recipient: (event: CombatWorldEvent) => CombatActor | null = function (event) { return event.actor(); }): void {
        WorldCombat.on(id, topic, after, function (event) {
            var actor = recipient(event), world = event.world();
            if (actor && String(actor.domain()) === "cobblemon" && world.valid(actor)) apply(world, actor, hook, { event: event });
        });
    }
}
