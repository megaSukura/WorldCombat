/**
 * Stat stages for every combatant. A Pokemon keeps its native stages (NativeEffects.boost); any other living body
 * carries the same -6..+6 ladder here, translated into the attributes Minecraft already fights with, so a raised
 * Attack lands on a player's sword and a lowered Speed slows a zombie. Stages fade the same way a Pokemon's do:
 * a body that has neither dealt nor taken damage for the encounter idle time returns to normal.
 *
 * Two storage layers with one contract: the persistent ladder (`write`/`read`/`replace`) and any number of owned
 * temporary windows (`window`). A window contributes on top of the ladder and is removed only when its own effect
 * ends, so clearing, copying or rewriting the persistent ladder never makes an old window deduct anything back.
 *
 * Accuracy and Evasion share the same ladder but no attribute: they are read by the shared hit model
 * (NativeEffects.precision / NativeSemantics.aim) so a raised accuracy widens the hit window and a raised
 * evasion narrows it. Accuracy and Evasion use the three-based ladder `(3+n)/3` / `3/(3-n)`, never the attack
 * ladder. Never express a hit change by lowering attack_damage.
 *
 * Every ladder change runs through `change` first, so content can intercept or rewrite it with a named source and
 * the real before value; a separate `changed` observation then carries the real after value and delta.
 */
namespace CombatStages {
    export var definition = "world_combat:stages";
    export var windowDefinition = "world_combat:stages_window";
    /** Matches NativeSemantics.encounterIdle; pack config refreshes it on actor bind after the server config loads. */
    export var idleTicks = 600;
    export var armorPerStage = 3;
    export var stats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
    var attributes: { [stat: string]: string } = { atk: "minecraft:generic.attack_damage", spe: "minecraft:generic.movement_speed" };
    interface State { stages: { [stat: string]: number }; }
    interface Window { source: string; stages: { [stat: string]: number }; carrier?: MobEffects.Anchor; owner?: WindowOwner; origin?: string; }
    export interface WindowOwner { actor: string; definition: string; id: number; }
    export function validOwner(owner: WindowOwner): boolean {
        return !!owner && typeof owner.actor === "string" && typeof owner.definition === "string" && typeof owner.id === "number" && owner.id > 0;
    }
    /** A moved contribution keeps the lifetime and dispel ownership of its original window. */
    export function windowAlive(world: CombatWorld, actor: CombatActor, state: { carrier?: MobEffects.Anchor; owner?: WindowOwner }, seen: number[] = []): boolean {
        if (state.carrier && !MobEffects.matches(world, actor, state.carrier)) return false;
        if (!state.owner) return true;
        if (seen.indexOf(state.owner.id) >= 0) return false;
        var owner = world.actor(state.owner.actor);
        if (!owner || !world.valid(owner)) return false;
        var views = world.effects(owner, state.owner.definition).filter(function (view) { return view.id() === state.owner!.id; });
        return views.length > 0 && windowAlive(world, owner, JSON.parse(String(views[0].data())), seen.concat([state.owner.id]));
    }
    /** Exact edit of one contribution; source, duration, carrier and unrelated modifier fields stay intact. */
    export function editWindow(effect: CombatEffect): void {
        var input = JSON.parse(effect.input()), state = JSON.parse(effect.state());
        if (stats.indexOf(input.stat) < 0 || !isFinite(input.value) || input.value % 1 || Math.abs(input.value) > 6
            || (state.stages && state.stages[input.stat] || 0) !== input.expected) { effect.reject("stage-changed"); return; }
        if (!state.stages) state.stages = {};
        if (input.value === 0) delete state.stages[input.stat]; else state.stages[input.stat] = input.value;
        effect.state(JSON.stringify(state));
    }
    export function attachOwner(effect: CombatEffect): void {
        var input = JSON.parse(effect.input()), state = JSON.parse(effect.state());
        if (!validOwner(input) || String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("invalid-owner"); return; }
        state.owner = input; effect.state(JSON.stringify(state)); effect.schedule("carrier", "carrier", 1, "{}");
    }
    /** Explicit handoff before the former holder retires; retain the remaining clock and record its source. */
    export function adoptWindow(effect: CombatEffect): void {
        var state = JSON.parse(effect.state());
        if (state.carrier || String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("invalid-handoff"); return; }
        state.origin = state.origin || String(effect.source().ref()); delete state.owner;
        effect.copyTo(effect.target(), effect.target(), JSON.stringify(state), effect.remaining()); effect.end();
    }
    /** Domains install their stage-window transfer writer when the native mechanics package loads. */
    export var transferWindow = function (effect: CombatEffect, _definition: string): void { effect.reject("unsupported-transfer"); };

