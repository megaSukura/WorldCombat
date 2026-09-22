/** Source-owned contributions project one native carrier. Content aggregates payloads and chooses when to grant again. */
namespace StatusContributions {
    export interface Owner { id: number; definition: string; target: string; }
    export interface Options { amplifier?: number; owner?: Owner; }
    export interface Contribution<T = any> {
        id: number; source: CombatActor; target: CombatActor; token: string; payload: T; remaining: number;
    }
    interface State { carrier: string; token: string; payload: any; amplifier: number; owner?: Owner; }
    const record = "world_combat:status_contribution", manager = "world_combat:status_carrier";
    const maximum = 1200000;
    const carriers: { [id: string]: boolean } = Object.create(null);

    /** A registered carrier is the projection of its live contributions, including when applied through /effect. */
    export function define(carrier: string): void {
        if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(carrier)) throw new Error("Invalid contribution carrier");
        carriers[carrier] = true;
    }
    function ownerPresent(world: CombatWorld, owner?: Owner): boolean {
        if (!owner) return true;
        const actor = world.actor(owner.target);
        return actor !== null && world.effects(actor, owner.definition).some(view => view.id() === owner.id);
    }
    function views(world: CombatWorld, target: CombatActor, carrier: string): CombatEffectView[] {
        if (!world.valid(target)) return [];
        return world.effects(target, record).filter(view => JSON.parse(String(view.data())).carrier === carrier);
    }
    function active(world: CombatWorld, target: CombatActor, carrier: string): CombatEffectView[] {
        return views(world, target, carrier).filter(view => ownerPresent(world, JSON.parse(String(view.data())).owner));
    }
    /** Only a present native carrier can supply gameplay facts; callers choose their own stacking rule. */
    export function list<T = any>(world: CombatWorld, target: CombatActor, carrier: string): Contribution<T>[] {
        if (!world.valid(target) || MobEffects.read(world, target, carrier) === null) return [];
        return active(world, target, carrier).map(view => {
            const state: State = JSON.parse(String(view.data()));
            return { id: view.id(), source: view.source(), target: view.target(), token: state.token,
                payload: state.payload as T, remaining: view.remaining() };
        });
    }
    function carrierManager(world: CombatWorld, target: CombatActor, carrier: string): CombatEffectView | null {
        const found = world.effects(target, manager).filter(view => JSON.parse(String(view.data())).carrier === carrier);
        return found.length ? found[0] : null;
    }
    function projection(records: CombatEffectView[]): { ticks: number; amplifier: number } {
        let ticks = 1, amplifier = 0;
        records.forEach(view => {
            ticks = Math.max(ticks, view.remaining());
            amplifier = Math.max(amplifier, JSON.parse(String(view.data())).amplifier);
        });
        return { ticks: ticks, amplifier: amplifier };
    }
    function synchronize(world: CombatWorld, target: CombatActor, carrier: string, refresh: boolean): void {
        const current = carrierManager(world, target, carrier);
        if (current) { world.operation(current.id(), "world_combat:reconcile_carrier", JSON.stringify({ refresh: refresh })); return; }
        const records = active(world, target, carrier);
        if (refresh && records.length) {
            const next = projection(records);
            MobEffects.apply(world, target, carrier, next.ticks, next.amplifier);
        }
        // The target's native event creates the manager in its own scope, without borrowing a foreign controller.
    }
    export function upsert(world: CombatWorld, target: CombatActor, carrier: string, token: string,
        payload: any, ticks: number, options: Options = {}): number {
        if (!carriers[carrier] || !token || !isFinite(ticks) || ticks < 1 || ticks > maximum || ticks % 1)
            throw new Error("Invalid status contribution");
        if (!world.valid(target)) return 0;
        // A fresh grant after a native cure starts a new projection, even before the queued removed event arrives.
        if (MobEffects.read(world, target, carrier) === null)
            views(world, target, carrier).forEach(view => world.operation(view.id(), "world_combat:carrier_cleared", "{}"));
        const state: State = { carrier: carrier, token: token, payload: payload, amplifier: options.amplifier || 0 };
        if (options.owner) state.owner = options.owner;
        const source = String(world.source().key());
        const existing = views(world, target, carrier).filter(view => String(view.source().key()) === source
            && JSON.parse(String(view.data())).token === token);
        let id = existing.length ? existing[0].id() : 0;
        if (id) world.operation(id, "world_combat:upsert_contribution", JSON.stringify({ state: state, ticks: ticks }));
        else id = world.effect(record, target, JSON.stringify(state), ticks);
        synchronize(world, target, carrier, true);
        if (MobEffects.read(world, target, carrier) !== null) return id;
        remove(world, target, carrier, token); return 0;
    }
    /** Remove only this caller's token. Other sources may use the same token string. */
    export function remove(world: CombatWorld, target: CombatActor, carrier: string, token: string): boolean {
        const source = String(world.source().key());
        let removed = false;
        views(world, target, carrier).forEach(view => {
            if (String(view.source().key()) === source && JSON.parse(String(view.data())).token === token)
                removed = world.operation(view.id(), "world_combat:remove_contribution", "{}") || removed;
        });
        if (removed) synchronize(world, target, carrier, false);
        return removed;
    }
    /** End one owned domain across its recipients; distant carriers also observe the owner's disappearance. */
    export function removeSource(world: CombatWorld, carrier: string, token: string): number {
        const source = String(world.source().key()), origin = world.observe(world.source());
        let removed = 0;
        if (!origin) return removed;
        world.effectsOfType(record).forEach(view => {
            const state: State = JSON.parse(String(view.data()));
            if (state.carrier !== carrier || state.token !== token || String(view.source().key()) !== source) return;
            const body = world.observe(view.target());
            if (body && body.position().minus(origin.position()).length() <= 64 && remove(world, view.target(), carrier, token)) removed++;
        });
        return removed;
    }
    function owned(effect: CombatEffect): void {
        if (String(effect.caller().key()) !== String(effect.source().key())) effect.reject("effect-not-owned");
    }
    WorldCombat.effect(record, 1, maximum, "actor", function (json) {
        const state: State = JSON.parse(json);
        if (!state || !carriers[state.carrier] || typeof state.token !== "string" || !state.token
            || typeof state.amplifier !== "number" || !isFinite(state.amplifier) || state.amplifier < 0 || state.amplifier % 1
            || state.payload === undefined) throw new Error("Invalid status contribution state");
        return JSON.stringify(state);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(record, "start", function () { });
    WorldCombat.effectHandler(record, "operation:world_combat:upsert_contribution", function (effect) {
        owned(effect);
        const input = JSON.parse(effect.input()), old: State = JSON.parse(effect.state());
        if (input.state.carrier !== old.carrier || input.state.token !== old.token) { effect.reject("contribution-identity-changed"); return; }
        effect.state(JSON.stringify(input.state)); effect.remaining(input.ticks);
    });
    WorldCombat.effectHandler(record, "operation:world_combat:remove_contribution", function (effect) { owned(effect); effect.end(); });
    WorldCombat.effectHandler(record, "operation:world_combat:carrier_cleared", function (effect) {
        const state: State = JSON.parse(effect.state());
        // Native absence is the proof: this operation can retire stale records, never a live carrier's contribution.
        if (MobEffects.read(effect.world(), effect.target(), state.carrier) !== null)
            { effect.reject("carrier-still-present"); return; }
        effect.end();
    });

    function reconcile(effect: CombatEffect, refresh: boolean): void {
        const world = effect.world(), target = effect.target(), state = JSON.parse(effect.state());
        const records = active(world, target, state.carrier);
        if (!records.length) { if (state.lease) MobEffects.release(world, state.lease); effect.end(); return; }
        const next = projection(records);
        if (refresh) MobEffects.apply(world, target, state.carrier, next.ticks, next.amplifier);
        const carrier = MobEffects.read(world, target, state.carrier);
        if (carrier === null) { effect.end(); return; }
        if (!state.lease || !MobEffects.present(world, state.lease)) state.lease = MobEffects.bind(world, target, state.carrier, carrier);
        effect.state(JSON.stringify(state));
        effect.remaining(Math.min(maximum, next.ticks + 2));
        effect.schedule("watch", "watch", 1, "{}");
    }
    WorldCombat.effect(manager, 1, maximum, "actor", function (json) {
        const state = JSON.parse(json);
        if (!state || !carriers[state.carrier]) throw new Error("Unknown status carrier");
        return JSON.stringify(state);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(manager, "start", function (effect) { reconcile(effect, false); });
    WorldCombat.effectHandler(manager, "watch", function (effect) { reconcile(effect, false); });
    WorldCombat.effectHandler(manager, "operation:world_combat:reconcile_carrier", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state()), caller = String(effect.caller().key());
        const requested = JSON.parse(effect.input()).refresh === true;
        const refresh = requested && active(world, effect.target(), state.carrier).some(view => String(view.source().key()) === caller);
        reconcile(effect, refresh);
    });
    WorldCombat.effectHandler(manager, "end", function (effect) {
        const state = JSON.parse(effect.state());
        if (state.lease) MobEffects.release(effect.world(), state.lease);
    });
    function nativeEvent(event: CombatWorldEvent): void {
        const carrier = String(JSON.parse(event.data()).id || "");
        if (!carriers[carrier]) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const current = MobEffects.read(world, target, carrier);
        if (current === null) {
            views(world, target, carrier).forEach(view => world.operation(view.id(), "world_combat:carrier_cleared", "{}"));
            synchronize(world, target, carrier, false); return;
        }
        if (carrierManager(world, target, carrier)) return;
        const records = active(world, target, carrier);
        if (!records.length) { world.removeMobEffect(target, carrier, current.key()); return; }
        world.effect(manager, target, JSON.stringify({ carrier: carrier, lease: 0 }), Math.min(maximum, projection(records).ticks + 2));
    }
    WorldCombat.on("world_combat:status_contributions/added", "world_combat:mob_effect_added", "", nativeEvent);
    WorldCombat.on("world_combat:status_contributions/tick", "world_combat:mob_effect_tick", "", nativeEvent);
    WorldCombat.on("world_combat:status_contributions/removed", "world_combat:mob_effect_removed", "", nativeEvent);
}
