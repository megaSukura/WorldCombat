/** Reusable task cycle. Providers own what work means and how its completion is observed. */
namespace WorldWork {
    export interface Job { id: string; provider: string; data: any; }
    export interface Inspection { state: "ready" | "complete" | "waiting" | "invalid"; reason?: string; }
    export interface Provider {
        id: string;
        applies?(context: WorldBehavior.Context): boolean;
        discover(context: WorldBehavior.Context): Job[];
        inspect(context: WorldBehavior.Context, job: Job, execution: WorldBehavior.Bag): Inspection;
        perform(context: WorldBehavior.Context, job: Job, execution: WorldBehavior.Bag): WorldBehavior.Result;
        pause?(context: WorldBehavior.Context, job: Job, execution: WorldBehavior.Bag): void;
    }
    export interface Hooks {
        report(context: WorldBehavior.Context, stage: string, reason: string): void;
        stop(context: WorldBehavior.Context): void;
        choose?(context: WorldBehavior.Context, jobs: Job[]): Job | null;
    }
    interface Progress {
        job?: Job; execution: WorldBehavior.Bag; checking?: number; next: number;
        avoided: { [job: string]: number }; completed: number;
    }
    function copy(value: any, parents: any[] = []): any {
        if (value === null || typeof value === "string" || typeof value === "boolean") return value;
        if (typeof value === "number" && isFinite(value)) return value;
        if (parents.indexOf(value) >= 0 || parents.length > 64) throw new Error("Invalid recursive work data");
        var chain = parents.concat([value]);
        if (Array.isArray(value)) return value.map(function (item) { return copy(item, chain); });
        if (typeof value !== "object" || !value || Object.prototype.toString.call(value) !== "[object Object]")
            throw new Error("Work memory requires plain, recoverable data");
        var prototype = Object.getPrototypeOf(value);
        if (prototype !== null && Object.getPrototypeOf(prototype) !== null) throw new Error("Work memory requires plain, recoverable data");
        var result: WorldBehavior.Bag = {};
        Object.keys(value).forEach(function (key) {
            if (key === "__proto__" || key === "constructor" || key === "prototype") throw new Error("Invalid work data key");
            var property = Object.getOwnPropertyDescriptor(value, key)!;
            if (!Object.prototype.hasOwnProperty.call(property, "value")) throw new Error("Work memory requires plain, recoverable data");
            result[key] = copy(property.value, chain);
        });
        return result;
    }
    function key(job: Job): string { return job.provider + "/" + job.id; }
    export class Registry {
        private providers: { [id: string]: Provider } = Object.create(null);
        register(provider: Provider): void {
            if (!provider.id || this.providers[provider.id]) throw new Error("Duplicate or unnamed work provider");
            this.providers[provider.id] = provider;
        }
        supports(context: WorldBehavior.Context): boolean {
            var providers = this.providers;
            return Object.keys(providers).some(function (id) { return !providers[id].applies || providers[id].applies!(context); });
        }
        discover(context: WorldBehavior.Context): Job[] {
            var providers = this.providers, jobs: Job[] = [], known: WorldBehavior.Bag = Object.create(null);
            Object.keys(providers).forEach(function (id) {
                if (providers[id].applies && !providers[id].applies!(context)) return;
                providers[id].discover(context).forEach(function (job) {
                    if (!job.id || job.provider !== id || known[key(job)]) throw new Error("Invalid or duplicate work target");
                    known[key(job)] = true; jobs.push(copy(job));
                });
            });
            return jobs;
        }
        /** Memory survives task suspension; every provider invocation receives the current frame. */
        cycle(memoryKey: string, hooks: Hooks): WorldBehavior.Node {
            if (!memoryKey || memoryKey === "__proto__" || memoryKey === "constructor" || memoryKey === "prototype") throw new Error("Invalid work memory key");
            var registry = this;
            function progress(context: WorldBehavior.Context): Progress {
                return context.memory[memoryKey] || (context.memory[memoryKey] = { execution: {}, next: 0, avoided: {}, completed: 0 });
            }
            function clear(state: Progress): void { delete state.job; delete state.checking; state.execution = {}; }
            function pause(context: WorldBehavior.Context): void {
                var state = progress(context), provider = state.job && registry.providers[state.job.provider];
                if (state.job && provider && provider.pause) provider.pause(context, state.job, state.execution);
                hooks.stop(context);
            }
            // Suspension keeps the recoverable job for threat pauses. A real task exit
            // (manual command, replacement, error or actor handoff) must retire the
            // execution memory as well, otherwise the next task can inherit stale
            // navigation/work data and fail the plain-data boundary.
            function exit(context: WorldBehavior.Context): void {
                pause(context);
                clear(progress(context));
            }
            return WorldBehavior.step(function (context) {
                var state = progress(context);
                Object.keys(state.avoided).forEach(function (id) { if (state.avoided[id] <= context.tick) delete state.avoided[id]; });
                if (!state.job) {
                    if (context.tick < state.next) { hooks.report(context, "waiting", "work-resting"); return WorldBehavior.running(); }
                    var candidates = registry.discover(context).filter(function (job) { return !state.avoided[key(job)]; });
                    var chosen = hooks.choose ? hooks.choose(context, candidates) : candidates[0];
                    if (!chosen) { state.next = context.tick + 40; hooks.stop(context); hooks.report(context, "attending", "work-complete"); return WorldBehavior.success(); }
                    state.job = copy(chosen); state.execution = {};
                    hooks.report(context, "searching", "work-found");
                }
                var job = state.job!, provider = registry.providers[job.provider];
                if (!provider || provider.applies && !provider.applies(context)) { clear(state); return WorldBehavior.failure("work-provider-left"); }
                var inspection = provider.inspect(context, job, state.execution);
                if (inspection.state === "complete") {
                    state.completed++; clear(state); hooks.stop(context); hooks.report(context, "attending", "work-completed"); return WorldBehavior.success();
                }
                if (inspection.state === "invalid") {
                    state.avoided[key(job)] = context.tick + 200; clear(state); hooks.stop(context);
                    hooks.report(context, "blocked", inspection.reason || "work-target-changed"); return WorldBehavior.failure(inspection.reason || "work-target-changed");
                }
                if (inspection.state === "waiting") {
                    hooks.stop(context); hooks.report(context, "waiting", inspection.reason || "work-resources"); return WorldBehavior.running();
                }
                if (state.checking !== undefined) {
                    if (context.tick < state.checking) { hooks.report(context, "checking", "work-checking"); return WorldBehavior.running(); }
                    state.avoided[key(job)] = context.tick + 200; clear(state); hooks.stop(context);
                    hooks.report(context, "blocked", "work-no-change"); return WorldBehavior.failure("work-no-change");
                }
                var result = provider.perform(context, job, state.execution);
                // Enforce recoverability at the provider boundary, including newly written execution data.
                state.execution = copy(state.execution);
                if (result.state === "succeeded") { state.checking = context.tick + 20; return WorldBehavior.running(); }
                if (result.state === "failed") {
                    state.avoided[key(job)] = context.tick + 100; clear(state); hooks.stop(context);
                    hooks.report(context, "blocked", result.reason || "work-interrupted");
                }
                return result;
            }, { suspend: pause, exit: exit });
        }
    }
}
