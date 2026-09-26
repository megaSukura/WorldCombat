/** Actor-owned encounter memory. Native targeting and actual hostile actions keep an encounter alive. */
namespace CombatEncounters {
    const memory = "world_combat:encounter";
    interface State {
        used: boolean; active: boolean; entered: number; lastActivity: number; sequence: number;
        opponents: { [ref: string]: string }; fallen: { [death: string]: string };
    }
    export interface View { world: CombatWorld; actor: CombatActor; effect: number; first: boolean; active: boolean; sequence: number; fallen: number; }
    export const views = new WorldContributions.Registry<View>();
    function blank(now: number, sequence = 1): State {
        return { used: false, active: false, entered: now, lastActivity: now, sequence: sequence, opponents: {}, fallen: {} };
    }
    function record(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const entries = world.effects(actor, memory); return entries.length ? entries[0] : null;
    }
    function ensure(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        let value = record(world, actor);
        if (!value && world.valid(actor) && String(actor.key()) === String(world.source().key())) {
            world.effect(memory, actor, JSON.stringify(blank(world.tick())), 1200000); value = record(world, actor);
        }
        return value;
    }
    export function first(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return false;
        const value = record(world, actor); return !value || !JSON.parse(String(value.data())).used;
    }
    export function fallen(world: CombatWorld, actor: CombatActor): number {
        const value = record(world, actor); return value ? Object.keys(JSON.parse(String(value.data())).fallen).length : 0;
    }
    export function active(world: CombatWorld, actor: CombatActor): boolean {
        const value = record(world, actor); return !!value && JSON.parse(String(value.data())).active === true;
    }
    /** A cue has its own effect lifecycle, so consuming and later reopening an entry creates a fresh visual. */
    export function cue(view: View, key: string, scene: string, enabled: boolean): void {
        const world = view.world, entries = world.effects(view.actor, "world_combat:encounter_cue");
        const current = entries.filter(entry => JSON.parse(String(entry.data())).key === key);
        if (!enabled) { current.forEach(entry => world.operation(entry.id(), "world_combat:encounter_cue_stop", "{}")); return; }
        if (current.length) { current.forEach(entry => world.operation(entry.id(), "world_combat:encounter_cue_renew", "{}")); return; }
        world.effect("world_combat:encounter_cue", view.actor, JSON.stringify({ key: key, scene: scene }), 1200000);
    }
    WorldCombat.effect("world_combat:encounter_cue", 1, 1200000, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler("world_combat:encounter_cue", "start", effect => {
        const data = JSON.parse(effect.state()), body = effect.world().observe(effect.target());
        if (!body) { effect.end(); return; }
        WorldFeedback.onEffect(effect.world(), effect.id(), data.key, data.scene, 1, body.position(), { moment: "opening" });
    });
    WorldCombat.effectHandler("world_combat:encounter_cue", "operation:world_combat:encounter_cue_stop", effect => {
        if (String(effect.caller().ref()) === String(effect.source().ref())) effect.end();
    });
    WorldCombat.effectHandler("world_combat:encounter_cue", "operation:world_combat:encounter_cue_renew", effect => {
        if (String(effect.caller().ref()) === String(effect.source().ref())) effect.remaining(1200000);
    });
    function publish(effect: CombatEffect, state: State): void {
        views.apply({ world: effect.world(), actor: effect.target(), effect: effect.id(), first: !state.used,
            active: state.active, sequence: state.sequence, fallen: Object.keys(state.fallen).length });
    }
    function touch(world: CombatWorld, actor: CombatActor, opponent: CombatActor | null, used: boolean): void {
        if (!world.valid(actor)) return;
        const value = ensure(world, actor); if (!value) return;
        world.operation(value.id(), "world_combat:encounter_touch", JSON.stringify({ used: used, opponent: opponent ? String(opponent.ref()) : "" }));
    }
    WorldCombat.effect(memory, 1, 1200000, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(memory, "start", effect => { effect.schedule("watch", "watch", 20, "{}"); publish(effect, JSON.parse(effect.state())); });
    WorldCombat.effectHandler(memory, "operation:world_combat:encounter_touch", effect => {
        const world = effect.world(), state: State = JSON.parse(effect.state()), input = JSON.parse(effect.input());
        state.used = state.used || input.used === true;
        const opponent = input.opponent ? world.actor(input.opponent) : null;
        if (opponent && world.valid(opponent) && !world.friendly(opponent)) {
            state.active = true; state.opponents[String(opponent.ref())] = String(opponent.ref()).split("/")[0];
        }
        state.lastActivity = world.tick(); effect.state(JSON.stringify(state)); publish(effect, state);
    });
    WorldCombat.effectHandler(memory, "watch", effect => {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor), state: State = JSON.parse(effect.state());
        if (!body) { effect.end(); return; }
        const attacking = body.attacking();
        let linked = attacking !== null && world.valid(attacking) && !world.friendly(attacking);
        if (linked && attacking) state.opponents[String(attacking.ref())] = String(attacking.ref()).split("/")[0];
        Object.keys(state.opponents).forEach(ref => {
            const other = world.actor(ref), facts = other && world.observe(other);
            if (facts && facts.attacking() && String(facts.attacking()!.ref()) === String(actor.ref()) && !world.friendly(other!)) linked = true;
        });
        if (linked) { state.active = true; state.lastActivity = world.tick(); }
        if (!linked && world.tick() - state.lastActivity > NativeSemantics.encounterIdle) {
            const next = blank(world.tick(), state.sequence + 1); effect.state(JSON.stringify(next)); publish(effect, next);
        } else { effect.state(JSON.stringify(state)); publish(effect, state); }
        effect.remaining(1200000); effect.schedule("watch", "watch", 20, "{}");
    });
    WorldCombat.on("world_combat:encounter/bound", "world_combat:actor_bound", "", event => { ensure(event.world(), event.actor()); });
    WorldCombat.on("world_combat:encounter/loaded", "world_combat:actor_tick", "", event => {
        if (event.world().tick() % 20 === 0) ensure(event.world(), event.actor());
    });
    WorldCombat.on("world_combat:encounter/commit", "world_combat:committed", "", event => {
        const world = event.world(), actor = event.actor(), target = event.target();
        const opponent = target && world.valid(target) && !world.friendly(target) ? target : null;
        touch(world, actor, opponent, true);
        if (opponent) touch(world, opponent, actor, false);
    });
    WorldCombat.on("world_combat:encounter/native", "world_combat:damage_incoming", "", event => {
        const world = event.world(), actor = event.actor(), target = event.target(), data = JSON.parse(String(event.data()));
        if (!target || !world.valid(actor) || !world.valid(target) || world.friendly(target) || !DamageSemantics.read(data).attack) return;
        touch(world, actor, target, true); touch(world, target, actor, false);
    });
    WorldCombat.on("world_combat:encounter/death", "world_combat:actor_died", "", event => {
        const world = event.world(), value = record(world, event.actor()), data: CombatNativeDeathFacts = JSON.parse(String(event.data()));
        if (!value || !data.friendly || data.self) return;
        const state: State = JSON.parse(String(value.data()));
        if (!state.active || data.tick < state.entered || state.fallen[data.deathId]) return;
        const enemies = Object.keys(state.opponents).map(ref => state.opponents[ref]);
        if ([data.sourceEntity, data.attackingEntity, data.lastAttackerEntity].every(entity => !entity || enemies.indexOf(entity) < 0)) return;
        world.operation(value.id(), "world_combat:encounter_fallen", JSON.stringify(data));
    });
    WorldCombat.effectHandler(memory, "operation:world_combat:encounter_fallen", effect => {
        const state: State = JSON.parse(effect.state()), data: CombatNativeDeathFacts = JSON.parse(effect.input());
        state.fallen[data.deathId] = data.identity; effect.state(JSON.stringify(state)); publish(effect, state);
    });
}
