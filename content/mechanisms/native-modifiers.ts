/** Temporary combat changes compose over current native facts and expire with their effect. */
namespace NativeModifiers {
    export interface Options {
        /** Zero-contribution preparation used only until a shared effect-state transaction commits. */
        pending?: boolean;
        stages?: { [stat: string]: number }; stats?: { [stat: string]: number };
        types?: string[]; ability?: string; suppressAbility?: boolean; suppressItems?: boolean;
        moves?: { [slot: string]: string }; forbidden?: string[]; only?: string; categories?: string[];
        /** Optional native application owning this temporary layer and its visible lifetime. */
        carrier?: MobEffects.Anchor;
        owner?: CombatStages.WindowOwner;
        origin?: string;
        /** Content contribution identity, separate from the effect's source actor. */
        source?: string;
    }
    export interface Layers extends Options { moveKeys?: { [slot: string]: string }; }
    var stats = ["atk", "def", "spa", "spd", "spe"], stages = stats.concat(["accuracy", "evasion"]);
    var types = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    function identifier(value: string): void { if (typeof value !== "string" || !/^[a-z0-9]{1,64}$/.test(value)) throw new Error("Invalid native content identity"); }
    function normalize(json: string): string {
        var value: Options = JSON.parse(json);
        if (!value || Array.isArray(value)) throw new Error("Expected modifier object");
        Object.keys(value).forEach(function (key) {
            if (["stages", "stats", "types", "ability", "suppressAbility", "suppressItems", "moves", "forbidden", "only", "categories", "carrier", "source", "owner", "origin", "pending"].indexOf(key) < 0) throw new Error("Unknown native modifier: " + key);
        });
        if (value.pending !== undefined && typeof value.pending !== "boolean") throw new Error("Invalid pending modifier");
        if (value.carrier && !MobEffects.validAnchor(value.carrier)) throw new Error("Invalid modifier carrier");
        if (value.owner && !CombatStages.validOwner(value.owner)) throw new Error("Invalid modifier owner");
        if (value.origin !== undefined && typeof value.origin !== "string") throw new Error("Invalid modifier origin");
        if (value.source !== undefined && typeof value.source !== "string") throw new Error("Invalid modifier contribution source");
        ["stages", "stats"].forEach(function (field) {
            var values: { [key: string]: number } = (<any>value)[field] || {};
            Object.keys(values).forEach(function (key) {
                var n = values[key], allowed = field === "stages" ? stages : stats;
                if (allowed.indexOf(key) < 0 || typeof n !== "number" || !isFinite(n) || n !== Math.floor(n)
                    || field === "stages" && Math.abs(n) > 6 || field === "stats" && (n < 1 || n > 10000)) throw new Error("Invalid native stat modifier");
            });
        });
        // Any count of known, ordered-unique type identities, including the empty layer that means "no type".
        // The layer is temporary storage only; the native individual is never rewritten.
        if (value.types && (!Array.isArray(value.types) ||
            value.types.some(function (type, index) { return typeof type !== "string" || types.indexOf(type) < 0 || value.types!.indexOf(type) !== index; }))) throw new Error("Invalid temporary types");
        if (value.ability !== undefined) identifier(value.ability);
        [value.suppressAbility, value.suppressItems].forEach(function (v) { if (v !== undefined && typeof v !== "boolean") throw new Error("Invalid suppression"); });
        Object.keys(value.moves || {}).forEach(function (slot) {
            if (!/^[0-3]$/.test(slot)) throw new Error("Invalid temporary slot");
            identifier(value.moves![slot]); CobblemonCombat.moveTemplate(value.moves![slot]);
        });
        if (value.forbidden) { if (!Array.isArray(value.forbidden) || value.forbidden.length > 16) throw new Error("Invalid move exclusions"); value.forbidden.forEach(identifier); }
        if (value.only !== undefined) identifier(value.only);
        if (value.categories && (!Array.isArray(value.categories) || value.categories.length > 3 ||
            value.categories.some(function (category) { return ["physical", "special", "status"].indexOf(category) < 0; }))) throw new Error("Invalid category exclusions");
        return JSON.stringify(value);
    }
    export function read(world: CombatWorld, actor: CombatActor): Layers {
        var result: Layers = { stages: {}, stats: {}, moves: {}, moveKeys: {}, forbidden: [], categories: [] };
        var nativeEntries = world.effects(actor, "cobblemon_world_combat:modifier"), entries: CombatEffectView[] = [];
        for (var i = 0; i < nativeEntries.length; i++) entries.push(nativeEntries[i]);
        entries.sort(function (a, b) { return a.id() - b.id(); });
        entries.forEach(function (entry) {
            var value: Options = JSON.parse(String(entry.data()));
            if (value.pending) return;
            if ((value.carrier || value.owner) && !CombatStages.windowAlive(world, actor, value)) return;
            Object.keys(value.stages || {}).forEach(function (stat) { result.stages![stat] = (result.stages![stat] || 0) + value.stages![stat]; });
            Object.keys(value.stats || {}).forEach(function (stat) { result.stats![stat] = value.stats![stat]; });
            Object.keys(value.moves || {}).forEach(function (slot) { result.moves![slot] = value.moves![slot]; result.moveKeys![slot] = String(entry.id()); });
            ["types", "ability", "only"].forEach(function (key) { if ((<any>value)[key] !== undefined) (<any>result)[key] = (<any>value)[key]; });
            result.suppressAbility = result.suppressAbility || value.suppressAbility;
            result.suppressItems = result.suppressItems || value.suppressItems;
            result.forbidden = result.forbidden!.concat(value.forbidden || []);
            result.categories = result.categories!.concat(value.categories || []);
        });
        return result;
    }
    export function apply(world: CombatWorld, actor: CombatActor, options: Options, ticks: number): number {
        if (String(actor.domain()) !== "cobblemon") throw new Error("Native modifiers require a Pokemon");
        return world.effect("cobblemon_world_combat:modifier", actor, normalize(JSON.stringify(options)), ticks);
    }
    export function restriction(world: CombatWorld, actor: CombatActor, move: CombatPokemonMove, action: CombatAction | null = null,
        policyMove: CombatPokemonMove = move): string {
        var policy = CombatStatus.actionReason(CombatStatus.actionPolicy(world, actor, action, policyMove));
        if (policy) return policy;
        var pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor), layers = state.layers!;
        if (layers.forbidden!.indexOf(String(move.id())) >= 0 || layers.categories!.indexOf(String(move.category())) >= 0) return "move-restricted";
        if (layers.only && layers.only !== String(move.id())) return "move-locked";
        if (state.flags.tauntUntil > world.tick() && String(move.category()) === "status") return "move-restricted";
        var itemRestriction = NativeItems.applyFacts(pokemon, state, "restriction", { move: move, reason: "" }).reason;
        if (itemRestriction) return itemRestriction;
        return "";
    }
    export function copy(world: CombatWorld, target: CombatActor, from: CombatActor, ticks: number): number {
        var pokemon = CobblemonCombat.pokemon(from), state = NativeEffects.read(world, from), values: { [key: string]: number } = {}, moves: { [key: string]: string } = {};
        stats.forEach(function (stat) { values[stat] = NativeEffects.stat(pokemon, state, stat); });
        for (var slot = 0; slot < pokemon.moveSlots(); slot++) { var move = pokemon.move(slot); if (move) moves[String(slot)] = state.layers!.moves![String(slot)] || String(move.id()); }
        var name = NativeEffects.ability(pokemon, state);
        return apply(world, target, { stats: values, types: NativeEffects.types(pokemon, state), ability: name || String(pokemon.ability()), suppressAbility: !name, moves: moves }, ticks);
    }
    export function exchange(world: CombatWorld, target: CombatActor): boolean {
        var source = world.source(), own = CobblemonCombat.pokemon(source), other = CobblemonCombat.pokemon(target);
        if (String(source.key()) === String(target.key()) || NativeAbilities.flag(NativeEffects.ability(other, NativeEffects.read(world, target)), "heldExchangeImmune")) return false;
        return CobblemonCombat.swapHeld(world, source, target, String(own.heldKey()), String(other.heldKey()));
    }
    /**
     * True when the actor's effective ability locks its types (Multitype, Stance Change, ...), read from the native
     * ability data. Type-rewriting moves query this before applying a `types` layer.
     */
    export function typeLocked(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        var state = NativeEffects.read(world, actor), name = NativeEffects.ability(CobblemonCombat.pokemon(actor), state);
        return NativeAbilities.flag(name, "typeLock") || NativeAbilities.flag(name, "typeLocked");
    }
    /**
     * False when the native ability refuses to be copied (Role Play, Doodle, Entrainment). The `failroleplay`
     * marker comes from the shared ability data, so content overrides it by declaring the flag on its own trait.
     */
    export function abilityCopyable(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        var state = NativeEffects.read(world, actor), name = NativeEffects.ability(CobblemonCombat.pokemon(actor), state);
        return !NativeAbilities.flag(name, "failroleplay");
    }
    /**
     * False when the native ability refuses to be suppressed or overwritten (Gastro Acid, Simple Beam, Worry Seed).
     * `cantsuppress` is deliberately separate from the type lock: many suppress-immune abilities still allow a type rewrite.
     */
    export function abilitySuppressible(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        var state = NativeEffects.read(world, actor), name = NativeEffects.ability(CobblemonCombat.pokemon(actor), state);
        return !NativeAbilities.flag(name, "cantsuppress");
    }
    if (typeof CobblemonCombat !== "undefined") {
        WorldCombat.effect("cobblemon_world_combat:modifier", 1, 12000, "actor", normalize, EffectProtocols.unchanged);
        var watchCarrier = function (effect: CombatEffect, claim: boolean): void {
            var state: Options = JSON.parse(effect.state());
            if (state.pending) { if (claim) effect.schedule("carrier", "carrier", 1, "{}"); else effect.end(); return; }
            if (!state.carrier && !state.owner) return;
            var world = effect.world(), actor = effect.target();
            if (!CombatStages.windowAlive(world, actor, state)) { effect.end(); return; }
            if (claim && state.carrier) MobEffects.bind(world, actor, state.carrier.id);
            effect.schedule("carrier", "carrier", 1, "{}");
        };
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "start", function (effect) { watchCarrier(effect, true); });
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "carrier", function (effect) { watchCarrier(effect, false); });
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "operation:world_combat:stage_edit", CombatStages.editWindow);
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "operation:world_combat:stage_owner", CombatStages.attachOwner);
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "operation:world_combat:stage_adopt", CombatStages.adoptWindow);
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "operation:world_combat:stage_transfer", function (effect) {
            CombatStages.transferWindow(effect, "cobblemon_world_combat:modifier");
        });
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "operation:world_combat:dispel", function (effect) { effect.end(); });
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "operation:world_combat:clear_stages", function (effect) {
            var state = JSON.parse(effect.state()); delete state.stages;
            if (!Object.keys(state).some(function (key) { return key !== "carrier" && key !== "source" && key !== "owner" && key !== "origin"; })) effect.end(); else effect.state(normalize(JSON.stringify(state)));
        });
        WorldCombat.effectHandler("cobblemon_world_combat:modifier", "operation:world_combat:extend", function (effect) { effect.remaining(Math.min(12000, effect.remaining() + JSON.parse(String(effect.input())).ticks)); });
    }
}
