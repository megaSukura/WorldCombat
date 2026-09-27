/** Results of committed offensive executions. Pending actions have no inferred miss deadline. */
namespace ExecutionOutcomes {
    export interface Result {
        origin: string; instance: number; content: string; started: number; ended: number | null;
        status: "pending" | "hit" | "miss" | "unknown"; reason: string; native: boolean;
        completion: "action" | "external";
    }
    /** Mixed damage/support moves declare the selected branch here, using committed action data.
     * Ordinary physical/special metadata already declares offense; target input kind is not evidence. */
    export interface Intent extends MoveExecutions.Commit { offensive: boolean; completion: "action" | "external"; }
    export const intentions = new WorldContributions.Registry<Intent>();
    export interface View { world: CombatWorld; actor: CombatActor; result: Result | null; }
    /** Writable observations owned by this actor's finite memory carrier; consumers may publish cues. */
    export const views = new WorldContributions.Registry<View>();
    interface Record extends Result { actor: string; hostEnded: boolean; prior: Record | null; }
    interface Memory { effect: number; origin: string; latest: Record | null; active: { [instance: string]: Record }; }
    const carrier = "world_combat:execution_outcome_memory", snapshot = "world_combat:execution_outcome/previous";
    const memories: { [actor: string]: Memory } = Object.create(null);
    const actions: { [instance: string]: Record } = Object.create(null);
    const lifetime = 1200000;
    function copy(value: Result | null): Result | null {
        return value === null ? null : { origin: value.origin, instance: value.instance, content: value.content,
            started: value.started, ended: value.ended, status: value.status, reason: value.reason, native: value.native, completion: value.completion };
    }
    function recent(value: Result | null, now: number, maximumAge: number): Result | null {
        if (!value || value.ended !== null && now - value.ended > maximumAge) return null;
        return copy(value);
    }
    function memory(world: CombatWorld, actor: CombatActor): Memory | null {
        if (!world.valid(actor)) return null;
        const entry = memories[String(actor.ref())];
        return entry && world.effects(actor, carrier).some(effect => effect.id() === entry.effect) ? entry : null;
    }
    /** Latest offensive commitment, including pending/unknown. Support commitments leave it alone. */
    export function latest(world: CombatWorld, actor: CombatActor, maximumAge = 1200): Result | null {
        const entry = memory(world, actor);
        return recent(entry ? entry.latest : null, world.tick(), maximumAge);
    }
    /** The prior result is frozen at this host action's commitment. During preparation it remains a live preview. */
    export function previous(action: CombatAction, maximumAge = 1200): Result | null {
        const host = LivingActions.host(action), stored = host.data(snapshot);
        if (stored === null) return latest(action.sense(), action.actor(), maximumAge);
        const value = JSON.parse(stored);
        return recent(value.result, value.tick, maximumAge);
    }
    /** Complete this origin's direct offensive work from its writable action/effect scope.
     * External projectiles/traps declare completion:'external' and call once their payload can no longer hit.
     * A late-selected support branch can withdraw an unlanded offense; actual damage cannot be erased.
     * This changes no other execution, and residual/indirect damage never supplies a successful result. */
    export function settle(world: CombatWorld, result: "complete" | "support" = "complete"): boolean {
        const entry = memory(world, world.source()), origin = world.originInstance();
        if (!entry || !origin) return false;
        const keys = Object.keys(entry.active);
        let record: Record | null = null;
        keys.some(id => { if (entry.active[id].origin === origin) { record = entry.active[id]; return true; } return false; });
        if (record === null) return false;
        const current = record as Record;
        if (result === "support" && current.status === "hit") return false;
        delete entry.active[String(current.instance)]; delete actions[String(current.instance)];
        if (result === "support") {
            if (entry.latest === current) entry.latest = current.prior;
            Object.keys(entry.active).forEach(id => { if (entry.active[id].prior === current) entry.active[id].prior = current.prior; });
        } else {
            current.ended = world.tick(); current.reason = "settled";
            if (current.status !== "hit") current.status = "miss";
        }
        current.prior = null;
        views.apply({ world, actor: world.source(), result: copy(entry.latest) });
        return true;
    }
    WorldCombat.effect(carrier, 1, lifetime, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(carrier, "start", effect => {
        const actor = String(effect.target().ref());
        memories[actor] = { effect: effect.id(), origin: effect.world().originInstance(), latest: null, active: Object.create(null) };
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(carrier, "watch", effect => {
        const world = effect.world(), actor = effect.target(), entry = memories[String(actor.ref())];
        if (!entry || entry.effect !== effect.id()) { effect.end(); return; }
        const result = latest(world, actor);
        views.apply({ world, actor, result });
        if (!result && Object.keys(entry.active).length === 0) { effect.end(); return; }
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(carrier, "operation:world_combat:execution_outcome_renew", effect => {
        if (String(effect.caller().ref()) === String(effect.target().ref())) effect.remaining(lifetime);
    });
    WorldCombat.effectHandler(carrier, "end", effect => {
        const actor = String(effect.target().ref()), entry = memories[actor];
        if (!entry || entry.effect !== effect.id()) return;
        Object.keys(entry.active).forEach(id => { if (actions[id] === entry.active[id]) delete actions[id]; });
        delete memories[actor];
    });
    MoveExecutions.committed.define({ id: "world_combat:execution_outcomes/commit", apply: commitment => {
        const world = commitment.world, actor = commitment.actor, origin = world.originInstance();
        if (!origin || !world.valid(actor)) return;
        const intent = intentions.apply({ world, actor, action: commitment.action, metadata: commitment.metadata,
            native: commitment.native, offensive: commitment.metadata.some(data => DamageSemantics.directOffense(data)), completion: "action" });
        if (!intent.offensive) return;
        let entry = memory(world, actor);
        if (!entry) {
            world.effect(carrier, actor, "{}", lifetime);
            entry = memory(world, actor);
        }
        if (!entry) return;
        const action = commitment.action === null ? null : LivingActions.host(commitment.action);
        if (action) action.data(snapshot, JSON.stringify({ tick: world.tick(), result: copy(entry.latest) }));
        const record: Record = { actor: String(actor.ref()), origin, instance: action ? action.id() : 0,
            content: action ? action.content() : String(commitment.metadata[0] && commitment.metadata[0].damageType || ""),
            started: world.tick(), ended: commitment.native ? world.tick() : null,
            status: commitment.native ? "unknown" : "pending", reason: "", native: commitment.native,
            completion: intent.completion, hostEnded: commitment.native, prior: commitment.native ? null : entry.latest };
        // Once superseded, a finished host's later carriers cannot affect the new result.
        Object.keys(entry.active).forEach(id => {
            if (entry!.active[id].hostEnded) { entry!.active[id].prior = null; delete entry!.active[id]; }
        });
        entry.latest = record;
        if (action) { entry.active[String(action.id())] = record; actions[String(action.id())] = record; }
        world.operation(entry.effect, "world_combat:execution_outcome_renew", "{}");
        views.apply({ world, actor, result: copy(record) });
    } });
    WorldCombat.on("world_combat:execution_outcomes/hit", "world_combat:damage_applied", "", event => {
        const world = event.world(), data = JSON.parse(String(event.data())), target = event.target();
        if (!(data.actual > 0) || !DamageSemantics.directOffense(data) || !target
            || String(target.ref()) === String(event.actor().ref())) return;
        const entry = memory(world, event.actor());
        if (!entry) return;
        const record = data.action ? entry.active[String(data.action)] : entry.latest;
        if (!record || record.origin !== String(data.originInstance || "") || record.instance !== Number(data.action || 0)) return;
        // Only a still-live host action, or this native delivery, can settle its own result.
        // Residuals, older actions and effects that outlive their host never rewrite a newer commitment.
        if (!record.native && record.ended !== null && record.status !== "unknown") return;
        record.status = "hit";
    });
    WorldCombat.on("world_combat:execution_outcomes/end", "world_combat:action_ended", "", event => {
        const data = JSON.parse(String(event.data())), id = String(data.instance), record = actions[id];
        if (!record) return;
        delete actions[id];
        const entry = memories[record.actor];
        if (String(event.actor().ref()) !== record.actor || !data.committed || String(data.originInstance || "") !== record.origin) {
            if (entry) delete entry.active[id];
            return;
        }
        record.hostEnded = true; record.reason = String(data.reason || "");
        const technical = ["script-error", "content-reloaded", "content-unavailable", "actor-left"].indexOf(record.reason) >= 0;
        const world = event.world(), actor = event.actor();
        const ownObserver = entry && entry.origin === record.origin && world.valid(actor)
            && world.effects(actor, carrier).some(effect => effect.id() === entry.effect) ? 1 : 0;
        const pending = typeof data.pendingEffects === "number" ? Math.max(0, data.pendingEffects - ownObserver) : null;
        const waiting = !technical && (record.completion === "external" || pending !== 0);
        if (waiting && record.status !== "hit") {
            // Missing effect-count receipts are unknown as well; old hosts cannot prove execution completion.
            record.status = record.completion === "external" ? "pending" : "unknown";
            if (entry && entry.latest !== record) delete entry.active[id];
            return;
        }
        record.prior = null;
        if (entry) delete entry.active[id];
        record.ended = event.world().tick();
        if (record.status !== "hit") record.status = technical ? "unknown" : "miss";
    });
}