    function clean(value: any): { [stat: string]: number } {
        var stages: { [stat: string]: number } = {};
        stats.forEach(function (stat) { var n = Number(value && value[stat] || 0); if (isFinite(n) && n !== 0) stages[stat] = Math.max(-6, Math.min(6, Math.round(n))); });
        return stages;
    }
    function normalize(json: string): string {
        var value = JSON.parse(json);
        return JSON.stringify({ stages: clean(value && value.stages) });
    }
    function normalizeWindow(json: string): string {
        var value: Window = JSON.parse(json);
        if (!value || typeof value.source !== "string" || !value.stages) throw new Error("Invalid stage window");
        if (value.carrier && !MobEffects.validAnchor(value.carrier)) throw new Error("Invalid stage carrier");
        if (value.owner && !validOwner(value.owner)) throw new Error("Invalid stage owner");
        if (value.origin !== undefined && typeof value.origin !== "string") throw new Error("Invalid stage origin");
        return JSON.stringify({ source: value.source, stages: clean(value.stages), carrier: value.carrier, owner: value.owner, origin: value.origin });
    }
    function clamp(value: number): number { return Math.max(-6, Math.min(6, value)); }
    export function multiplier(stage: number): number { return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage); }
    /** Accuracy and Evasion ladder: `(3+n)/3` above zero, `3/(3-n)` below, both 1 at 0. */
    export function accuracyMultiplier(stage: number): number { return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage); }
    function current(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        var views = world.effects(actor, definition);
        return views.length ? views[0] : null;
    }
    /** The persistent ladder a writer owns; windows are not part of it. */
    function base(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        var view = current(world, actor);
        return view ? (<State>JSON.parse(view.data())).stages : {};
    }
    /** The persistent ladder only; `stage`/`effective` include owned temporary windows. */
    export function read(world: CombatWorld, actor: CombatActor): { [stat: string]: number } { return base(world, actor); }
    /** Sum of every owned window on this body; a window is removed only when its own effect ends. */
    export function windows(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        var result: { [stat: string]: number } = {}, views = world.effects(actor, windowDefinition);
        for (var i = 0; i < views.length; i++) {
            var value: Window = JSON.parse(String(views[i].data())), stages = value.stages || {};
            if (!windowAlive(world, actor, value)) continue;
            stats.forEach(function (stat) { result[stat] = (result[stat] || 0) + (stages[stat] || 0); });
        }
        return result;
    }
    /** The ladder a combatant actually fights with: persistent stages plus all owned windows, clamped. */
    export function effective(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        var ladder = base(world, actor), window = windows(world, actor), result: { [stat: string]: number } = {};
        stats.forEach(function (stat) { var value = (ladder[stat] || 0) + (window[stat] || 0); if (value !== 0) result[stat] = clamp(value); });
        return result;
    }
    export function stage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return clamp((base(world, actor)[stat] || 0) + (windows(world, actor)[stat] || 0));
    }

    /** One stage change before it is written: contributions may read `before` and rewrite `amount` or refuse it. */
    export interface Change {
        world: CombatWorld; actor: CombatActor; stat: string; amount: number;
        /** Named origin (move, ability, item, environment) so policy can filter by cause. */
        source: string; reason: string; allowed: boolean;
        /** Real effective value before the write, and the real value after; filled for logs and follow-up policy. */
        before: number; after: number; options: any;
    }
    /** A single, shared interception point for every stage change, whichever domain owns the storage. */
    export var change = new WorldContributions.Registry<Change>();
    /** Fires after a change landed, with the real effective before/after so consumers see the true delta. */
    export var changed = new WorldContributions.Registry<Change>();
    /** Run the interception for one change without writing; the caller owns storage and fills before/after. */
    export function plan(world: CombatWorld, actor: CombatActor, stat: string, amount: number,
        source?: string, reason?: string, options?: any, before?: number): Change {
        return change.apply({ world: world, actor: actor, stat: stat, amount: amount, source: source || "",
            reason: reason || "", allowed: true, before: before === undefined ? stage(world, actor, stat) : before, after: 0, options: options || {} });
    }
    /** Publish a landed change with its real effective before/after. */
    export function publish(context: Change, before: number, after: number): void {
        context.before = before; context.after = after; changed.apply(context);
    }

    /** Replaces the persistent carrier so its attribute modifiers are rebuilt for the new ladder; windows stay. */
    export function replace(world: CombatWorld, actor: CombatActor, stages: { [stat: string]: number }): void {
        var view = current(world, actor), json = normalize(JSON.stringify({ stages: stages }));
        if (view) world.operation(view.id(), "world_combat:dispel", "{}");
        if (stats.some(function (id) { return !!stages[id]; })) world.effect(definition, actor, json, idleTicks);
    }
    /** Write one already-planned change into the persistent ladder; returns the actual persistent delta. */
    export function write(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        if (!world.valid(actor) || stats.indexOf(stat) < 0 || !isFinite(amount) || amount === 0) return 0;
        var stages = base(world, actor);
        var before = stages[stat] || 0;
        stages[stat] = clamp(before + amount);
        replace(world, actor, stages);
        return stages[stat] - before;
    }
    /** A shared boost for any domain using the persistent ladder (Pokemon route through NativeEffects.boost). */
    export function boost(world: CombatWorld, actor: CombatActor, stat: string, amount: number, source?: string, reason?: string): number {
        if (!world.valid(actor) || stats.indexOf(stat) < 0 || !isFinite(amount) || amount === 0) return 0;
        var before = stage(world, actor, stat);
        var context = plan(world, actor, stat, amount, source, reason, undefined, before);
        if (!context.allowed || !isFinite(context.amount) || context.amount === 0) return 0;
        var delta = write(world, actor, stat, context.amount);
        publish(context, before, stage(world, actor, stat));
        return delta;
    }
    /**
     * A self-owned temporary ladder window: raise the named stats now and remove exactly this window's contribution
     * when the effect ends or is dispelled. Windows overlap and cap through the read clamp; none of them can be
     * pushed negative by a later rewrite of the persistent ladder. Returns the window effect id for early removal.
     */
    export function window(world: CombatWorld, actor: CombatActor, changes: { [stat: string]: number }, ticks: number, source?: string, carrier?: MobEffects.Anchor): number {
        if (!world.valid(actor)) return 0;
        var stages = clean(changes);
        if (!Object.keys(stages).length) return 0;
        return world.effect(windowDefinition, actor, JSON.stringify({ source: source || "", stages: stages, carrier: carrier }), ticks);
    }
    /** Ends one owned window early; a naturally expired window is already gone and this is a no-op. */
    export function closeWindow(world: CombatWorld, windowId: number): boolean {
        return world.operation(windowId, "world_combat:dispel", "{}");
    }
    /** Ends every owned window on this body, used by full-stage resets so “to zero” really means zero. */
    export function clearWindows(world: CombatWorld, actor: CombatActor): number {
        var views = world.effects(actor, windowDefinition), count = 0;
        for (var i = 0; i < views.length; i++) { world.operation(views[i].id(), "world_combat:dispel", "{}"); count++; }
        return count;
    }

    function project(world: CombatWorld, body: CombatActor, stages: { [stat: string]: number }): void {
        Object.keys(attributes).forEach(function (stat) {
            var value = stages[stat] || 0;
            if (value && world.attributeValue(body, attributes[stat]) !== null)
                world.attribute(body, attributes[stat], multiplier(value) - 1, "add_multiplied_total");
        });
        var defence = stages.def || 0;
        if (defence) world.attribute(body, "minecraft:generic.armor", defence * armorPerStage, "add_value");
    }
    function apply(effect: CombatEffect): void {
        project(effect.world(), effect.target(), (<State>JSON.parse(effect.state())).stages);
    }
    const projectionDefinition = "world_combat:stages_projection";
    /** One native projection of the combined ladder; multiplying one modifier per window would overstate stages. */
    function reproject(world: CombatWorld): void {
        var actor = world.source(); if (String(actor.domain()) === "cobblemon") return;
        var combined = effective(world, actor), values = world.effects(actor, projectionDefinition);
        var carriers = Array.prototype.slice.call(world.effects(actor, definition)).concat(Array.prototype.slice.call(world.effects(actor, windowDefinition))) as CombatEffectView[];
        var duration = 0; carriers.forEach(function (view) { duration = Math.max(duration, view.remaining()); });
        var json = normalize(JSON.stringify({ stages: combined }));
        if (values.length === 1 && String(values[0].data()) === json && duration > 0) {
            if (values[0].remaining() !== duration) world.operation(values[0].id(), "world_combat:touch", JSON.stringify({ ticks: duration }));
            return;
        }
        for (var i = 0; i < values.length; i++) world.operation(values[i].id(), "world_combat:dispel", "{}");
        if (duration > 0 && stats.some(function (id) { return !!combined[id]; })) world.effect(projectionDefinition, actor, json, duration);
    }
    // Accuracy and Evasion are part of this ladder but never touch an attribute; the hit model reads them.
    export function precision(world: CombatWorld, actor: CombatActor): number { return accuracyMultiplier(stage(world, actor, "accuracy")); }
    export function evasion(world: CombatWorld, actor: CombatActor): number { return accuracyMultiplier(stage(world, actor, "evasion")); }
    /** Pure unaimed hit chance from an attacker's precision and a defender's evasion multipliers, clamped to [0,1]. */
    export function hitChance(precision: number, evasion: number): number {
        if (!isFinite(precision) || !isFinite(evasion) || precision <= 0) return 0;
        return Math.max(0, Math.min(1, precision / Math.max(0.0001, evasion)));
    }
    WorldCombat.effect(definition, 1, 1200000, "actor", normalize, EffectProtocols.unchanged);
    WorldCombat.effectHandler(definition, "start", function () {});
    WorldCombat.effectHandler(definition, "resume", function () {});
    WorldCombat.effectHandler(definition, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(definition, "operation:world_combat:stage_adopt", adoptWindow);
    WorldCombat.effectHandler(definition, "operation:world_combat:touch", function (effect) { effect.remaining(idleTicks); });
    WorldCombat.effect(windowDefinition, 1, 12000, "actor", normalizeWindow, EffectProtocols.unchanged);
    function watchCarrier(effect: CombatEffect, claim: boolean): void {
        var state: Window = JSON.parse(effect.state());
        if (!state.carrier && !state.owner) return;
        var world = effect.world(), actor = effect.target();
        if (!windowAlive(world, actor, state)) { effect.end(); return; }
        if (claim && state.carrier) MobEffects.bind(world, actor, state.carrier.id);
        effect.schedule("carrier", "carrier", 1, "{}");
    }
    WorldCombat.effectHandler(windowDefinition, "start", function (effect) { watchCarrier(effect, true); });
    WorldCombat.effectHandler(windowDefinition, "resume", function (effect) { watchCarrier(effect, true); });
    WorldCombat.effectHandler(windowDefinition, "carrier", function (effect) { watchCarrier(effect, false); });
    WorldCombat.effectHandler(windowDefinition, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(windowDefinition, "operation:world_combat:stage_edit", editWindow);
    WorldCombat.effectHandler(windowDefinition, "operation:world_combat:stage_owner", attachOwner);
    WorldCombat.effectHandler(windowDefinition, "operation:world_combat:stage_adopt", adoptWindow);
    WorldCombat.effectHandler(windowDefinition, "operation:world_combat:stage_transfer", function (effect) { transferWindow(effect, windowDefinition); });
    WorldCombat.effect(projectionDefinition, 1, 1200000, "actor", normalize, EffectProtocols.unchanged);
    WorldCombat.effectHandler(projectionDefinition, "start", apply);
    WorldCombat.effectHandler(projectionDefinition, "resume", apply);
    WorldCombat.effectHandler(projectionDefinition, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(projectionDefinition, "operation:world_combat:touch", function (effect) { effect.remaining(JSON.parse(effect.input()).ticks); });
    [definition, windowDefinition].forEach(function (id) {
        WorldCombat.on("world_combat:stages/project/" + id.split(":")[1], "world_combat:effect_changed/" + id.replace(":", "/"), "", function (event) { reproject(event.world()); });
    });
    export function special(data:any):boolean {
        return DamageSemantics.read(data).category === "special";
    }
    WorldCombat.on("world_combat:stages/special", "world_combat:damage_incoming", "world_combat:effects_incoming", function(event) {
        var world=event.world(), target=event.target(), data=JSON.parse(String(event.data()));
        if(!target||!special(data)||data.bypassesInvulnerability)return;
        if(String(target.domain())!=="cobblemon"&&!data.ignoreDefenceStages)data.amount/=multiplier(stage(world,target,"spd"));
        if(!data.calculation&&String(event.actor().domain())!=="cobblemon")data.amount*=multiplier(stage(world,event.actor(),"spa"));
        event.data(JSON.stringify(data));
    });
    /** Fighting keeps the ladder alive on both sides; stillness lets it fade. */
    WorldCombat.on("world_combat:stages/damage", "world_combat:damage_applied", "", function (event) {
        var world = event.world(), target = event.target(), pair = target ? [event.actor(), target] : [event.actor()];
        for (var i = 0; i < pair.length; i++) {
            if (String(pair[i].domain()) === "cobblemon") continue;
            var view = current(world, pair[i]);
            if (view) world.operation(view.id(), "world_combat:touch", "{}");
        }
    });
}
