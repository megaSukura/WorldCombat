/** Pointed machine jobs: content supplies the operation and its budget; the shared work cycle owns approach and suspension. */
namespace MachineWork {
    export interface Job {
        operation: string; move: string; point: number[]; block: string; mode: string;
        payload: any; status: "working" | "complete" | "invalid"; reason: string;
    }
    export interface Outcome { state: "working" | "complete" | "invalid"; reason?: string; }
    export interface Operation {
        id: string; move: string;
        valid(world: CombatWorld, actor: CombatActor, job: Job): string;
        step(world: CombatWorld, actor: CombatActor, job: Job): Outcome;
    }
    export interface Current { id: number; job: Job; }
    const definition = "world_combat:machine_work";
    const operations: { [id: string]: Operation } = Object.create(null);

    export function equipped(world: CombatWorld, actor: CombatActor, move: string): { slot: number; move: CombatPokemonMove } | null {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return null;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const native = pokemon.move(slot);
            if (native !== null && NativeLoadout.selection(world, slot, native).id === move) return { slot: slot, move: native };
        }
        return null;
    }
    export function current(world: CombatWorld, actor: CombatActor): Current | null {
        const effects = world.effects(actor, definition);
        return effects.length ? { id: effects[0].id(), job: JSON.parse(String(effects[0].data())) } : null;
    }
    export function stop(world: CombatWorld, actor: CombatActor): void {
        const effects = world.effects(actor, definition);
        for (let i = 0; i < effects.length; i++) world.operation(effects[i].id(), "world_combat:stop_work", "{}");
    }
    /** A fresh command replaces the previous job, never its move's resource ledger. */
    export function start(view: CombatTactics, operation: string, mode: string, payload: any, lifetime: number): void {
        const world = view.world(), actor = view.actor(), point = view.commandPoint(), spec = operations[operation];
        if (!spec || !equipped(world, actor, spec.move)) view.reject("loadout-changed");
        const body = world.observe(actor), block = world.block(point);
        if (body === null || block === null || point.minus(body.position()).length() > 32) view.reject("out-of-range");
        const job: Job = { operation: operation, move: spec.move, mode: mode,
            point: [Math.floor(point.x()) + 0.5, Math.floor(point.y()) + 0.5, Math.floor(point.z()) + 0.5],
            block: String(block!.id()), payload: payload, status: "working", reason: "" };
        const previous = current(world, actor);
        if (previous && previous.job.status === "working" && previous.job.operation === operation && previous.job.mode === mode
            && previous.job.block === job.block && previous.job.point.every(function (n, i) { return n === job.point[i]; })
            && previous.job.payload.resource === payload.resource) {
            const invalid = spec.valid(world, actor, previous.job);
            if (invalid) view.reject(invalid);
            view.intent("work", null, point); return;
        }
        const reason = spec.valid(world, actor, job);
        if (reason) view.reject(reason);
        stop(world, actor);
        world.effect(definition, actor, JSON.stringify(job), Math.max(1, Math.round(lifetime)));
        view.intent("work", null, WorldCombat.point(job.point[0], job.point[1], job.point[2]));
    }
    export function point(job: Job): CombatPoint { return WorldCombat.point(job.point[0], job.point[1], job.point[2]); }

    WorldCombat.effect(definition, 1, 12000, "actor", function (json) {
        const job = JSON.parse(json);
        if (!job || typeof job.operation !== "string" || typeof job.move !== "string" || !Array.isArray(job.point)
            || job.point.length !== 3 || !job.point.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            throw new Error("Invalid machine work target");
        return JSON.stringify(job);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(definition, "start", function () { });
    WorldCombat.effectHandler(definition, "operation:world_combat:stop_work", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });
    WorldCombat.effectHandler(definition, "operation:world_combat:work_step", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        const world = effect.world(), actor = effect.target(), job: Job = JSON.parse(effect.state()), spec = operations[job.operation];
        if (job.status !== "working") return;
        const block = world.block(point(job));
        const invalid = !spec || !equipped(world, actor, job.move) ? "loadout-changed"
            : block === null || String(block.id()) !== job.block ? "work-target-changed" : spec.valid(world, actor, job);
        const result: Outcome = invalid ? { state: "invalid", reason: invalid } : spec.step(world, actor, job);
        job.status = result.state; job.reason = result.reason || "";
        effect.state(JSON.stringify(job));
    });

    export function register(registry: WorldWork.Registry, spec: Operation,
        observeFrames: (id: string, read: (frame: WorldBehavior.Frame, world: CombatWorld) => void) => void): void {
        if (operations[spec.id]) throw new Error("Duplicate machine operation: " + spec.id);
        operations[spec.id] = spec;
        observeFrames("world_combat:machine_work", function (frame, world) {
            if (frame.facts.intent !== "work" && current(world, world.source()) !== null) stop(world, world.source());
        });
        registry.register({
            id: spec.id,
            applies: function (context) {
                const world: CombatWorld = context.services.world;
                const selected = current(world, world.source());
                return !context.facts.wild && context.facts.intent === "work" && selected !== null
                    && selected.job.operation === spec.id;
            },
            discover: function (context) {
                const world: CombatWorld = context.services.world, selected = current(world, world.source());
                return selected && selected.job.operation === spec.id
                    ? [{ id: String(selected.id), provider: spec.id, data: { effect: selected.id, point: selected.job.point } }] : [];
            },
            inspect: function (context, job) {
                const world: CombatWorld = context.services.world, selected = current(world, world.source());
                if (!selected || selected.id !== job.data.effect) return { state: "complete" };
                if (selected.job.status !== "working") {
                    const status = selected.job.status, reason = selected.job.reason;
                    stop(world, world.source());
                    return { state: status === "complete" ? "complete" : "invalid", reason: reason };
                }
                if (context.senses["world_combat:threat"] || context.facts.mounted || context.facts.busy)
                    return { state: "waiting", reason: "work-interrupted" };
                const invalid = !equipped(world, world.source(), spec.move) ? "loadout-changed" : spec.valid(world, world.source(), selected.job);
                if (invalid) { stop(world, world.source()); return { state: "invalid", reason: invalid }; }
                return { state: "ready" };
            },
            perform: function (context, job, execution) {
                const world: CombatWorld = context.services.world, body = world.observe(world.source());
                if (body === null) return WorldBehavior.failure("actor-left");
                const host = context.services.behavior as WorldMethods.Host;
                if (body.position().minus(WorldCombat.point(job.data.point[0], job.data.point[1], job.data.point[2])).length() > 2.2) {
                    const navigation = host.move(job.data.point, 2, execution);
                    if (navigation === "moving" || navigation === "arrived" || navigation === "busy") return WorldBehavior.running();
                    stop(world, world.source());
                    return WorldBehavior.failure(navigation || "work-unreachable");
                }
                host.stop(); host.face(job.data.point, 20, 20);
                world.operation(job.data.effect, "world_combat:work_step", "{}");
                return WorldBehavior.running();
            },
            pause: function (context) { (context.services.behavior as WorldMethods.Host).stop(); }
        });
    }
}
