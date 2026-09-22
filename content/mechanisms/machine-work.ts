/** Pointed jobs use independent world abilities; content supplies eligibility and each native operation. */
namespace MachineWork {
    export interface Job {
        operation: string; point: number[]; block: string; mode: string;
        payload: any; status: "working" | "complete" | "invalid"; reason: string;
    }
    export interface Outcome { state: "working" | "complete" | "invalid"; reason?: string; }
    export interface Operation {
        id: string;
        available(world: CombatWorld, actor: CombatActor): boolean;
        valid(world: CombatWorld, actor: CombatActor, job: Job): string;
        step(world: CombatWorld, actor: CombatActor, job: Job): Outcome;
    }
    export interface Command {
        world(): CombatWorld; actor(): CombatActor; commandPoint(): CombatPoint;
        intent(id: string, target: CombatActor | null, point: CombatPoint | null): void;
        reject(reason: string): never;
    }
    export interface Current { id: number; job: Job; }
    const definition = "world_combat:machine_work";
    const operations: { [id: string]: Operation } = Object.create(null);

    /** Menu, command, current-frame grant and execution all use this same live eligibility check. */
    export function available(world: CombatWorld, actor: CombatActor, operation: string): boolean {
        const spec = operations[operation];
        return !!spec && world.valid(actor) && spec.available(world, actor);
    }
    export function grant(frame: WorldBehavior.Frame, operation: string): void {
        const world: CombatWorld = frame.services.world;
        if (!available(world, world.source(), operation)) return;
        WorldAbilities.grant(frame, { id: operation, action: operation, use: operation,
            protocols: ["world_combat:machine_work"], kind: "point", range: 3 });
    }
    export function current(world: CombatWorld, actor: CombatActor): Current | null {
        const effects = world.effects(actor, definition);
        return effects.length ? { id: effects[0].id(), job: JSON.parse(String(effects[0].data())) } : null;
    }
    export function stop(world: CombatWorld, actor: CombatActor): void {
        const effects = world.effects(actor, definition);
        for (let i = 0; i < effects.length; i++) world.operation(effects[i].id(), "world_combat:stop_work", "{}");
    }
    /** A command replaces the current job; the actor-owned job remains until stopped or completed. */
    export function start(view: Command, operation: string, mode: string, payload: any): void {
        const world = view.world(), actor = view.actor(), target = view.commandPoint(), spec = operations[operation];
        if (!available(world, actor, operation)) view.reject("work-unavailable");
        const body = world.observe(actor);
        if (body === null || target.minus(body.position()).length() > 32) view.reject("out-of-range");
        const block = world.block(target);
        if (block === null) view.reject("invalid-target");
        const job: Job = { operation: operation, mode: mode,
            point: [Math.floor(target.x()) + 0.5, Math.floor(target.y()) + 0.5, Math.floor(target.z()) + 0.5],
            block: String(block!.id()), payload: payload, status: "working", reason: "" };
        const reason = spec.valid(world, actor, job);
        if (reason) view.reject(reason);
        const previous = current(world, actor);
        if (previous && previous.job.status === "working" && previous.job.operation === operation && previous.job.mode === mode
            && previous.job.block === job.block && previous.job.point.every((n, i) => n === job.point[i])) {
            view.intent("work", null, point(previous.job)); return;
        }
        stop(world, actor);
        world.effect(definition, actor, JSON.stringify(job), 1200);
        view.intent("work", null, point(job));
    }
    export function point(job: Job): CombatPoint { return WorldCombat.point(job.point[0], job.point[1], job.point[2]); }
    function invalid(world: CombatWorld, actor: CombatActor, job: Job): string {
        if (!available(world, actor, job.operation)) return "work-unavailable";
        const body = world.observe(actor);
        if (body === null || point(job).minus(body.position()).length() > 64) return "work-unreachable";
        const block = world.block(point(job));
        return block === null || String(block.id()) !== job.block ? "work-target-changed" : operations[job.operation].valid(world, actor, job);
    }

    WorldCombat.effect(definition, 1, 1200, "actor", function (json) {
        const job = JSON.parse(json);
        if (!job || typeof job.operation !== "string" || !Array.isArray(job.point) || typeof job.mode !== "string"
            || job.point.length !== 3 || !job.point.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            throw new Error("Invalid machine work target");
        return JSON.stringify(job);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(definition, "start", function (effect) { effect.schedule("keep", "keep", 20, "{}"); });
    WorldCombat.effectHandler(definition, "keep", function (effect) {
        effect.remaining(1200); effect.schedule("keep", "keep", 20, "{}");
    });
    WorldCombat.effectHandler(definition, "operation:world_combat:stop_work", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });
    WorldCombat.effectHandler(definition, "operation:world_combat:work_step", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        const world = effect.world(), actor = effect.target(), job: Job = JSON.parse(effect.state());
        if (job.status !== "working") return;
        const reason = invalid(world, actor, job);
        const result: Outcome = reason ? { state: "invalid", reason: reason } : operations[job.operation].step(world, actor, job);
        job.status = result.state; job.reason = result.reason || "";
        effect.state(JSON.stringify(job));
    });

    export function register(registry: WorldWork.Registry, spec: Operation,
        observeFrames: (id: string, read: (frame: WorldBehavior.Frame, world: CombatWorld) => void) => void): void {
        if (operations[spec.id]) throw new Error("Duplicate machine operation: " + spec.id);
        operations[spec.id] = spec;
        WorldCombat.registerAction(spec.id, "1", 8, "point", 3, function (action) {
            const sense = action.sense(), actor = action.actor(), selected = current(sense, actor);
            if (!selected || selected.job.operation !== spec.id || selected.job.status !== "working") { action.reject("work-unavailable"); return; }
            const reason = invalid(sense, actor, selected.job);
            if (reason) { action.reject(reason); return; }
            if (action.targetPosition().minus(point(selected.job)).length() > 0.1) { action.reject("work-target-changed"); return; }
            action.commit(0);
            action.world().operation(selected.id, "world_combat:work_step", "{}");
            action.finish();
        });
        observeFrames("world_combat:machine_work", function (frame, world) {
            if (frame.facts.intent !== "work" && current(world, world.source()) !== null) stop(world, world.source());
        });
        registry.register({
            id: spec.id,
            applies: function (context) {
                const world: CombatWorld = context.services.world, selected = current(world, world.source());
                return !context.facts.wild && context.facts.intent === "work" && selected !== null && selected.job.operation === spec.id;
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
                const reason = invalid(world, world.source(), selected.job);
                if (reason) { stop(world, world.source()); return { state: "invalid", reason: reason }; }
                const capability = context.capabilities.filter(item => item.id === spec.id && item.data.action === spec.id)[0];
                if (!capability || capability.data.available === false) {
                    stop(world, world.source()); return { state: "invalid", reason: "work-unavailable" };
                }
                if (context.senses["world_combat:threat"] || context.facts.mounted || context.facts.busy)
                    return { state: "waiting", reason: "work-interrupted" };
                if (world.readiness(spec.id) !== "") return { state: "waiting", reason: "work-interrupted" };
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
                const submitted = WorldAbilities.submit(context, spec.id, { ref: "", point: job.data.point, visible: true, hurtAgo: 0 });
                if (typeof context.services.report === "function")
                    context.services.report(submitted ? "maintaining" : "waiting", submitted ? "world_combat:work-running" : "world_combat:work-interrupted");
                return WorldBehavior.running();
            },
            pause: function (context) { (context.services.behavior as WorldMethods.Host).stop(); }
        });
    }
}
