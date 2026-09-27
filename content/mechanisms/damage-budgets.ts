/** Finite, carrier-owned uses reserved for a real native hurt, settled by its synchronous receipt. */
namespace DamageBudgets {
    export const definition = "world_combat:damage_budget";
    export const settledHook = "world_combat:damage_budgets/settled";
    export interface Options { uses?: number; payload?: any; anchor?: MobEffects.Anchor; }
    export interface Handle { actor: CombatActor; id: number; }
    export interface View extends Handle { remaining: number; available: number; payload: any; }
    export interface Claim extends Handle { uses?: number; }
    export interface Reserved extends Handle { uses: number; payload: any; }
    export interface Result {
        id: number; actor: string; uses: number; payload: any; committed: boolean; active: boolean;
    }
    export interface Incoming { world: CombatWorld; data: any; }
    /** Incoming numerical changes first; redistribution follows with the resulting owned attack amount. */
    export const modifiers = new WorldContributions.Registry<DamageSemantics.Incoming>();
    export const allocations = new WorldContributions.Registry<DamageSemantics.Incoming>();
    interface State {
        actor: string; holder: CombatActor; expires: number; remaining: number; payload: any; anchor?: MobEffects.Anchor;
        active: boolean; held: { [receipt: string]: number };
    }
    interface Held { id: number; state: State; uses: number; payload: any; }
    const states: { [id: string]: State } = Object.create(null);
    const pending: { [receipt: string]: Held[] } = Object.create(null);
    function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
    function count(value: number): number {
        // IEEE-754 exact integer range, not a gameplay/content quota.
        if (!isFinite(value) || value < 1 || value > 9007199254740991 || Math.floor(value) !== value) throw new Error("Invalid damage budget uses");
        return value;
    }
    function available(state: State): number {
        let held = 0;
        Object.keys(state.held).forEach(id => held += state.held[id]);
        return Math.max(0, state.remaining - held);
    }
    function collect(tick: number): void {
        // Unavailable actor-lifetime effects may be suspended without an end callback. Retire only their
        // declared lifetime; this never decides whether a hurt succeeded or releases a pending receipt early.
        Object.keys(states).forEach(id => {
            if (states[id].expires <= tick) { states[id].active = false; delete states[id]; }
        });
    }
    WorldCombat.effect(definition, 1, 1200000, "actor", json => {
        const value: Options = JSON.parse(json || "{}");
        if (!value || typeof value !== "object") throw new Error("Invalid damage budget");
        value.uses = count(value.uses === undefined ? 1 : value.uses);
        if (value.anchor && !MobEffects.validAnchor(value.anchor)) throw new Error("Invalid damage budget anchor");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function watch(effect: CombatEffect): void {
        const state = states[String(effect.id())];
        if (!state || state.anchor && !MobEffects.matches(effect.world(), effect.target(), state.anchor)
            || state.remaining === 0 && Object.keys(state.held).length === 0) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    }
    WorldCombat.effectHandler(definition, "start", effect => {
        const value: Options = JSON.parse(String(effect.state()));
        collect(effect.world().tick());
        states[String(effect.id())] = { actor: String(effect.target().ref()), holder: effect.target(),
            expires: effect.world().tick() + effect.remaining(), remaining: count(value.uses || 1),
            payload: copy(value.payload === undefined ? null : value.payload), anchor: value.anchor,
            active: true, held: Object.create(null) };
        watch(effect);
    });
    WorldCombat.effectHandler(definition, "watch", watch);
    WorldCombat.effectHandler(definition, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(definition, "end", effect => {
        const id = String(effect.id()), state = states[id];
        if (state) state.active = false;
        delete states[id];
        // Pending entries keep only this synchronous hurt's detached state until its guaranteed final receipt.
    });
    /** The ordinary actor-lifetime effect owns these uses. No saved/reload restoration of a partially used budget. */
    export function open(world: CombatWorld, actor: CombatActor, ticks: number, options: Options = {}): Handle | null {
        const uses = count(options.uses === undefined ? 1 : options.uses);
        if (!isFinite(ticks) || ticks < 1 || ticks > 1200000 || Math.floor(ticks) !== ticks) throw new Error("Invalid damage budget lifetime");
        if (!world.valid(actor)) return null;
        const id = world.effect(definition, actor, JSON.stringify({ uses, payload: options.payload === undefined ? null : options.payload,
            anchor: options.anchor }), ticks);
        return id > 0 ? { actor, id } : null;
    }
    /** Pure availability: it never reserves or consumes an attempt. */
    export function read(world: CombatWorld, handle: Handle): View | null {
        collect(world.tick());
        const state = states[String(handle.id)];
        if (!state || !state.active || state.actor !== String(handle.actor.ref()) || !world.valid(handle.actor)) return null;
        if (state.anchor && !MobEffects.matches(world, handle.actor, state.anchor)) return null;
        if (!world.effects(handle.actor, definition).some(effect => effect.id() === handle.id)) return null;
        return { actor: handle.actor, id: handle.id, remaining: state.remaining, available: available(state), payload: copy(state.payload) };
    }
    /** All-or-none reservation before modifying this incoming amount. One hurt can reserve several independent
     * resources atomically; an already-held resource is unavailable to nested hits. No callback runs here.
     * The caller chooses eligibility/formula and only modifies the amount after a non-null result. */
    export function reserve(context: Incoming, claims: Claim[]): Reserved[] | null {
        const receipt = String(context.data && context.data.receiptId || "");
        if (!receipt || context.world.damageReceipt() !== receipt || context.data.settled || claims.length === 0) return null;
        const selected: Held[] = [], values: Reserved[] = [], seen: { [id: string]: boolean } = Object.create(null);
        for (let i = 0; i < claims.length; i++) {
            const claim = claims[i], id = String(claim.id), uses = count(claim.uses === undefined ? 1 : claim.uses);
            if (seen[id]) return null;
            seen[id] = true;
            const view = read(context.world, claim), state = states[id];
            if (!view || !state || state.held[receipt] !== undefined || view.available < uses) return null;
            selected.push({ id: claim.id, state, uses, payload: copy(view.payload) });
            values.push({ actor: claim.actor, id: claim.id, uses, payload: copy(view.payload) });
        }
        selected.forEach(claim => claim.state.held[receipt] = claim.uses);
        pending[receipt] = (pending[receipt] || []).concat(selected);
        return values;
    }
    /** Content reacts in its own host hook ordered after settledHook. All reservations have already settled
     * before any content creates a gift/credit; `active=false` means the owning carrier ended during this hit.
     * A dead event actor still has a receipt, but receives no new live mutation permissions. */
    export function results(data: any): Result[] {
        return data && Array.isArray(data.damageBudgets) ? copy(data.damageBudgets) : [];
    }
    WorldCombat.on(settledHook, "world_combat:damage_settled", "", event => {
        const data = JSON.parse(String(event.data())), receipt = String(data.receiptId || "");
        const held = pending[receipt] || [];
        delete pending[receipt];
        const committed = data.settled === true && typeof data.actual === "number" && data.actual > 0;
        const resolved: Result[] = [];
        held.forEach(claim => {
            const state = claim.state;
            if (state.held[receipt] !== claim.uses) return;
            delete state.held[receipt];
            if (committed) state.remaining = Math.max(0, state.remaining - claim.uses);
            const world = event.world();
            const active = state.active && world.valid(world.source()) && world.valid(state.holder)
                && (!state.anchor || MobEffects.matches(world, state.holder, state.anchor))
                && world.effects(state.holder, definition).some(view => view.id() === claim.id);
            resolved.push({ id: claim.id, actor: state.actor, uses: claim.uses, payload: copy(claim.payload), committed, active });
        });
        collect(event.world().tick());
        data.damageBudgets = resolved;
        event.data(JSON.stringify(data));
    });
}
