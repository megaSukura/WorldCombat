/** Native inventories supply identity; independent item units provide world rules. */
namespace NativeItems {
    export interface Context {
        world: CombatWorld | null; actor: CombatActor | null; pokemon: CombatPokemon | null; species: string;
        state: NativeEffects.State; held: string; event: string;
    }
    export var registry = new WorldTraits.Registry<Context>();
    export function define(id: string, hooks: WorldTraits.Definition<Context>["hooks"], tag?: string): void {
        var key = id.indexOf(":") < 0 ? "cobblemon:" + id : id;
        registry.define({ id: key, hooks: hooks });
        if (tag) registry.provide(key, function (context) {
            return context.held && context.pokemon && context.pokemon.heldTag(tag) ? [key] : [];
        });
    }
    export function applyFacts<T>(pokemon: CombatPokemon, state: NativeEffects.State, event: string, data: T,
                                 world: CombatWorld | null = null, actor: CombatActor | null = null): T {
        var held = NativeEffects.item(pokemon, state), key = held && held.indexOf(":") < 0 ? "cobblemon:" + held : held;
        return registry.dispatch(event, { world: world, actor: actor, pokemon: pokemon, species: String(pokemon.species()), state: state, held: key, event: event }, data, key ? [key] : []);
    }
    export function apply<T>(world: CombatWorld, actor: CombatActor, event: string, data: T, state?: NativeEffects.State): T {
        return applyFacts(CobblemonCombat.pokemon(actor), state || NativeEffects.read(world, actor), event, data, world, actor);
    }
    export function critical(item: string, species: string, move?: CombatPokemonMove): { itemStage: number } {
        var held = item && item.indexOf(":") < 0 ? "cobblemon:" + item : item;
        return registry.dispatch("critical", { world: null, actor: null, pokemon: null, species: species,
            state: NativeEffects.empty(), held: held, event: "critical" }, { itemStage: 0, move: move }, held ? [held] : []);
    }
    export function consume(context: Context): boolean {
        return !!context.world && !!context.actor && context.world.valid(context.actor)
            && CobblemonCombat.consumeHeld(context.world, context.actor, String(context.pokemon!.heldKey()), 1);
    }
    export function heal(context: Context, health: number): number {
        return context.world && context.actor ? NativeEffects.heal(context.world, context.actor, context.pokemon!, health, "item") : 0;
    }
    export function loss(context: Context, health: number, cause: string = "item"): number {
        return context.world && context.actor ? context.world.health(context.actor, -health * context.pokemon!.healthScale(), "world_combat:" + cause) : 0;
    }
    export function boost(context: Context, stat: string, amount: number): void {
        if (context.world && context.actor) NativeEffects.boost(context.world, context.actor, stat, amount);
    }

    // ---- unified native equipment -----------------------------------------------------------------
    // A Pokemon's carried item, a player's hands and a mob's hands are the same contract: read a snapshot,
    // then take/drop/give/exchange by naming that snapshot. No path skips a non-Pokemon body.

