/** Native facts remain native; this package owns their world-combat interpretation. */
namespace NativeEffects {
    // A clock owner (the Minecraft effect mirrored to this status) suspends the native wild seconds countdown.
    var statusClocks: { [id: string]: (world: CombatWorld, actor: CombatActor) => boolean } = {};
    export function statusClock(id: string, owns: (world: CombatWorld, actor: CombatActor) => boolean): void {
        if (statusClocks[id]) throw new Error("Duplicate native status clock: " + id);
        statusClocks[id] = owns;
    }
    export interface State {
        stages: { [stat: string]: number }; flags: { [name: string]: number }; statusKey: string;
        toxic: number; pulse: number; lastHit: number; used: string; usedTick: number; repeats: number;
        ability: string; types: string; lock: string; entered: boolean;
        usedKey?: string; usedSlot?: number; usedSource?: string;
        layers?: NativeModifiers.Layers;
    }
    export interface Move {
        type: string; category: string; power: number; contact?: boolean; punch?: boolean; bite?: boolean;
        /** Authored area delivery; independent from contact (an area strike may still touch its recipients). */
        area?: boolean;
        sound?: boolean; slice?: boolean; pulse?: boolean; recoil?: number; drain?: number;
        status?: string; chance?: number; critical?: boolean; accuracy?: number; priority?: number;
        /** Secondary-status duration in ticks; `statusOptions` is the richer route (ticks + immunity/unique flags). */
        statusTicks?: number; statusOptions?: StatusOptions;
        flags?: { [name: string]: boolean };
    }
    /** Options for a secondary status carried on a damaging hit; the shared route reads them without throwing. */
    export interface StatusOptions {
        ticks?: number; amplifier?: number; beneficial?: boolean; unique?: boolean;
        ignoreAbility?: boolean; ignoreType?: boolean; effect?: string;
    }
    export interface Hit { world: CombatWorld; source: CombatActor; target: CombatActor; data: any; }
    /** Shared hit policies run for every living domain; native traits remain separate contributions. */
    export var incomingRules = new WorldContributions.Registry<Hit>();
    export var appliedRules = new WorldContributions.Registry<Hit>();
    export function empty(): State {
        return { stages: {}, flags: {}, statusKey: "", toxic: 1, pulse: 0, lastHit: -1000,
            used: "", usedTick: -1000, repeats: 0, ability: "", types: "", lock: "", entered: false };
    }
    function normalize(json: string): string {
        var value: State = JSON.parse(json);
        delete value.layers;
        if (!value.stages || !value.flags || typeof value.statusKey !== "string" || typeof value.used !== "string" ||
            typeof value.ability !== "string" || typeof value.types !== "string" || typeof value.lock !== "string") throw new Error("Invalid native effect state");
        [value.toxic, value.pulse, value.lastHit, value.usedTick, value.repeats].forEach(function (n) { if (typeof n !== "number" || !isFinite(n)) throw new Error("Invalid native counter"); });
        Object.keys(value.stages).forEach(function (key) { if (["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"].indexOf(key) < 0 || Math.abs(value.stages[key]) > 6) throw new Error("Invalid stat stage"); });
        return JSON.stringify(value);
    }
    function model(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        var values = world.effects(actor, "cobblemon_world_combat:individual"); return values.length ? values[0] : null;
    }
    export function read(world: CombatWorld, actor: CombatActor): State {
        if(String(actor.domain())!=="cobblemon") {
            var common=empty();common.stages=CombatStages.read(world,actor);
            // Owned temporary windows reach combat through `stage`/`effectiveStage`, not the persistent snapshot.
            common.layers = <any>{ stages: CombatStages.windows(world, actor) };
            return common;
        }
        var value = model(world, actor), state: State = value === null ? empty() : JSON.parse(String(value.data()));
        state.layers = NativeModifiers.read(world, actor); return state;
    }
    export function write(world: CombatWorld, actor: CombatActor, state: State): void {
        if(String(actor.domain())!=="cobblemon") { CombatStages.replace(world,actor,state.stages);return; }
        var value = model(world, actor); if (value !== null) world.operation(value.id(), "cobblemon_world_combat:update", JSON.stringify(state));
    }
    /** Last committed native invocation during this bound actor's lifetime; key/slot identify the paying slot. */
    export function lastMove(world: CombatWorld, actor: CombatActor): { id: string; source: string; key: string; slot: number; tick: number } | null {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return null;
        var state = read(world, actor);
        return state.used ? { id: state.used, source: state.usedSource || state.used, key: state.usedKey || "",
            slot: state.usedSlot === undefined ? -1 : state.usedSlot, tick: state.usedTick } : null;
    }
    export function ability(pokemon: CombatPokemon, state: State): string { return String(state.flags.suppressed || state.layers && state.layers.suppressAbility ? "" : state.layers && state.layers.ability || state.ability || String(pokemon.ability())); }
    export function item(pokemon: CombatPokemon, state: State): string { return state.flags.itemsSuppressed || state.layers && state.layers.suppressItems ? "" : String(pokemon.heldItem()).replace("cobblemon:", ""); }
    export function stage(state: State, stat: string): number { return Math.max(-6, Math.min(6, (state.stages[stat] || 0) + (state.layers && state.layers.stages && state.layers.stages[stat] || 0))); }
    export function stat(pokemon: CombatPokemon, state: State, id: string): number { return state.layers && state.layers.stats && state.layers.stats[id] || pokemon.stat(id); }
    export function effectiveStat(pokemon: CombatPokemon, state: State, id: string): number { return stat(pokemon,state,id)*multiplier(stage(state,id)); }
    export function types(pokemon: CombatPokemon, state: State): string[] {
        if (state.layers && state.layers.types) return state.layers.types;
        if (state.types) return state.types.split(",");
        var result: string[] = []; for (var i = 0; i < pokemon.typeCount(); i++) result.push(String(pokemon.type(i))); return result;
    }
    function hasType(pokemon: CombatPokemon, type: string, state?: State): boolean {
        return types(pokemon, state || empty()).indexOf(type) >= 0;
    }
    export function multiplier(stage: number): number { return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage); }
    /** Effective stage for any domain: native stages for Pokemon, the shared ladder for every other body. */
    export function effectiveStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        if (String(actor.domain()) !== "cobblemon") return CombatStages.stage(world, actor, stat);
        return stage(read(world, actor), stat);
    }
    /** Attacker precision and defender evasion feed the hit model; both read the shared accuracy ladder. */
    export function precision(world: CombatWorld, actor: CombatActor): number { return CombatStages.accuracyMultiplier(effectiveStage(world, actor, "accuracy")); }
    export function evasion(world: CombatWorld, actor: CombatActor): number { return CombatStages.accuracyMultiplier(effectiveStage(world, actor, "evasion")); }
    /** Actual unaimed hit chance for `attacker` against `defender`, from the shared accuracy/evasion ladder. */
    export function hitChance(world: CombatWorld, attacker: CombatActor, defender: CombatActor): number {
        return CombatStages.hitChance(precision(world, attacker), evasion(world, defender));
    }
    export function boost(world: CombatWorld, actor: CombatActor, stat: string, amount: number, ignoreAbility?: boolean,
        source?: string, reason?: string): number {
        if (!world.valid(actor)) return 0;
        var before = effectiveStage(world, actor, stat);
        var plan = CombatStages.plan(world, actor, stat, amount, source, reason, undefined, before);
        if (!plan.allowed || !isFinite(plan.amount) || plan.amount === 0) return 0;
        amount = plan.amount;
        // Any other living body carries the same persistent ladder on its Minecraft attributes.
        if (String(actor.domain()) !== "cobblemon") {
            var other = CombatStages.write(world, actor, stat, amount);
            if (other !== 0) CombatStages.publish(plan, before, effectiveStage(world, actor, stat));
            return other;
        }
        var state = read(world, actor), pokemon = CobblemonCombat.pokemon(actor), name = ability(pokemon, state);
        var change = { stat: stat, amount: amount, source: plan.source, reason: plan.reason };
        if (!ignoreAbility) {
            if (amount < 0 && NativeAbilities.flag(name, "statLossImmune")) return 0;
            NativeAbilities.apply(world, actor, "boost", change, state);
        }
        if (!isFinite(change.amount) || change.amount === 0) return 0;
        var base = state.stages[stat] || 0;
        state.stages[stat] = Math.max(-6, Math.min(6, base + change.amount));
        write(world, actor, state);
        if (!ignoreAbility) NativeAbilities.apply(world, actor, "boosted", change, state);
        var delta = state.stages[stat] - base;
        if (delta !== 0) CombatStages.publish(plan, before, effectiveStage(world, actor, stat));
        return delta;
    }
    /**
     * A temporary stage window owned by the caller: raise the named stats now and remove exactly this window's
     * contribution when it expires or is closed. A Pokemon stores it in the existing NativeModifiers layer (visible
     * to combat, AI and damage through `stage`/`effectiveStage`); every other living body uses the CombatStages
     * window layer. Overlapping windows sum and cap through the read clamp. Clearing, copying or rewriting the
     * persistent ladder never lets an old window deduct anything back, because a window only ever removes itself.
     * A window ends on its own ticks, on an early `windowClose`, when a full `resetStages` runs, or when the carrier
     * is removed (recall/invalid); leaving combat alone does not clear it. Returns the window id for early cleanup.
     */
    export function boostWindow(world: CombatWorld, actor: CombatActor, changes: { [stat: string]: number }, ticks: number, source?: string): number {
        if (!world.valid(actor)) return 0;
        var clean: { [stat: string]: number } = {}, plans: CombatStages.Change[] = [];
        Object.keys(changes || {}).forEach(function (stat) {
            var n = Number((<any>changes)[stat]);
            if (CombatStages.stats.indexOf(stat) < 0 || !isFinite(n) || n === 0) return;
            var before = effectiveStage(world, actor, stat), plan = CombatStages.plan(world, actor, stat, n, source, "window", undefined, before);
            if (!plan.allowed || !isFinite(plan.amount)) return;
            var value = { stat: stat, amount: plan.amount, source: plan.source, reason: plan.reason };
            if (String(actor.domain()) === "cobblemon") {
                var state = read(world, actor), name = ability(CobblemonCombat.pokemon(actor), state);
                if (value.amount < 0 && NativeAbilities.flag(name, "statLossImmune")) return;
                NativeAbilities.apply(world, actor, "boost", value, state);
            }
            if (!isFinite(value.amount) || value.amount === 0) return;
            clean[stat] = Math.max(-6, Math.min(6, Math.round(value.amount))); plans.push(plan);
        });
        if (!Object.keys(clean).length) return 0;
        var id = String(actor.domain()) === "cobblemon" ? NativeModifiers.apply(world, actor, { stages: clean }, ticks)
            : CombatStages.window(world, actor, clean, ticks, source || "");
        plans.forEach(function (plan) { CombatStages.publish(plan, plan.before, effectiveStage(world, actor, plan.stat)); });
        return id;
    }
    /** Ends one owned boost window early; already expired windows are gone and this is a harmless no-op. */
    export function windowClose(world: CombatWorld, windowId: number): boolean {
        return CombatStages.closeWindow(world, windowId);
    }
    /**
     * Zero the persistent ladder for every stat (windows included for the “to zero” read), publishing the real
     * before/after through the shared change registries. `ignoreAbility` lets a full reset (Haze, Clear Smog)
     * bypass stat-drop immunities; the caller keeps its own markers and feedback.
     */
    export function resetStages(world: CombatWorld, actor: CombatActor, ignoreAbility?: boolean, source?: string, reason?: string): number {
        if (!world.valid(actor)) return 0;
        var ladder = read(world, actor).stages, erased = 0;
        CombatStages.stats.forEach(function (stat) {
            var value = Number(ladder[stat]) || 0;
            if (value === 0) return;
            var delta = boost(world, actor, stat, -value, ignoreAbility, source || "stage-reset", reason || "reset");
            erased += Math.abs(delta);
        });
        CombatStages.clearWindows(world, actor);
        // A Pokemon window is a NativeModifiers layer that carries only `stages`; other native layers (types,
        // ability, moves) stay, so a full reset only takes back level boosts.
        if (String(actor.domain()) === "cobblemon") {
            var views = world.effects(actor, "cobblemon_world_combat:modifier");
            for (var i = 0; i < views.length; i++) {
                var value: any = JSON.parse(String(views[i].data()));
                if (value && value.stages) world.operation(views[i].id(), "world_combat:clear_stages", "{}");
            }
        }
        return erased;
    }
    /**
     * Align `to`'s effective stages with `from`'s through the shared change registries. `selective` copies only the
     * gains, matching moves such as Psych Up that skip whatever would lower them. Returns the number of stats moved
     * and the total absolute levels, so the caller can drive its own feedback.
     */
    export function copyStages(world: CombatWorld, to: CombatActor, from: CombatActor, ignoreAbility?: boolean, selective?: boolean): { changed: number; total: number } {
        var result = { changed: 0, total: 0 };
        if (!world.valid(to) || !world.valid(from)) return result;
        CombatStages.stats.forEach(function (stat) {
            var delta = effectiveStage(world, from, stat) - effectiveStage(world, to, stat);
            if (delta === 0 || selective && delta < 0) return;
            var moved = boost(world, to, stat, delta, ignoreAbility, "stage-copy", "copy");
            if (moved !== 0) { result.changed++; result.total += Math.abs(moved); }
        });
        return result;
    }
    /** Opens a window in which this Pokemon's type-inherent status immunities (Steel/Poison vs poison, Fire vs burn, ...) do not apply. */
    export function breakTypeImmunity(world: CombatWorld, actor: CombatActor, ticks: number): void {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return;
        var state = read(world, actor); state.flags.typeImmunityUntil = world.tick() + ticks; write(world, actor, state);
    }
    /** True while the window is open, or while the current native status was applied through such a window. */
    export function typeImmunityBroken(world: CombatWorld, actor: CombatActor, state?: State): boolean {
        var current = state || read(world, actor);
        return (current.flags.typeImmunityUntil || 0) > world.tick() || !!current.flags.statusTypeBroken;
    }
    function statusInterval(statusId: string): number {
        return statusId === "burn" ? NativeSemantics.burnInterval : statusId === "poison" ? NativeSemantics.poisonInterval : NativeSemantics.toxicInterval;
    }
    /** Cobblemon native status names (`poisonbadly`) for a shared status identity. */
    export function nativeName(name: string): string { return name === "toxic" ? "poisonbadly" : name; }
    export function statusAllowed(world: CombatWorld, actor: CombatActor, statusId: string, ignoreAbility?: boolean, ignoreExisting?: boolean, ignoreType?: boolean): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        statusId = nativeName(CombatStatus.normalize(statusId));
        var pokemon = CobblemonCombat.pokemon(actor), state = read(world, actor), name = ignoreAbility ? "" : ability(pokemon, state);
        var allowed = { id: statusId, allowed: (!!ignoreExisting || !String(pokemon.status())) && !state.flags.safeguard };
        if (NativeAbilities.flag(name, "statusImmune") || NativeAbilities.has(name, "statusImmunities", statusId)) allowed.allowed = false;
        var inherent: { [id: string]: string[] } = { burn: ["fire"], poison: ["poison", "steel"], poisonbadly: ["poison", "steel"], paralysis: ["electric"], frozen: ["ice"] };
        if (!ignoreType && !typeImmunityBroken(world, actor, state) && (inherent[statusId] || []).some(function (type) { return hasType(pokemon, type, state); })) allowed.allowed = false;
        if (!ignoreAbility) NativeAbilities.apply(world, actor, "status", allowed, state, name);
        return allowed.allowed;
    }
    /**
     * Give a Pokemon a major status. The shared Minecraft effect is the status (`CombatStatus.inflict`); the
     * native Cobblemon status follows as its mirror. Works for every combatant through the same call.
     */
    export function status(world: CombatWorld, actor: CombatActor, statusId: string, ignoreAbility?: boolean): boolean {
        return CombatStatus.inflict(world, actor, statusId, undefined, undefined, { ignoreAbility: !!ignoreAbility });
    }
    /** Native-store write used by the status mirror; type-immunity windows are recorded on the individual. */
    export function writeStatus(world: CombatWorld, actor: CombatActor, statusId: string, seconds?: number): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        statusId = nativeName(CombatStatus.normalize(statusId));
        var pokemon = CobblemonCombat.pokemon(actor), broken = ((read(world, actor).flags.typeImmunityUntil || 0) > world.tick());
        var duration = seconds !== undefined ? seconds : statusId === "sleep" ? 3 + Math.floor(world.random() * 4) : statusId === "frozen" ? 8 : 40;
        var changed = CobblemonCombat.status(world, actor, "cobblemon:" + statusId, duration, String(pokemon.statusKey()));
        if (changed && broken) {
            // Sync the status clock here so the pulse does not treat this key as a fresh exposure and drop the mark.
            var state = read(world, actor); pokemon = CobblemonCombat.pokemon(actor);
            state.statusKey = String(pokemon.statusKey()); state.toxic = 1; state.flags.statusAt = world.tick() + statusInterval(statusId);
            state.flags.statusTypeBroken = 1; write(world, actor, state);
        }
        return changed;
    }
    // Pokemon policy for the shared status route: types, abilities, Safeguard and secondary-effect immunity.
    CombatStatus.gate.define({ id: "cobblemon_world_combat:status-policy", apply: function (context) {
        if (!context.allowed || String(context.actor.domain()) !== "cobblemon" || !context.world.valid(context.actor)) return;
        var options = context.options || {}, pokemon = CobblemonCombat.pokemon(context.actor), state = read(context.world, context.actor);
        if (!options.ignoreAbility && options.secondary && NativeAbilities.flag(ability(pokemon, state), "secondaryImmune")) { context.allowed = false; context.reason = "native-secondary-immune"; return; }
        if (CombatStatus.majors[context.name] && !statusAllowed(context.world, context.actor, context.name, !!options.ignoreAbility, true, !!options.ignoreType)) { context.allowed = false; context.reason = "native-status-immune"; }
    } });
    CombatStatus.actions.define({ id: "cobblemon_world_combat:action-policy", apply: function (context) {
        if (String(context.actor.domain()) !== "cobblemon" || !context.world.valid(context.actor)) return;
        var pokemon = CobblemonCombat.pokemon(context.actor), state = read(context.world, context.actor), name = ability(pokemon, state);
        if (String(pokemon.status()) === "cobblemon:sleep") context.blocked.asleep = true;
        if (String(pokemon.status()) === "cobblemon:frozen") context.blocked.frozen = true;
        if (NativeAbilities.flag(name, "sleepActionAllowed")) delete context.blocked.asleep;
        if (context.phase !== "damage" && state.flags.flinchUntil > context.world.tick()) context.blocked.flinched = true;
    } });
    export const healing = new WorldContributions.Registry<{ world: CombatWorld; actor: CombatActor; pokemon: CombatPokemon; amount: number; cause: string }>();
    export function heal(world: CombatWorld, actor: CombatActor, pokemon: CombatPokemon, hp: number, cause: string): number {
        const result = healing.apply({ world, actor, pokemon, amount: hp, cause });
        if (!isFinite(result.amount) || result.amount < 0) throw new Error("Invalid healing amount");
        return world.health(actor, result.amount * pokemon.healthScale(), "world_combat:" + cause) / pokemon.healthScale();
    }
    function enter(world: CombatWorld, actor: CombatActor, pokemon: CombatPokemon, state: State): void {
        var name = ability(pokemon, state); state.entered = true; write(world, actor, state);
        NativeAbilities.apply(world, actor, "encounter", {}, state, name);
    }
    export function engage(world: CombatWorld, actor: CombatActor): void {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return;
        var state = read(world, actor), fresh = state.lastHit < 0 || world.tick() - state.lastHit > NativeSemantics.encounterIdle;
        state.lastHit = world.tick(); write(world, actor, state);
        if (fresh) {
            CobblemonCombat.resetCritical(world, actor);
            state = read(world, actor); state.flags.recoveryAt = world.tick() + NativeSemantics.recoveryInterval;
            state.flags.accelerateAt = world.tick() + NativeSemantics.accelerationInterval;
            enter(world, actor, CobblemonCombat.pokemon(actor), state);
        }
    }
    function pulse(effect: CombatEffect): void {
        var world = effect.world(), actor = effect.target(), pokemon = CobblemonCombat.pokemon(actor), state = read(world, actor);
        var now = world.tick(), name = ability(pokemon, state), statusId = String(pokemon.status()).replace("cobblemon:", "");
        // Status damage belongs to the Minecraft effect (CombatStatus burn tick, vanilla poison); the native slot only mirrors.
        if (state.statusKey !== String(pokemon.statusKey())) { state.toxic = 1; state.statusKey = String(pokemon.statusKey()); state.flags.statusTypeBroken = 0; }
        if (pokemon.wild() && statusId && !(statusClocks[statusId] && statusClocks[statusId](world, actor)))
            CobblemonCombat.statusSeconds(world, actor, Math.max(0, pokemon.statusSeconds() - 1), String(pokemon.statusKey()));
        var engaged = state.lastHit >= 0 && now - state.lastHit <= NativeSemantics.encounterIdle;
        if (engaged && now >= (state.flags.recoveryAt || now + NativeSemantics.recoveryInterval)) {
            state.flags.recoveryAt = now + NativeSemantics.recoveryInterval; effect.state(JSON.stringify(state));
            NativeItems.apply(world, actor, "recovery", {}, state);
            if (!world.valid(actor)) return;
            state = read(world, actor); pokemon = CobblemonCombat.pokemon(actor);
        }
        NativeAbilities.apply(world, actor, "pulse", { now: now, engaged: engaged, status: statusId }, state);
        if (!engaged && state.lastHit >= 0) { state.lastHit = -1000; state.lock = ""; state.repeats = 0; state.entered = false; state.stages = {}; }
        NativeItems.apply(world, actor, "pulse", { now: now, engaged: engaged, status: statusId }, state);
        effect.state(JSON.stringify(state)); effect.remaining(1200000); effect.schedule("pulse", "pulse", 20, "{}");
    }
    export function before(event: CombatWorldEvent): void {
        if (String(event.actor().domain()) !== "cobblemon") return;
        var world = event.world(), state = read(world, event.actor()), action = event.action();
        if (action === null) return;
        var slot = action.argument("native-slot"), move = slot === null ? null : NativeLoadout.executing(action);
        if (move === null) return;
        var reason = NativeLoadout.restriction(action, move);
        if (reason) { event.reject(reason); return; }
        NativeAbilities.apply(world, event.actor(), "preparation", { event: event, action: action, move: move }, state);
    }
    /** A declared guard on a target that turns away enemy status moves (GuardEffects.State.statusWard). */
    function statusWarded(world: CombatWorld, actor: CombatActor): boolean {
        var guards = world.effects(actor, "world_combat:guard");
        for (var i = 0; i < guards.length; i++) {
            try {
                var state: any = JSON.parse(String(guards[i].data()));
                if (state && state.statusWard === true && (state.mode === "pool" ? state.capacity > 0 : state.charges > 0)) return true;
            } catch (error) { }
        }
        return false;
    }
    export function committed(event: CombatWorldEvent): void {
        if (String(event.actor().domain()) !== "cobblemon" || event.action() === null) return;
        var world = event.world(), pokemon = CobblemonCombat.pokemon(event.actor()), state = read(world, event.actor()), slot = event.action()!.argument("native-slot");
        if (slot === null) return;
        var move = NativeLoadout.executing(event.action()!); if (move === null) return;
        var target = event.target();
        if (target !== null && !world.friendly(target)) { engage(world, event.actor()); engage(world, target); state = read(world, event.actor()); }
        state.repeats = state.used === String(move.id()) ? Math.min(5, state.repeats + 1) : 0; state.used = String(move.id()); state.usedTick = world.tick();
        var invocation = NativeLoadout.invocation(event.action()!);
        if (invocation) { state.usedKey = invocation.key; state.usedSlot = invocation.slot; state.usedSource = invocation.source; }
        NativeItems.apply(world, event.actor(), "committed", { move: move, event: event }, state);
        write(world, event.actor(), state);
        NativeAbilities.apply(world, event.actor(), "committed", { event: event, action: event.action(), move: move }, state);
    }
    export function navigate(event: CombatWorldEvent): void {
        if (String(event.actor().domain()) !== "cobblemon") return;
        var pokemon = CobblemonCombat.pokemon(event.actor()), world = event.world(), state = read(world, event.actor()), name = ability(pokemon, state), data = JSON.parse(String(event.data())), currentStatus = String(pokemon.status());
        if (currentStatus === "cobblemon:sleep" || currentStatus === "cobblemon:frozen" || state.flags.rootedUntil > world.tick()) data.speed = 0;
        else {
            data.speed *= NativeSemantics.navigationMultiplier * multiplier(stage(state, "spe"));
            // Paralysis slows through the shared effect's movement attribute; abilities adjust `factor` here.
            var motion = { status: currentStatus, factor: 1 };
            NativeAbilities.apply(world, event.actor(), "navigation", motion, state);
            data.speed *= motion.factor;
            NativeItems.apply(world, event.actor(), "navigation", data, state);
        }
        data.speed = Math.max(0, Math.min(3, data.speed)); event.data(JSON.stringify(data));
    }
    /** One readable floating “miss” at the defender, using the shared feedback scene/kind contract. */
    function missFeedback(world: CombatWorld, target: CombatActor): void {
        var body = world.observe(target); if (body === null) return;
        WorldFeedback.emit(world, "world_combat:feedback", 1, body.position(),
            { actor: String(target.ref()), kind: "miss", start: world.tick(), duration: 24 }, 24);
    }
    export function incoming(event: CombatWorldEvent): void {
        var target = event.target(); if (target === null) return;
        var world = event.world(), data = JSON.parse(String(event.data()));
        if (data.amount <= 0 || data.bypassesInvulnerability) return;
        incomingRules.apply({ world: world, source: event.actor(), target: target, data: data });
        // Shared hit resolution over the accuracy/evasion ladder. A move's own base accuracy is resolved
        // geometrically (NativeSemantics.aim); the stage modifier lives here, so the two are never charged twice.
        // Default stages are 0, so an untouched combatant adds no randomness. Self-sourced and environmental
        // damage, native sure-hit and content-declared sure-hit / accuracy-immune hits are exempt.
        var selfSourced = String(event.actor().key()) === String(target.key());
        var sure = data.sureHit === true || data.bypassAccuracy === true || data.accuracyImmune === true || data.environment === true;
        if (!selfSourced && !sure && data.amount > 0) {
            var hit = hitChance(world, event.actor(), target);
            if (hit < 1 && world.random() >= hit) {
                data.amount = 0; data.missed = true; event.data(JSON.stringify(data));
                missFeedback(world, target);
                return;
            }
        }
        if(!data.calculation && data.direct && String(event.actor().domain())==="cobblemon" && String(event.actor().key())!==String(target.key()))
            data.amount*=multiplier(stage(read(world,event.actor()),"atk"));
        event.data(JSON.stringify(data));
        if (data.amount <= 0 || String(target.domain()) !== "cobblemon" || !world.valid(target)) return;
        var pokemon = CobblemonCombat.pokemon(target), state = read(world, target), name = ability(pokemon, state);
        // Script move damage already includes its staged defence. Native living attacks enter here before MC armor.
        if(!data.calculation && data.sourceEntity && data.sourceEntity!==String(target.ref()).split("/")[0]) {
            var tags:string[]=data.damageTags||[];
            var bypass=tags.indexOf("minecraft:bypasses_invulnerability")>=0 || tags.indexOf("minecraft:bypasses_effects")>=0;
            if(!bypass) {
                var special=CombatStages.special(data);
                var defenceId=special?"spd":"def", base=stat(pokemon,state,defenceId), actual=effectiveStat(pokemon,state,defenceId);
                var coefficient=CombatantStats.damageDefaults.defenceCoefficient;
                data.amount *= (1+Math.max(0,base)*coefficient)/(1+Math.max(0,actual)*coefficient);
            }
        }
        if (data.ignoreAbility && !NativeAbilities.flag(name, "resistsBypass")) name = "";
        NativeAbilities.apply(world, target, "incoming", data, state, name);
        // Full-health survival holds against any single blow, whatever dealt it.
        if (pokemon.health() === pokemon.maxHealth() && NativeAbilities.flag(name, "fullHealthSurvival") && data.amount >= pokemon.health() * pokemon.healthScale())
            data.amount = Math.max(0, pokemon.health() - 1) * pokemon.healthScale();
        NativeItems.apply(world, target, "incoming", data, state);
        if (data.amount <= 0) PokemonDamage.immune(world, target, JSON.stringify(data));
        event.data(JSON.stringify(data));
    }
    export function applied(event: CombatWorldEvent): void {
        var world = event.world(), actor = event.actor(), target = event.target(), data = JSON.parse(String(event.data()));
        if (target === null || !(data.actual > 0)) return;
        appliedRules.apply({ world: world, source: actor, target: target, data: data });
        // Any hit from a hostile living source opens an encounter for both sides; environmental damage arrives with actor === target.
        var hostile = String(actor.key()) !== String(target.key()) && !world.friendly(target);
        // Settle the defender's survival item before recoil can make the source unavailable.
        if (data.consumeTarget && world.valid(target) && String(target.domain()) === "cobblemon") CobblemonCombat.consumeHeld(world, target, data.consumeTarget, 1);
        if (world.valid(actor)) {
            var nativeActor = String(actor.domain()) === "cobblemon", attacker = nativeActor ? CobblemonCombat.pokemon(actor) : null;
            var own = nativeActor ? read(world, actor) : empty(), attackAbility = attacker ? ability(attacker, own) : "";
            if (hostile && nativeActor) {
                engage(world, actor); own = read(world, actor);
            }
            if (data.critical && nativeActor) CobblemonCombat.record(world, actor, "critical_hits", 1);
            var body = world.observe(actor);
            if (data.drain && body && body.health() < body.maxHealth()) world.health(actor,
                nativeActor ? NativeItems.apply(world, actor, "drain", { amount: data.actual * data.drain }, own).amount : data.actual * data.drain, "world_combat:drain");
            // Defender reactions need the event's living source scope, so dispatch them before source recoil.
            if (hostile && world.valid(actor) && world.valid(target) && String(target.domain()) === "cobblemon") {
                engage(world, target);
                var received = read(world, target);
                NativeAbilities.apply(world, target, "received", data, received);
                if (world.valid(actor) && world.valid(target)) NativeItems.apply(world, target, "received", data, received);
            }
            var recoil = data.recoil || 0;
            if (recoil && world.valid(actor) && !NativeAbilities.flag(attackAbility, "recoilImmune")) {
                var loss = -world.health(actor, -data.actual * recoil, "world_combat:recoil");
                if (loss > 0 && world.valid(actor) && attacker) CobblemonCombat.record(world, actor, "recoil", Math.round(loss / attacker.healthScale()));
            }
            if (world.valid(actor) && nativeActor) NativeItems.apply(world, actor, "applied", data, own);
        }
        if (!world.valid(actor) || String(target.domain()) !== "cobblemon" || !world.valid(target)) return;
        var defender = CobblemonCombat.pokemon(target), defending = world.valid(target) ? read(world, target) : empty(), name = ability(defender, defending);
        // Thaw, wake and a move's secondary status run for every combatant in CombatStatus.
        // Contact: a move declares it with its own flag; ordinary damage counts when the attacker struck with its body (melee, claw, bite).
        var touched = data.kind === "move" ? !!data.contact : !!data.direct;
        if (hostile && touched && world.valid(actor)) {
            var attackerPokemon = String(actor.domain()) === "cobblemon", own = attackerPokemon ? read(world, actor) : empty();
            if (attackerPokemon && NativeItems.apply(world, actor, "contactProtection", { blocked: false }, own).blocked) return;
            var contact = NativeItems.applyFacts(defender, defending, "contactRecoil", { fraction: NativeAbilities.property(name, "contactRecoil", 0) }).fraction;
            var body = world.observe(actor);
            if (contact && body !== null && !(attackerPokemon && NativeAbilities.flag(ability(CobblemonCombat.pokemon(actor), own), "indirectImmune")))
                world.health(actor, -body.maxHealth() * contact, "world_combat:contact");
            var contactStatus = NativeAbilities.property(name, "contactStatus", "");
            if (world.valid(actor) && contactStatus && world.random() < .3) status(world, actor, contactStatus);
            if (world.valid(target)) NativeAbilities.apply(world, target, "contact", { attacker: actor, damage: data }, defending);
        }
    }
    export function install(): void {
        WorldCombat.effect("cobblemon_world_combat:individual", 1, 1200000, "actor", normalize, EffectProtocols.unchanged);
        // The individual effect owns the native status clock for as long as it lives; pulse keeps it from expiring.
        WorldCombat.effectHandler("cobblemon_world_combat:individual", "start", function (effect) {
            CobblemonCombat.statusLease(effect.world(), effect.target()); effect.schedule("pulse", "pulse", 1, "{}");
        });
        WorldCombat.effectHandler("cobblemon_world_combat:individual", "resume", function (effect) { CobblemonCombat.statusLease(effect.world(), effect.target()); });
        WorldCombat.effectHandler("cobblemon_world_combat:individual", "end", function (effect) { CobblemonCombat.statusRelease(effect.world(), effect.target()); });
        WorldCombat.effectHandler("cobblemon_world_combat:individual", "pulse", pulse);
        WorldCombat.effectHandler("cobblemon_world_combat:individual", "operation:cobblemon_world_combat:update", function (effect) { effect.state(String(effect.input())); });
        function attach(event: CombatWorldEvent): void {
            if (String(event.actor().domain()) !== "cobblemon") return;
            var world = event.world();
            if (model(world, event.actor()) === null) world.effect("cobblemon_world_combat:individual", event.actor(), JSON.stringify(empty()), 1200000);
        }
        WorldCombat.on("cobblemon_world_combat:bound", "world_combat:actor_bound", "", attach);
        WorldCombat.on("cobblemon_world_combat:before", "world_combat:before_commit", "", before);
        WorldCombat.on("cobblemon_world_combat:committed", "world_combat:committed", "", committed);
        WorldCombat.on("cobblemon_world_combat:navigate", "world_combat:navigate", "", navigate);
        // Requested status-ward stop: only guards that explicitly declare `statusWard` are consulted, so a
        // damaging shield, a mist or a lucky chant is never mistaken for a blanket move ban.
        WorldCombat.on("cobblemon_world_combat:guard_ward", "world_combat:before_commit", "", function (event) {
            var action = event.action(); if (action === null) return;
            var move = NativeLoadout.executing(action); if (move === null || String(move.category()) !== "status") return;
            var target = action.target();
            if (target === null || String(target.key()) === String(event.actor().key()) || event.world().friendly(target)) return;
            if (statusWarded(event.world(), target)) event.reject("status-ward");
        });
    }
    WorldCombat.on("cobblemon_world_combat:incoming", "world_combat:damage_incoming", "world_combat:effects_incoming", incoming);
    WorldCombat.on("cobblemon_world_combat:applied", "world_combat:damage_applied", "", applied);
}
if (typeof CobblemonCombat !== "undefined") NativeEffects.install();
