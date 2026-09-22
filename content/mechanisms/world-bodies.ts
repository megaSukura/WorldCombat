/**
 * Script-defined persistent bodies: living entities that belong to themselves. The host keeps the entity; its
 * behaviour is a persistent effect (the brain) whose handlers run with the body as source. This layer turns a
 * plain object of callbacks into that effect, routes the host's body hooks (interact, touch, blocked, died) to the
 * brain as operations, and re-arms an optional periodic `tick`.
 *
 * A body is created with `WorldBodies.spawn(world, point, body, definition, state, ticks)` from any writable scope
 * (an action, an effect, another body). The returned actor is a full combatant for every world API: it can be
 * observed, hurt, given effects, navigated, mounted, launched with `world.motion(...)`, and it can itself place
 * blocks, open containers, spawn projectiles or further bodies through `brain.world()`.
 */
namespace WorldBodies {
    export interface Brain {
        /** State schema version; raise it and supply `migrate` when the saved shape changes. */
        schema?: number;
        /** Upper bound of one body's lifetime in ticks (default 1200000). */
        maxTicks?: number;
        /** Validates and normalizes the state JSON; the default accepts any object. */
        normalize?: (json: string) => string;
        migrate?: (oldVersion: number, json: string) => string;
        /** Runs once when the body is spawned. */
        start: (brain: CombatEffect) => void;
        /** Runs after a restart or reload restores the body. */
        resume?: (brain: CombatEffect) => void;
        /** Runs when the brain ends: expiry, dismissal, death or `brain.end()`; `brain.reason()` tells which. */
        end?: (brain: CombatEffect) => void;
        /** Periodic callback: `every` ticks (>= 1). */
        tick?: { every: number; handler: (brain: CombatEffect) => void };
        /** A player right-clicks the body. Return true to consume the click. Input: {hand, item, count, sneaking}. */
        interact?: (brain: CombatEffect, player: CombatActor, input: { hand: string; item: string; count: number; sneaking: boolean }) => boolean | void;
        /** Another living entity overlaps the body (at most every 10 ticks per entity). Input: {speed}. */
        touch?: (brain: CombatEffect, other: CombatActor, input: { speed: number }) => void;
        /** The body collided with blocks this tick (at most every 5 ticks). Input: {horizontal, vertical, block}. */
        blocked?: (brain: CombatEffect, input: { horizontal: boolean; vertical: boolean; block: string }) => void;
        /** The body was killed; the brain ends right after. Input: {cause}. */
        died?: (brain: CombatEffect, killer: CombatActor | null, input: { cause: string }) => void;
        /** Further named operations other content can call with `world.operation(brainId, name, json)`. */
        operations?: { [name: string]: (brain: CombatEffect) => void };
        /** Named timer and projectile hit/completion handlers, each with a fresh brain scope. */
        handlers?: { [name: string]: (brain: CombatEffect) => void };
    }
    const brains: { [id: string]: Brain } = Object.create(null);
    function object(json: string): string {
        const value = JSON.parse(json);
        if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Body state must be a JSON object");
        return JSON.stringify(value);
    }
    /** Registers a body definition; `id` is namespaced (`world_combat:move/<move>/<name>` or the unit's own namespace). */
    export function define(id: string, brain: Brain): void {
        if (brains[id]) throw new Error("Duplicate body definition " + id);
        brains[id] = brain;
        WorldCombat.effect(id, brain.schema || 1, brain.maxTicks || 1200000, "persistent", brain.normalize || object, brain.migrate || EffectProtocols.unchanged);
        WorldCombat.effectHandler(id, "start", function (effect) {
            brain.start(effect);
            if (brain.tick) effect.schedule("world_combat:tick", "world_combat:tick", Math.max(1, brain.tick.every), "{}");
        });
        if (brain.resume || brain.tick) WorldCombat.effectHandler(id, "resume", function (effect) {
            if (brain.resume) brain.resume(effect);
            if (brain.tick) effect.schedule("world_combat:tick", "world_combat:tick", Math.max(1, brain.tick.every), "{}");
        });
        if (brain.end) WorldCombat.effectHandler(id, "end", function (effect) { brain.end!(effect); });
        if (brain.tick) WorldCombat.effectHandler(id, "world_combat:tick", function (effect) {
            brain.tick!.handler(effect);
            effect.schedule("world_combat:tick", "world_combat:tick", Math.max(1, brain.tick!.every), "{}");
        });
        if (brain.interact) WorldCombat.effectHandler(id, "operation:world_combat:interact", function (effect) {
            const input = JSON.parse(effect.input()), player = effect.world().actor(input.who);
            if (player && brain.interact!(effect, player, input) === true) consumed = true;
        });
        if (brain.touch) WorldCombat.effectHandler(id, "operation:world_combat:touch", function (effect) {
            const input = JSON.parse(effect.input()), other = effect.world().actor(input.who);
            if (other) brain.touch!(effect, other, input);
        });
        if (brain.blocked) WorldCombat.effectHandler(id, "operation:world_combat:blocked", function (effect) { brain.blocked!(effect, JSON.parse(effect.input())); });
        if (brain.died) WorldCombat.effectHandler(id, "operation:world_combat:died", function (effect) {
            const input = JSON.parse(effect.input());
            brain.died!(effect, input.killer ? effect.world().actor(input.killer) : null, input);
        });
        Object.keys(brain.operations || {}).forEach(function (name) {
            WorldCombat.effectHandler(id, "operation:" + name, function (effect) { brain.operations![name](effect); });
        });
        Object.keys(brain.handlers || {}).forEach(function (name) {
            WorldCombat.effectHandler(id, name, function (effect) { brain.handlers![name](effect); });
        });
    }
    /** Spawns a body from any writable world scope. `body` is the entity configuration, `state` the brain's initial state. */
    export function spawn(world: CombatWorld, point: CombatPoint, body: any, definition: string, state: any, ticks: number): CombatActor {
        return world.spawn(point, JSON.stringify(body || {}), definition, JSON.stringify(state || {}), ticks);
    }
    export interface Info { definition: string; brain: number; summoner: string; owner: string; config: any; }
    /** Body facts for an actor, or null when it is not a body. */
    export function info(world: CombatWorld, actor: CombatActor): Info | null {
        const json = world.body(actor); return json ? JSON.parse(json) : null;
    }
    /** Calls a brain operation on a body from the caller's scope. */
    export function operate(world: CombatWorld, actor: CombatActor, name: string, input: any): boolean {
        const facts = info(world, actor); return !!facts && world.operation(facts.brain, name, JSON.stringify(input || {}));
    }
    let consumed = false;
    function route(topic: string, name: string, payload?: (event: CombatWorldEvent, data: any) => any): void {
        WorldCombat.on("world_combat:bodies/" + name, topic, "", function (event) {
            const world = event.world(), facts = info(world, event.actor());
            if (!facts || !brains[facts.definition]) return;
            const data = JSON.parse(event.data());
            consumed = false;
            world.operation(facts.brain, "world_combat:" + name, JSON.stringify(payload ? payload(event, data) : data));
            if (consumed) { data.consumed = true; event.data(JSON.stringify(data)); }
        });
    }
    function who(event: CombatWorldEvent, data: any): any { const target = event.target(); data.who = target ? String(target.ref()) : ""; return data; }
    export function install(): void {
        route("world_combat:body_interact", "interact", who);
        route("world_combat:body_touch", "touch", who);
        route("world_combat:body_blocked", "blocked");
        route("world_combat:body_died", "died", function (event, data) { const killer = event.target(); data.killer = killer ? String(killer.ref()) : ""; return data; });
    }
    WorldBodies.install();
}
