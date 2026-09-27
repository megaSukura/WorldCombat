/** Temporary copies of observed native attributes. Each layer owns only its modifiers; native base values stay intact. */
namespace CombatCopies {
    export type Values = { [attribute: string]: number };
    interface Contribution { amount: number; operation: "add_value" | "add_multiplied_total"; }
    type Contributions = { [attribute: string]: Contribution };
    /** Synchronous preparation for one source's copy; discard if its independent new carrier is refused. */
    export interface Prepared { actor: CombatActor; id: number; expected: string; values: Values; ticks: number; source: string; fresh: boolean; }
    interface Replacement { plan: Prepared; commit: boolean; carrier?: MobEffects.Anchor; accepted: boolean; }
    const replacements: Replacement[] = [];
    export const attack = "minecraft:generic.attack_damage", speed = "minecraft:generic.movement_speed";
    export const defence = ["minecraft:generic.armor", "minecraft:generic.armor_toughness", "minecraft:generic.knockback_resistance"];
    export const attributes = [attack, speed].concat(defence);
    const definition = "world_combat:attribute_copy", resistance = "world_combat:damage_type_resistance";
    // EffectRegistry's public lifetime limit. Requests outside the host contract fail rather than being shortened.
    const maximumTicks = 1200000;
    function duration(ticks: number): number {
        if (!isFinite(ticks) || ticks < 1 || ticks % 1 || ticks > maximumTicks) throw new Error("Invalid combat copy duration");
        return ticks;
    }
    function validValues(values: Values): void {
        Object.keys(values).forEach(id => {
            if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id) || typeof values[id] !== "number" || !isFinite(values[id])) throw new Error("Invalid copied attribute");
        });
    }
    export function read(world: CombatWorld, actor: CombatActor, selected: string[] = attributes): Values {
        const values: Values = {};
        selected.forEach(id => { const attribute = world.attributeValue(actor, id); if (attribute) values[id] = attribute.value(); });
        return values;
    }
    export function differs(world: CombatWorld, actor: CombatActor, values: Values): boolean {
        return Object.keys(values).some(id => { const own = world.attributeValue(actor, id); return own !== null && Math.abs(own.value() - values[id]) > 0.0001; });
    }
    export function clear(world: CombatWorld, actor: CombatActor, source: string): void {
        world.effects(actor, definition).forEach(view => { if (JSON.parse(String(view.data())).source === source) world.operation(view.id(), "world_combat:dispel", "{}"); });
    }
    /** Ratios/deltas are fixed at application; later equipment and effects keep contributing and removal reveals current native values. */
    export function apply(world: CombatWorld, actor: CombatActor, values: Values, ticks: number, source: string, carrier?: MobEffects.Anchor): number {
        duration(ticks); validValues(values);
        clear(world, actor, source);
        return world.effect(definition, actor, JSON.stringify({ values, source, carrier }), ticks);
    }
    /** Owns a fixed additive contribution, compensated for native multipliers at application. Later equipment
     * remains independent. A zero native slope or attribute range that prevents the requested result refuses the layer. */
    export function equalize(world: CombatWorld, actor: CombatActor, values: Values, ticks: number, source: string, carrier?: MobEffects.Anchor): number {
        duration(ticks); validValues(values);
        clear(world, actor, source);
        const id = world.effect(definition, actor, JSON.stringify({ values, source, carrier, additive: true }), ticks);
        return id > 0 && world.effects(actor, definition).some(view => view.id() === id) ? id : -1;
    }
    /** Keep the current source layer and its exact modifiers while validating its replacement. Native
     * attribute writes only dirty their native maps; the synchronous probe restores every owned modifier
     * before returning or running a carrier's native gates. Other sources and equipment are included. */
    export function prepare(world: CombatWorld, actor: CombatActor, values: Values, ticks: number, source: string): Prepared | null {
        duration(ticks); validValues(values);
        const previous = world.effects(actor, definition).filter(view => JSON.parse(String(view.data())).source === source);
        if (previous.length > 1) return null;
        const fresh = previous.length === 0;
        const id = fresh ? world.effect(definition, actor, JSON.stringify({ values: {}, source, pending: true, contributions: {} }), ticks) : previous[0].id();
        const view = world.effects(actor, definition).filter(view => view.id() === id)[0];
        if (!view) return null;
        const plan: Prepared = { actor, id, expected: String(view.data()), values: JSON.parse(JSON.stringify(values)), ticks, source, fresh };
        const request: Replacement = { plan, commit: false, accepted: false };
        replacements.push(request);
        try { world.operation(id, "world_combat:copy_replace", "{}"); }
        finally { replacements.pop(); }
        if (!request.accepted) { discard(world, plan); return null; }
        return plan;
    }
    /** Commit under the same native modifier owner, excluding its old contribution from every baseline.
     * The caller keeps the old carrier until success and supplies a separately established new carrier.
     * A stale layer, missing attribute, native clamp/zero slope or stale carrier preserves the old layer. */
    export function replace(world: CombatWorld, plan: Prepared, carrier?: MobEffects.Anchor): number {
        if (carrier && !MobEffects.matches(world, plan.actor, carrier)) { discard(world, plan); return -1; }
        const request: Replacement = { plan, carrier, commit: true, accepted: false };
        replacements.push(request);
        try { world.operation(plan.id, "world_combat:copy_replace", "{}"); }
        finally { replacements.pop(); }
        if (!request.accepted) { discard(world, plan); return -1; }
        return plan.id;
    }
    export function discard(world: CombatWorld, plan: Prepared): void {
        if (!plan.fresh) return;
        const view = world.effects(plan.actor, definition).filter(view => view.id() === plan.id)[0];
        if (view && String(view.data()) === plan.expected) world.operation(plan.id, "world_combat:dispel", "{}");
    }
    WorldCombat.effect(definition, 1, maximumTicks, "actor", function (json) {
        const value = JSON.parse(json), values = value.values || {};
        if (typeof value.source !== "string" || value.carrier && !MobEffects.validAnchor(value.carrier)) throw new Error("Invalid attribute copy owner");
        if (value.pending !== undefined && typeof value.pending !== "boolean") throw new Error("Invalid pending copy");
        validValues(values);
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function watch(effect: CombatEffect): void {
        const state = JSON.parse(effect.state());
        if (state.pending) { effect.end(); return; }
        if (state.carrier && !MobEffects.matches(effect.world(), effect.target(), state.carrier)) { effect.end(); return; }
        if (state.carrier) effect.schedule("carrier", "carrier", 1, "{}");
    }
    WorldCombat.effectHandler(definition, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (state.pending) { effect.schedule("carrier", "carrier", 1, "{}"); return; }
        const contributions: Contributions = {};
        function put(id: string, amount: number, operation: "add_value" | "add_multiplied_total"): boolean {
            const written = world.attribute(actor, id, amount, operation);
            if (written) contributions[id] = { amount, operation };
            return written;
        }
        let applied = true;
        Object.keys(state.values).forEach(id => {
            const current = world.attributeValue(actor, id); if (!current) { if (state.additive) applied = false; return; }
            if (state.additive) {
                const slope = current.additionMultiplier();
                if (!isFinite(slope) || Math.abs(slope) < 1e-12) { if (Math.abs(current.value() - state.values[id]) > 1e-6) applied = false; return; }
                if (!put(id, (state.values[id] - current.unclampedValue()) / slope, "add_value")) { applied = false; return; }
                const actual = world.attributeValue(actor, id);
                if (!actual || Math.abs(actual.value() - state.values[id]) > 1e-5) applied = false;
            }
            else if (current.value() > 0) put(id, state.values[id] / current.value() - 1, "add_multiplied_total");
            else if (state.values[id] !== current.value()) {
                const slope = current.additionMultiplier();
                if (!isFinite(slope) || Math.abs(slope) < 1e-12
                    || !put(id, (state.values[id] - current.unclampedValue()) / slope, "add_value")) applied = false;
            }
        });
        if (!applied) { effect.end(); return; }
        state.contributions = contributions; effect.state(JSON.stringify(state));
        if (state.carrier) MobEffects.bind(world, actor, state.carrier.id);
        watch(effect);
    });
    WorldCombat.effectHandler(definition, "carrier", watch);
    WorldCombat.effectHandler(definition, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(definition, "operation:world_combat:copy_replace", effect => {
        const request = replacements[replacements.length - 1];
        if (!request || request.plan.id !== effect.id() || String(request.plan.actor.key()) !== String(effect.target().key())
            || String(effect.state()) !== request.plan.expected) return;
        const world = effect.world(), actor = effect.target(), plan = request.plan, old = JSON.parse(plan.expected);
        // Layers created by this library retain exact coefficients. An unknown older record is preserved.
        if (!old.contributions || old.source !== plan.source || request.carrier && !MobEffects.matches(world, actor, request.carrier)) return;
        const previous: Contributions = old.contributions, candidate: Contributions = {}, keys = Object.keys(previous);
        Object.keys(plan.values).forEach(id => { if (keys.indexOf(id) < 0) keys.push(id); });
        for (const id of keys) {
            const base = world.attributeValue(actor, id, true);
            if (!base) return;
            let amount = 0;
            if (plan.values[id] !== undefined) {
                const slope = base.additionMultiplier();
                if (!isFinite(slope) || Math.abs(slope) < 1e-12) { if (Math.abs(base.value() - plan.values[id]) > 1e-6) return; }
                else amount = (plan.values[id] - base.unclampedValue()) / slope;
                if (!isFinite(amount)) return;
            }
            candidate[id] = { amount, operation: "add_value" };
        }
        let committed = false;
        try {
            for (const id of keys) if (!world.attribute(actor, id, candidate[id].amount, candidate[id].operation)) return;
            for (const id of Object.keys(plan.values)) {
                const actual = world.attributeValue(actor, id);
                if (!actual || Math.abs(actual.value() - plan.values[id]) > 1e-5) return;
            }
            if (!request.commit) { request.accepted = true; return; }
            const next: any = { values: plan.values, source: plan.source, additive: true, contributions: candidate };
            if (request.carrier) next.carrier = request.carrier;
            if (!world.compareEffectStates(JSON.stringify({ updates: [{ id: effect.id(), expected: plan.expected, data: JSON.stringify(next) }] }))) return;
            committed = true; effect.remaining(plan.ticks);
            if (request.carrier) MobEffects.bind(world, actor, request.carrier.id);
            watch(effect); request.accepted = true;
        } finally {
            if (!committed) keys.forEach(id => {
                const restore = previous[id];
                world.attribute(actor, id, restore ? restore.amount : 0, restore ? restore.operation : "add_value");
            });
        }
    });

    /** Content supplies exact native damage ids and the multiplier; unrelated incoming damage stays unchanged. */
    export function resist(world: CombatWorld, actor: CombatActor, types: string[], fraction: number, ticks: number, source: string): number {
        duration(ticks);
        world.effects(actor, resistance).forEach(view => { if (JSON.parse(String(view.data())).source === source) world.operation(view.id(), "world_combat:dispel", "{}"); });
        return world.effect(resistance, actor, JSON.stringify({ types, fraction, source }), ticks);
    }
    WorldCombat.effect(resistance, 1, maximumTicks, "actor", function (json) {
        const value = JSON.parse(json);
        if (!Array.isArray(value.types) || value.types.some((id: any) => typeof id !== "string" || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id))
            || !isFinite(value.fraction) || value.fraction < 0 || value.fraction > 1 || typeof value.source !== "string") throw new Error("Invalid damage resistance");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(resistance, "start", effect => effect.listen("world_combat:incoming", "world_combat:intercept", "hit"));
    WorldCombat.effectHandler(resistance, "hit", function (effect) {
        const event = effect.event(); if (event.target().key() !== effect.target().key()) return;
        const damage = JSON.parse(event.payload()), state = JSON.parse(effect.state());
        if (damage.scripted === true || damage.kind || state.types.indexOf(String(damage.damageType)) < 0 || !(damage.amount > 0)) return;
        damage.amount *= state.fraction; event.payload(JSON.stringify(damage));
    });
    WorldCombat.effectHandler(resistance, "operation:world_combat:dispel", effect => effect.end());
}