    /** One observed native slot: the identity a compare-and-set names. */
    export interface Slot { provider: string; slot: string; index: number; }
    /** The minimal snapshot a compare-and-set needs. Taking with a stale `expected` never writes. */
    export interface HeldRef { slot: Slot; expected: string; }
    /** One observed held stack: identity plus the exact component snapshot CAS compares. */
    export interface Held extends HeldRef {
        id: string; path: string; name: string; count: number; stack: string | null;
        berry: boolean; pokemon: CombatPokemon | null;
        durability?: { damage: number; maximum: number; unbreakable: boolean; };
    }
    /** The item path without its namespace: `cobblemon:cheri_berry` -> `cheri_berry`. */
    export function pathOf(id: string): string {
        var value = String(id || "").toLowerCase(), split = value.indexOf(":");
        return split < 0 ? value : value.slice(split + 1);
    }
    /** The slot this combatant's carried item lives in: a Pokemon's held item, otherwise the main hand. */
    export function slotOf(actor: CombatActor): Slot {
        return String(actor.domain()) === "cobblemon"
            ? { provider: "cobblemon", slot: "held", index: 0 }
            : { provider: "minecraft", slot: "mainhand", index: 0 };
    }
    function slotRank(provider: string, slot: string): number {
        if (provider === "cobblemon") return 0;
        if (provider === "minecraft" && slot === "mainhand") return 1;
        if (provider === "minecraft" && slot === "offhand") return 2;
        return -1;
    }
    /**
     * Every held slot of a combatant in read order: carried item, main hand, off hand. Armour and third-party
     * slots stay out, so a consumer that means "the thing it holds" reads the same slots on every domain.
     */
    export function helds(world: CombatWorld, actor: CombatActor): Held[] {
        if (!world.valid(actor)) return [];
        var entries = world.equipment(actor), found: Held[] = [], pokemon: CombatPokemon | null = null;
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i], provider = String(entry.provider()), slot = String(entry.slot());
            if (slotRank(provider, slot) < 0) continue;
            if (provider === "cobblemon" && pokemon === null) pokemon = CobblemonCombat.pokemon(actor);
            var stack = entry.stack(), serialized = stack.serialized(), id = String(entry.item());
            found.push({ slot: { provider: provider, slot: slot, index: entry.index() }, expected: serialized || "",
                id: id, path: pathOf(id), name: "item." + id.replace(":", "."), count: entry.count(), stack: serialized,
                berry: !!entry.tagged("cobblemon:berries"), pokemon: provider === "cobblemon" ? pokemon : null,
                durability: { damage: stack.damage(), maximum: stack.maxDamage(),
                    unbreakable: stack.hasComponent("minecraft:unbreakable") || !stack.hasComponent("minecraft:damage") } });
        }
        found.sort(function (a, b) { return slotRank(a.slot.provider, a.slot.slot) - slotRank(b.slot.provider, b.slot.slot); });
        return found;
    }
    /** The combatant's held item (carried item, then main hand, then off hand); null when it holds nothing. */
    export function heldOf(world: CombatWorld, actor: CombatActor): Held | null {
        var list = helds(world, actor);
        return list.length ? list[0] : null;
    }
    /** Material eligibility owned by content. Modded equipment can opt in with world_combat:magnetic_equipment. */
    export function magneticEquipment(entry: CombatEquipment): boolean {
        if (entry.tagged("world_combat:magnetic_equipment")) return true;
        return /^minecraft:(?:iron|golden|chainmail|netherite)_(?:sword|axe|pickaxe|shovel|hoe|helmet|chestplate|leggings|boots)$/.test(String(entry.item()));
    }

    /** A readable equipment receipt; `item`/`count` describe the stack that moved, `drop` a spawned entity id. */
    export interface Receipt { ok: boolean; reason: string; item: string; count: number; drop: string; }
    /** Parse an equipment receipt; malformed JSON reads as a refusal rather than throwing. */
    export function receipt(json: string): Receipt {
        try {
            var value = JSON.parse(String(json));
            return { ok: !!value.ok, reason: value.reason === undefined ? "" : String(value.reason),
                item: value.item === undefined ? "" : String(value.item), count: Number(value.count) || 0,
                drop: value.drop === undefined ? "" : String(value.drop) };
        } catch (error) {
            return { ok: false, reason: "invalid-receipt", item: "", count: 0, drop: "" };
        }
    }
    /** CAS-remove consumption: one item by default, so a stack keeps its remainder and components. */
    export function takeHeld(world: CombatWorld, actor: CombatActor, held: HeldRef, count: number = 1): Receipt {
        return receipt(world.equipmentTakeResult(actor, held.slot.provider, held.slot.slot, held.slot.index, held.expected, count));
    }
    /** Apply exact authored wear to the observed stack, retaining components and at least one durability point. */
    export function wearHeld(world: CombatWorld, actor: CombatActor, held: Held, amount: number): Receipt {
        var durability = held.durability;
        if (!durability || durability.unbreakable || durability.maximum <= 0 || !held.stack)
            return { ok: false, reason: "not-damageable", item: "", count: 0, drop: "" };
        var next = Math.min(durability.maximum - 1, durability.damage + Math.max(0, Math.floor(amount)));
        if (next <= durability.damage) return { ok: false, reason: "no-wear", item: "", count: 0, drop: "" };
        var stack = JSON.parse(held.stack); stack.components = stack.components || {}; stack.components["minecraft:damage"] = next;
        return receipt(world.equipmentGiveResult(actor, held.slot.provider, held.slot.slot, held.slot.index, held.expected, JSON.stringify(stack)));
    }
    /** CAS-remove the exact observed stack as a native item entity; `data` is {pickupDelay,velocity,glow}. */
    export function dropHeld(world: CombatWorld, actor: CombatActor, held: HeldRef, data: string): Receipt {
        return receipt(world.equipmentDropResult(actor, held.slot.provider, held.slot.slot, held.slot.index, held.expected, data));
    }
    /** CAS-install a serialized stack (or item id) into this combatant's empty carried slot. */
    export function giveHeld(world: CombatWorld, actor: CombatActor, item: string): Receipt {
        var slot = slotOf(actor);
        return receipt(world.equipmentGiveResult(actor, slot.provider, slot.slot, slot.index, "", item));
    }
    /**
     * Atomic transfer between two combatants' held slots; either side may be empty, so this is steal, give or swap.
     * When both sides hold something the whole observed stacks swap. With one side empty, one item moves by default
     * and the source keeps its remainder; pass `count = 0` to move the whole stack (which a one-item slot refuses).
     */
    export function exchangeHeld(world: CombatWorld, first: CombatActor, second: CombatActor, count: number = 1): Receipt {
        var a = heldOf(world, first), b = heldOf(world, second);
        var sa = a !== null ? a.slot : slotOf(first), sb = b !== null ? b.slot : slotOf(second);
        return receipt(world.equipmentExchangeResult(first, sa.provider, sa.slot, sa.index, a !== null ? a.expected : "",
            second, sb.provider, sb.slot, sb.index, b !== null ? b.expected : "", count));
    }
    /** True while the shared embargo identity seals this combatant's item channel. */
    export function sealed(world: CombatWorld, actor: CombatActor): boolean {
        return world.valid(actor) && CombatStatus.has(world, actor, "embargo");
    }

    // ---- shared Berry identity and basic on-eat effect --------------------------------------------
    // One table says what a Berry is and what eating it basically does. Each move keeps its own
    // absorption ratio, chewing timing, conditions and extra gains.

    export interface Berry { id: string; path: string; name: string; heal: number; cures: string[]; boost: string; stages: number; recoil: number; }
    export interface BerryEffect { heal?: number; cures?: string[]; boost?: string; stages?: number; recoil?: number; }
    /**
     * The basic on-eat effect of a native Berry, keyed by item path. A Berry missing from this table can still be
     * eaten (its native identity stays); it simply has no additional battle effect and never fabricates healing.
     */
    export var berries: { [path: string]: BerryEffect } = {
        "oran_berry": { heal: 0.125 },
        "sitrus_berry": { heal: 0.25 },
        "figy_berry": { heal: 0.333 }, "wiki_berry": { heal: 0.333 }, "mago_berry": { heal: 0.333 },
        "aguav_berry": { heal: 0.333 }, "iapapa_berry": { heal: 0.333 },
        "cheri_berry": { cures: ["paralysis"] },
        "chesto_berry": { cures: ["sleep"] },
        "pecha_berry": { cures: ["poison", "toxic"] },
        "rawst_berry": { cures: ["burn"] },
        "aspear_berry": { cures: ["frozen"] },
        "lum_berry": { cures: ["paralysis", "sleep", "poison", "toxic", "burn", "frozen"] },
        "liechi_berry": { boost: "atk", stages: 1 },
        "ganlon_berry": { boost: "def", stages: 1 },
        "salac_berry": { boost: "spe", stages: 1 },
        "petaya_berry": { boost: "spa", stages: 1 },
        "apicot_berry": { boost: "spd", stages: 1 },
        "starf_berry": { boost: "random", stages: 2 },
        "kee_berry": { boost: "def", stages: 1 },
        "maranga_berry": { boost: "spd", stages: 1 },
        "jaboca_berry": { recoil: 0.125 },
        "rowap_berry": { recoil: 0.125 }
    };
    /** Register or replace a Berry's basic on-eat effect; later item units extend the shared table here. */
    export function defineBerry(path: string, effect: BerryEffect): void {
        berries[pathOf(path)] = effect;
    }
    function berrySnapshot(id: string, path: string): Berry {
        var entry = berries[path] || {};
        return { id: id, path: path, name: "item." + id.replace(":", "."), heal: entry.heal || 0,
            cures: entry.cures || [], boost: entry.boost || "", stages: entry.stages || 0, recoil: entry.recoil || 0 };
    }
    /** The shared Berry for an item id; null when the id is not in the shared table. */
    export function berryOfItem(id: string): Berry | null {
        if (!id) return null;
        var path = pathOf(id);
        return berries[path] ? berrySnapshot(id, path) : null;
    }
    /** The shared Berry of an observed held item; null when the item is not a native Berry. */
    export function berryFrom(held: Held | null): Berry | null {
        if (held === null || !held.berry) return null;
        return berrySnapshot(held.id, held.path);
    }
    export interface HeldBerry { held: Held; berry: Berry; }
    /** The combatant's held Berry with the exact slot CAS needs; null when it holds no Berry. */
    export function heldBerry(world: CombatWorld, actor: CombatActor): HeldBerry | null {
        var held = heldOf(world, actor);
        if (held === null || !held.berry) return null;
        return { held: held, berry: berrySnapshot(held.id, held.path) };
    }
    /**
     * Fraction-of-maximum Berry healing shared by every eat path: a Pokemon passes the native healing gate,
     * another body writes Minecraft health. Returns the health actually gained so the caller keeps the feedback.
     */
    export function berryHeal(world: CombatWorld, actor: CombatActor, fraction: number, cause: string): number {
        var before = world.observe(actor);
        if (before === null) return 0;
        var amount = Math.min(before.maxHealth() - before.health(), before.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        if (String(actor.domain()) === "cobblemon" && world.valid(actor)) {
            var pokemon = CobblemonCombat.pokemon(actor), scale = Math.max(0.001, pokemon.healthScale());
            NativeEffects.heal(world, actor, pokemon, amount / scale, cause);
        } else {
            world.health(actor, amount, "world_combat:" + cause);
        }
        var after = world.observe(actor);
        return after === null ? 0 : Math.max(0, after.health() - before.health());
    }
    export interface EatResult { healed: number; cured: string[]; stat: string; stages: number; recoil: boolean; }
    /**
     * Apply a Berry's basic on-eat effect (heal, status cure, stat boost, and optionally its recoil) at `absorb`
     * scale. `extraStage` adds the move's own bonus stages when the Berry raises a stat; `applyRecoil` and
     * `recoilCause` let a move decide whether it takes the recoil. Later item units extend behavior by
     * registering an `eat` hook with `NativeItems.define`.
     */
    export function eat(world: CombatWorld, actor: CombatActor, berry: Berry, absorb: number, extraStage: number = 0,
                        cause: string = "berry", applyRecoil: boolean = false, recoilCause: string = "berry_spike"): EatResult {
        var result: EatResult = { healed: 0, cured: [], stat: "", stages: 0, recoil: false };
        if (!world.valid(actor)) return result;
        var factor = isFinite(absorb) ? Math.max(0, absorb) : 1;
        if (berry.heal > 0) result.healed = Math.round(berryHeal(world, actor, berry.heal * factor, cause) * 10) / 10;
        for (var i = 0; i < berry.cures.length; i++) if (CombatStatus.cure(world, actor, berry.cures[i])) result.cured.push(berry.cures[i]);
        var stat = berry.boost;
        if (stat === "random") {
            var pool = ["atk", "def", "spa", "spd", "spe"];
            stat = pool[Math.floor(world.random() * pool.length) % pool.length];
        }
        var stages = berry.stages + (berry.boost ? extraStage : 0);
        if (stat) NativeEffects.boost(world, actor, stat, stages);
        result.stat = stat; result.stages = stages;
        if (applyRecoil && berry.recoil > 0) {
            var body = world.observe(actor);
            if (body !== null) { world.health(actor, -body.maxHealth() * berry.recoil * factor, "world_combat:" + recoilCause); result.recoil = true; }
        }
        var key = berry.id.indexOf(":") < 0 ? "cobblemon:" + berry.id : berry.id;
        var pokemon: CombatPokemon | null = String(actor.domain()) === "cobblemon" && world.valid(actor) ? CobblemonCombat.pokemon(actor) : null;
        registry.dispatch("eat", { world: world, actor: actor, pokemon: pokemon, species: pokemon ? String(pokemon.species()) : "",
            state: NativeEffects.read(world, actor), held: key, event: "eat" }, result, [key]);
        return result;
    }
}
