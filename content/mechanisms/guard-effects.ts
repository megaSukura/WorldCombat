/** Finite defence composes with the existing incoming-damage protocol. Recipes own its meaning. */
namespace GuardEffects {
    export interface State {
        rule: string; mode: "pool" | "survive" | "ward"; capacity: number; fraction: number;
        minimumHealth: number; charges: number; linkRange: number;
        /** Extensible category so guard-breakers can tell a protection barrier from an enhancement guard. */
        category?: string;
        /** Optional: this guard also turns away enemy status moves against its target (see NativeEffects). */
        statusWard?: boolean;
    }
    export interface Rule {
        pulse?: (effect: CombatEffect, state: State) => void;
        accepts?: (effect: CombatEffect, state: State, incoming: Incoming) => boolean;
        guarded?: (effect: CombatEffect, state: State, amount: number, incoming: Incoming) => void;
    }
    /** Snapshot of this interception, including arbitrary damage metadata and the original protocol context. */
    export interface Incoming {
        world: CombatWorld; source: CombatActor; target: CombatActor; event: CombatEffectEvent;
        amount: number; remaining: number; data: any;
    }
    /** Default category: a physical barrier a breaker may strip. Enhancement guards declare another category. */
    export var protection = "world_combat:guard-category/protection";
    /** Identity of the shared family counter raised by the protection moves on consecutive use. */
    export var stallKey = "guard_stall";
    /** Shared consecutive-use count from the family counter; each move still owns its reset window and cost. */
    export function stall(previous: any, now: number, window: number): number {
        return previous && typeof previous.stall === "number" && now - (previous.at || 0) <= window ? previous.stall : 0;
    }
    var rules: { [id: string]: Rule } = Object.create(null);
    export function register(id: string, rule: Rule): void {
        if (rules[id]) throw new Error("Duplicate defence rule: " + id);
        rules[id] = rule;
    }
    function normalize(json: string): string {
        var value: State = JSON.parse(json);
        if (!rules[value.rule] || ["pool", "survive", "ward"].indexOf(value.mode) < 0) throw new Error("Unknown defence rule");
        [value.capacity, value.fraction, value.minimumHealth, value.charges, value.linkRange].forEach(function (number) {
            if (typeof number !== "number" || !isFinite(number) || number < 0) throw new Error("Invalid defence value");
        });
        if (value.fraction > 1 || value.charges > 32 || value.charges % 1 || value.linkRange > 32)
            throw new Error("Defence budget exceeded");
        if (value.category !== undefined && (typeof value.category !== "string" || !/^[a-z0-9_:/-]{1,64}$/.test(value.category))) throw new Error("Invalid defence category");
        if (value.statusWard !== undefined && typeof value.statusWard !== "boolean") throw new Error("Invalid status ward");
        return JSON.stringify(value);
    }
    export function apply(world: CombatWorld, target: CombatActor, state: State, ticks: number): number {
        return world.effect("world_combat:guard", target, normalize(JSON.stringify(state)), ticks);
    }
    export function has(world: CombatWorld, target: CombatActor, rule: string): boolean {
        return world.effects(target, "world_combat:guard").some(function (effect) {
            var state: State = JSON.parse(effect.data()); return state.rule === rule && !exhausted(state);
        });
    }
    /** Live guard effects on a target that a breaker should treat as protection barriers (not enhancement guards). */
    export function barriers(world: CombatWorld, target: CombatActor): readonly CombatEffectView[] {
        return world.effects(target, "world_combat:guard").filter(function (view) {
            try { var state: State = JSON.parse(String(view.data())); return (state.category || protection) === protection && !exhausted(state); }
            catch (error) { return true; }
        });
    }
    function exhausted(state: State): boolean { return state.mode === "pool" ? state.capacity <= 0 : state.charges <= 0; }
    function connected(effect: CombatEffect, state: State): boolean {
        var world = effect.world(), source = world.observe(effect.source()), target = world.observe(effect.target());
        return !!source && !!target && world.friendly(effect.target()) && (!state.linkRange ||
            source.position().minus(target.position()).length() <= state.linkRange && world.clear(source.position(), target.position()));
    }
    WorldCombat.effect("world_combat:guard", 1, 1200, "actor", normalize, EffectProtocols.unchanged);
    WorldCombat.effectHandler("world_combat:guard", "start", function (effect) {
        effect.listen("world_combat:incoming", "world_combat:intercept", "intercept");
        effect.schedule("pulse", "pulse", 1, "{}");
    });
    WorldCombat.effectHandler("world_combat:guard", "pulse", function (effect) {
        var state: State = JSON.parse(effect.state());
        if (!connected(effect, state) || exhausted(state)) { effect.end(); return; }
        effect.schedule("pulse", "pulse", 8, "{}");
        var rule = rules[state.rule]; if (rule.pulse) rule.pulse(effect, state);
    });
    WorldCombat.effectHandler("world_combat:guard", "intercept", function (effect) {
        var event = effect.event(); if (String(event.target().ref()) !== String(effect.target().ref())) return;
        var state: State = JSON.parse(effect.state());
        if (!connected(effect, state)) { effect.end(); return; }
        var damage = JSON.parse(event.payload()), amount = damage.amount;
        if (typeof amount !== "number" || !isFinite(amount) || amount <= 0) return;
        var rule = rules[state.rule], incoming: Incoming = { world: effect.world(), source: event.source(), target: event.target(),
            event: event, amount: amount, remaining: amount, data: damage };
        if (rule.accepts && !rule.accepts(effect, state, incoming)) return;
        var blocked = 0;
        if (state.mode === "pool") {
            blocked = Math.min(state.capacity, amount * state.fraction);
            state.capacity -= blocked;
        } else if (state.mode === "ward") {
            // A hit-count ward: each accepted hit spends one charge and is turned aside whole.
            if (state.charges > 0) { blocked = amount; state.charges--; }
        } else if (state.charges > 0) {
            var body = effect.world().observe(effect.target())!;
            if (amount >= body.health()) {
                blocked = Math.max(0, amount - Math.max(0, body.health() - state.minimumHealth));
                state.charges--;
            }
        }
        if (blocked <= 0) return;
        damage.amount = Math.max(0, amount - blocked); event.payload(JSON.stringify(damage));
        incoming.remaining = damage.amount;
        effect.state(JSON.stringify(state));
        // A callback may end its effect. Arrange exhausted cleanup first and leave it the final operation.
        if (exhausted(state)) { if (rule.guarded) effect.remaining(1); else { effect.end(); return; } }
        if (rule.guarded) rule.guarded(effect, state, blocked, incoming);
    });
    WorldCombat.effectHandler("world_combat:guard", "operation:world_combat:dispel", function (effect) { effect.end(); });
}
