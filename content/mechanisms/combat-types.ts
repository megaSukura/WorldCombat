/** Temporary type operations over current provider facts. Each layer follows one exact native carrier. */
namespace CombatTypes {
    export const definition = "world_combat:type_layer";
    export interface Change { operation: "replace" | "add" | "remove"; types: string[]; }
    export interface Layer extends Change { order: number; }
    interface State extends Change { carrier: MobEffects.Anchor; }
    export interface Policy { world: CombatWorld; actor: CombatActor; change: Change; allowed: boolean; }
    /** Domain traits may refuse a new type change; existing layers retain their own lifetime. */
    export const policy = new WorldContributions.Registry<Policy>();
    const maximumTicks = 1200000;
    const known = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
        "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    function change(value: Change): Change {
        if (!value || ["replace", "add", "remove"].indexOf(value.operation) < 0 || !Array.isArray(value.types)
            || value.types.some((type, index) => typeof type !== "string" || known.indexOf(type) < 0 || value.types.indexOf(type) !== index))
            throw new Error("Invalid temporary type operation");
        return { operation: value.operation, types: value.types.slice() };
    }
    function normalize(json: string): string {
        const value: State = JSON.parse(json), operation = change(value);
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("A type layer needs an exact carrier");
        return JSON.stringify({ operation: operation.operation, types: operation.types, carrier: value.carrier });
    }
    /** The caller supplies its observed carrier. Refresh/replacement invalidates the previous key immediately. */
    export function apply(world: CombatWorld, actor: CombatActor, operation: Change, carrier: CombatMobEffect): number {
        const clean = change(operation), anchor = MobEffects.anchor(carrier);
        if (!world.valid(actor) || !MobEffects.matches(world, actor, anchor)) return 0;
        const request = policy.apply({ world, actor, change: clean, allowed: true });
        if (!request.allowed || !MobEffects.matches(world, actor, anchor)) return 0;
        const current = MobEffects.read(world, actor, anchor.id)!;
        return world.effect(definition, actor, normalize(JSON.stringify({ operation: request.change.operation,
            types: request.change.types, carrier: anchor })), current.duration() < 0 ? maximumTicks : Math.max(1, Math.min(maximumTicks, current.duration())));
    }
    /** Compose effect-id order without snapshotting another layer's contribution. Empty replacement means no type. */
    export function resolve(world: CombatWorld, actor: CombatActor, base: string[], external: Layer[] = []): string[] {
        const layers = external.slice();
        world.effects(actor, definition).forEach(view => {
            const state: State = JSON.parse(String(view.data()));
            if (MobEffects.matches(world, actor, state.carrier))
                layers.push({ order: view.id(), operation: state.operation, types: state.types });
        });
        layers.sort((a, b) => a.order - b.order);
        let types = base.filter((type, index) => base.indexOf(type) === index);
        layers.forEach(layer => {
            if (layer.operation === "replace") types = layer.types.slice();
            else if (layer.operation === "add") layer.types.forEach(type => { if (types.indexOf(type) < 0) types.push(type); });
            else types = types.filter(type => layer.types.indexOf(type) < 0);
        });
        return types;
    }
    function watch(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), state: State = JSON.parse(String(effect.state()));
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.carrier)) { effect.end(); return; }
        const current = MobEffects.read(world, actor, state.carrier.id)!;
        effect.remaining(current.duration() < 0 ? maximumTicks : Math.max(1, Math.min(maximumTicks, current.duration())));
        effect.schedule("carrier", "carrier", 1, "{}");
    }
    WorldCombat.effect(definition, 1, maximumTicks, "actor", normalize, EffectProtocols.unchanged);
    WorldCombat.effectHandler(definition, "start", watch);
    WorldCombat.effectHandler(definition, "resume", watch);
    WorldCombat.effectHandler(definition, "carrier", watch);
    WorldCombat.effectHandler(definition, "operation:world_combat:dispel", effect => effect.end());
}
