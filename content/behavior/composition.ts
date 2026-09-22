/** Open script composition for world behavior. Hosts supply facts and operations; content owns their meaning. */
namespace WorldBehavior {
    export interface Bag { [key: string]: any; }
    /** Protocol identifiers and data belong to the providing content, including each skill's own configuration. */
    export interface Capability { id: string; protocols: string[]; data: any; }
    export interface Frame {
        actor: string; tick: number; facts: Bag; capabilities: Capability[]; services: Bag;
        traits?: Bag; policies?: Policy[];
    }
    export interface Goal { id: string; kind: string; data: any; }
    export interface Offer { id: string; data: any; capabilities?: Capability[]; }
    export interface Choice {
        key: string; goal: Goal; method: Method; offer: Offer;
        /** Runtime-owned transient task observations, retained across offer refresh and suspension. Store plain values, not host scopes. */
        execution?: Bag;
    }
    export interface Context extends Frame {
        senses: Bag; scratch: Bag; memory: Bag; registry: Registry;
        active: Choice | null; suspended: Choice[];
        /** Present while a task callback is running; use its refreshed offer rather than stale captured facts. */
        choice: Choice | null;
    }
    export interface Sensor { id: string; after?: string[]; read(context: Context): any; }
    export interface GoalProvider { id: string; propose(context: Context): Goal[]; }
    export interface Method {
        id: string;
        /** An offer names a continuing intent. Readiness for a single action belongs inside the task. */
        propose(context: Context, goal: Goal): Offer[];
        create(context: Context, choice: Choice): Node;
    }
    export interface Decision { key: string | null; transition?: "replace" | "suspend"; }
    export interface Policy {
        id: string;
        applies?(context: Context): boolean;
        prepare?(context: Context): void;
        goals?(context: Context, goals: Goal[]): Goal[];
        choices?(context: Context, choices: Choice[]): Choice[];
        decide?(context: Context, choices: Choice[], decision: Decision): Decision;
        wrap?(context: Context, choice: Choice, node: Node): Node;
    }
    export interface Result { state: "running" | "succeeded" | "failed"; reason?: string; data?: any; }
    export interface Node {
        enter?(context: Context): void;
        tick(context: Context): Result;
        suspend?(context: Context): void;
        resume?(context: Context): void;
        /** Once for every entered node, including interruption and exceptions. */
        exit?(context: Context, reason: string): void;
    }
    export interface Report {
        state: "idle" | "running" | "succeeded" | "failed";
        choice: Choice | null; suspended: string[]; result?: Result;
    }
    export interface Options {
        /** Omit to use all registered policies whose applies predicate accepts this individual. */
        policies?: string[];
        decide?(context: Context, choices: Choice[], decision: Decision): Decision;
    }
    export function running(data?: any): Result { return { state: "running", data: data }; }
    /** Timing sink for the runtime's phases; the host installs its ledger here, tests leave the no-op. */
    export var profile: { clock(): number; measured(key: string, started: number): void } = { clock: function () { return 0; }, measured: function () { } };
    export function success(data?: any): Result { return { state: "succeeded", data: data }; }
    export function failure(reason: string, data?: any): Result { return { state: "failed", reason: reason, data: data }; }
    export function capabilities(context: Context, protocol: string): Capability[] {
        return context.capabilities.filter(function (capability) { return capability.protocols.indexOf(protocol) >= 0; });
    }
    /** Continuing intent includes both the foreground execution and work held for resumption. */
    export function continuing(context: Context, matches: (choice: Choice) => boolean): boolean {
        return !!context.active && matches(context.active) || (context.suspended || []).some(matches);
    }
    function named<T extends { id: string }>(entries: T[], entry: T): T {
        if (!entry.id || entries.some(function (value) { return value.id === entry.id; }))
            throw new Error("Missing or duplicate behavior component: " + entry.id);
        entries.push(entry); return entry;
    }
    /** Independent registries let content profiles compose libraries without module-global actor state. */
    export class Registry {
        private sensors: Sensor[] = [];
        private goals: GoalProvider[] = [];
        private methods: Method[] = [];
        private policies: Policy[] = [];
        private extensions: { id: string; value: any }[] = [];
        sense(sensor: Sensor): void { named(this.sensors, sensor); }
        goal(provider: GoalProvider): void { named(this.goals, provider); }
        method(method: Method): void { named(this.methods, method); }
        policy(policy: Policy): void { named(this.policies, policy); }
        /** A composition can replace selected defaults without owning another agent or host. */
        replaceSensor(sensor: Sensor): void { this.sensors = this.sensors.filter(value => value.id !== sensor.id); this.sense(sensor); }
        replaceGoal(provider: GoalProvider): void { this.goals = this.goals.filter(value => value.id !== provider.id); this.goal(provider); }
        replaceMethod(method: Method): void { this.methods = this.methods.filter(value => value.id !== method.id); this.method(method); }
        replacePolicy(policy: Policy): void { this.policies = this.policies.filter(value => value.id !== policy.id); this.policy(policy); }
        remove(id: string): void {
            this.sensors = this.sensors.filter(value => value.id !== id); this.goals = this.goals.filter(value => value.id !== id);
            this.methods = this.methods.filter(value => value.id !== id); this.policies = this.policies.filter(value => value.id !== id);
            this.extensions = this.extensions.filter(value => value.id !== id);
        }
        /** Content can introduce further protocols, planners, memory services or component kinds. */
        extension<T>(id: string, value: T): void { named(this.extensions, { id: id, value: value }); }
        get<T>(id: string): T {
            for (var i = 0; i < this.extensions.length; i++) if (this.extensions[i].id === id) return this.extensions[i].value;
            throw new Error("Unknown behavior extension: " + id);
        }
        read(context: Context): void {
            var pending = this.sensors.slice(), done: string[] = [];
            while (pending.length) {
                var index = -1;
                for (var i = 0; i < pending.length; i++) {
                    if ((pending[i].after || []).every(function (id) { return done.indexOf(id) >= 0; })) { index = i; break; }
                }
                if (index < 0) throw new Error("Missing dependency or cycle in behavior sensors: " + pending.map(function (entry) { return entry.id; }).join(", "));
                var sensor = pending.splice(index, 1)[0];
                context.senses[sensor.id] = sensor.read(context); done.push(sensor.id);
            }
        }
        propose(context: Context, policies: Policy[]): Choice[] {
            var goals: Goal[] = [], choices: Choice[] = [], methods = this.methods, t0 = profile.clock();
            this.goals.forEach(function (provider) { goals = goals.concat(provider.propose(context)); });
            profile.measured("propose goals", t0); t0 = profile.clock();
            policies.forEach(function (policy) { if (policy.goals) goals = policy.goals(context, goals); });
            profile.measured("propose policy-goals", t0); t0 = profile.clock();
            var ids: string[] = [];
            goals.forEach(function (goal) {
                if (!goal.id || ids.indexOf(goal.id) >= 0) throw new Error("Missing or duplicate behavior goal: " + goal.id);
                ids.push(goal.id);
                methods.forEach(function (method) {
                    var offers = method.propose(context, goal), offerIds: string[] = [];
                    offers.forEach(function (offer) {
                        if (!offer.id || offerIds.indexOf(offer.id) >= 0) throw new Error("Missing or duplicate behavior offer: " + method.id + "/" + offer.id);
                        offerIds.push(offer.id);
                        choices.push({ key: JSON.stringify([goal.id, method.id, offer.id]), goal: goal, method: method, offer: offer });
                    });
                });
            });
            profile.measured("propose methods", t0); t0 = profile.clock();
            policies.forEach(function (policy) { if (policy.choices) choices = policy.choices(context, choices); });
            profile.measured("propose policy-choices", t0);
            var keys: string[] = [];
            choices.forEach(function (choice) {
                if (keys.indexOf(choice.key) >= 0) throw new Error("Duplicate behavior choice: " + choice.key);
                keys.push(choice.key);
            });
            return choices;
        }
        selected(context: Context, ids?: string[]): Policy[] {
            var all = this.policies;
            var selected = ids ? ids.map(function (id) {
                var found = all.filter(function (policy) { return policy.id === id; });
                if (!found.length) throw new Error("Unknown behavior policy: " + id);
                return found[0];
            }) : all.slice();
            return selected.filter(function (policy) { return !policy.applies || policy.applies(context); });
        }
    }
    function valid(result: Result): Result {
        if (!result || ["running", "succeeded", "failed"].indexOf(result.state) < 0)
            throw new Error("Behavior task returned an invalid result");
        return result;
    }
    /** Runtime state is transient. Durable skill state and memories use the content's own persistence contract. */
    export class Runner {
        private state: "new" | "active" | "paused" | "ended" = "new";
        private result: Result = running();
        constructor(private node: Node) { }
        tick(context: Context): Result {
            if (this.state === "ended") return this.result;
            if (this.state === "paused") return running();
            try {
                if (this.state === "new") { this.state = "active"; if (this.node.enter) this.node.enter(context); }
                this.result = valid(this.node.tick(context));
                if (this.result.state !== "running") this.end(context, this.result.state);
                return this.result;
            } catch (error) { this.end(context, "error"); throw error; }
        }
        suspend(context: Context): void {
            if (this.state !== "active") return;
            this.state = "paused";
            if (this.node.suspend) this.node.suspend(context);
        }
        resume(context: Context): void {
            if (this.state !== "paused") return;
            this.state = "active";
            if (this.node.resume) this.node.resume(context);
        }
        end(context: Context, reason: string): void {
            if (this.state === "ended") return;
            var entered = this.state !== "new";
            this.state = "ended";
            if (this.result.state === "running") this.result = failure(reason);
            if (entered && this.node.exit) this.node.exit(context, reason);
        }
    }
    interface Execution { choice: Choice; runner: Runner; }
    /** One deliberate task at a time, with suspendable work. Concurrent activity can be composed inside a task. */
    export class Agent {
        readonly memory: Bag;
        private current: Execution | null = null;
        private paused: Execution[] = [];
        private lastTick: number | null = null;
        private actor: string | null = null;
        private ticking = false;
        constructor(private registry: Registry, private options: Options = {}, memory: Bag = Object.create(null)) { this.memory = memory; }
        private context(frame: Frame): Context {
            if (!frame.actor || !isFinite(frame.tick)) throw new Error("Behavior frame needs an actor and finite tick");
            if (this.actor !== null && this.actor !== frame.actor) throw new Error("A behavior agent belongs to one individual");
            if (this.lastTick !== null && frame.tick < this.lastTick) throw new Error("Behavior time moved backwards");
            this.actor = frame.actor;
            return { actor: frame.actor, tick: frame.tick, facts: frame.facts, capabilities: frame.capabilities,
                traits: frame.traits || Object.create(null), policies: frame.policies || [],
                services: frame.services, senses: Object.create(null), scratch: Object.create(null), memory: this.memory, registry: this.registry,
                active: this.current ? this.current.choice : null,
                suspended: this.paused.map(function (entry) { return entry.choice; }), choice: null };
        }
        private within<T>(context: Context, entry: Execution, operation: () => T): T {
            var previous = context.choice; context.choice = entry.choice;
            try { return operation(); } finally { context.choice = previous; }
        }
        private end(context: Context, entry: Execution, reason: string): void {
            this.within(context, entry, function () { entry.runner.end(context, reason); });
        }
        tick(frame: Frame): Report {
            if (this.ticking) throw new Error("Reentrant behavior tick");
            var context = this.context(frame);
            this.lastTick = frame.tick;
            this.ticking = true;
            try { return this.advance(context); }
            catch (error) {
                try { this.cleanup(context, "error"); } catch (cleanupError) {
                    if (error instanceof Error) (error as any).cleanupError = cleanupError;
                }
                throw error;
            } finally { this.ticking = false; }
        }
        private advance(context: Context): Report {
            var registry = this.registry, t0 = profile.clock();
            registry.read(context);
            profile.measured("behavior read", t0); t0 = profile.clock();
            var policies = registry.selected(context, this.options.policies).concat((context.policies || [])
                .filter(function (policy) { return !policy.applies || policy.applies(context); }));
            policies.forEach(function (policy) { if (policy.prepare) policy.prepare(context); });
            var choices = registry.propose(context, policies);
            profile.measured("behavior propose", t0); t0 = profile.clock();
            function find(key: string): Choice | null {
                for (var i = 0; i < choices.length; i++) if (choices[i].key === key) return choices[i];
                return null;
            }
            for (var i = this.paused.length - 1; i >= 0; i--) {
                var replacement = find(this.paused[i].choice.key);
                if (replacement) { replacement.execution = this.paused[i].choice.execution; this.paused[i].choice = replacement; }
                else this.end(context, this.paused.splice(i, 1)[0], "unavailable");
            }
            var retained = this.current ? find(this.current.choice.key) : null;
            if (retained) retained.execution = this.current!.choice.execution;
            var restored = this.paused.length ? this.paused[this.paused.length - 1].choice : null;
            var preferred = retained || restored || (choices.length ? choices[0] : null);
            var decision: Decision = { key: preferred ? preferred.key : null, transition: "replace" };
            policies.forEach(function (policy) { if (policy.decide) decision = policy.decide(context, choices, decision); });
            if (this.options.decide) decision = this.options.decide(context, choices, decision);
            profile.measured("behavior decide", t0); t0 = profile.clock();
            var selected = decision.key === null ? null : find(decision.key);
            if (decision.key !== null && !selected) throw new Error("Behavior selected an unavailable choice: " + decision.key);
            if (this.current && (!selected || this.current.choice.key !== selected.key)) {
                var previous = this.current; this.current = null;
                if (decision.transition === "suspend" && retained && selected) {
                    this.paused.push(previous);
                    this.within(context, previous, function () { previous.runner.suspend(context); });
                } else this.end(context, previous, retained ? "replaced" : "unavailable");
            }
            if (!this.current && selected) {
                var index = -1;
                for (var j = 0; j < this.paused.length; j++) if (this.paused[j].choice.key === selected.key) { index = j; break; }
                if (index >= 0) {
                    this.current = this.paused.splice(index, 1)[0]; this.current.choice = selected;
                    var resumed = this.current;
                    this.within(context, resumed, function () { resumed.runner.resume(context); });
                } else {
                    selected.execution = Object.create(null);
                    var node = selected.method.create(context, selected);
                    policies.forEach(function (policy) { if (policy.wrap) node = policy.wrap(context, selected!, node); });
                    this.current = { choice: selected, runner: new Runner(node) };
                }
            }
            if (!this.current) return { state: "idle", choice: null, suspended: this.paused.map(function (entry) { return entry.choice.key; }) };
            if (selected) this.current.choice = selected;
            var execution = this.current;
            context.active = execution.choice;
            context.suspended = this.paused.map(function (entry) { return entry.choice; });
            var result: Result;
            try { result = this.within(context, execution, function () { return execution.runner.tick(context); }); }
            catch (error) { this.current = null; throw error; }
            profile.measured("behavior task", t0);
            if (result.state !== "running") this.current = null;
            return { state: result.state, choice: execution.choice, suspended: this.paused.map(function (entry) { return entry.choice.key; }), result: result };
        }
        /** A fresh frame is required to clean up entered tasks; the agent never retains host services across ticks. */
        stop(reason: string, frame?: Frame): void {
            if (this.ticking) throw new Error("Cannot stop an agent inside its tick; return a task result or change the decision");
            if (!this.current && !this.paused.length) return;
            if (!frame) throw new Error("Stopping active behavior requires a fresh frame");
            this.cleanup(this.context(frame), reason);
        }
        private cleanup(context: Context, reason: string): void {
            var entries = this.paused.slice(); this.paused = [];
            if (this.current) entries.push(this.current);
            this.current = null;
            var error: any = null;
            for (var i = entries.length - 1; i >= 0; i--) {
                try { this.end(context, entries[i], reason); } catch (caught) { if (error === null) error = caught; }
            }
            if (error !== null) throw error;
        }
    }

    export function step(run: (context: Context) => Result, lifecycle?: {
        enter?: (context: Context) => void; exit?: (context: Context, reason: string) => void;
        suspend?: (context: Context) => void; resume?: (context: Context) => void;
    }): Node {
        var hooks = lifecycle || {};
        return { tick: run, enter: hooks.enter, exit: hooks.exit, suspend: hooks.suspend, resume: hooks.resume };
    }
    function finishAll(runners: Runner[], context: Context, reason: string): void {
        var error: any = null;
        runners.forEach(function (runner) { try { runner.end(context, reason); } catch (caught) { if (error === null) error = caught; } });
        if (error !== null) throw error;
    }
    /** Advances at most one child per tick so action completion and the next action have a clear boundary. */
    export function sequence(nodes: Node[]): Node {
        var runners = nodes.map(function (node) { return new Runner(node); }), index = 0;
        return step(function (context) {
            if (index >= runners.length) return success();
            var result = runners[index].tick(context);
            if (result.state === "succeeded") { index++; return index === runners.length ? result : running(); }
            return result;
        }, { suspend: function (context) { if (index < runners.length) runners[index].suspend(context); },
            resume: function (context) { if (index < runners.length) runners[index].resume(context); },
            exit: function (context, reason) { finishAll(runners, context, reason); } });
    }
    export function fallback(nodes: Node[]): Node {
        var runners = nodes.map(function (node) { return new Runner(node); }), index = 0;
        return step(function (context) {
            if (index >= runners.length) return failure("no-method-succeeded");
            var result = runners[index].tick(context);
            if (result.state === "failed") { index++; return index === runners.length ? result : running(); }
            return result;
        }, { suspend: function (context) { if (index < runners.length) runners[index].suspend(context); },
            resume: function (context) { if (index < runners.length) runners[index].resume(context); },
            exit: function (context, reason) { finishAll(runners, context, reason); } });
    }
    /** The supplied reducer defines completion semantics, so racing, all-of and other coordination remain content choices. */
    export function parallel(nodes: Node[], reduce: (results: Result[], context: Context) => Result): Node {
        var runners = nodes.map(function (node) { return new Runner(node); });
        return step(function (context) {
            return reduce(runners.map(function (runner) { return runner.tick(context); }), context);
        }, { suspend: function (context) { runners.forEach(function (runner) { runner.suspend(context); }); },
            resume: function (context) { runners.forEach(function (runner) { runner.resume(context); }); },
            exit: function (context, reason) { finishAll(runners, context, reason); } });
    }
    export function guard(test: (context: Context) => string | null, node: Node): Node {
        var runner = new Runner(node);
        return step(function (context) {
            var reason = test(context); return reason === null ? runner.tick(context) : failure(reason);
        }, { suspend: function (context) { runner.suspend(context); }, resume: function (context) { runner.resume(context); },
            exit: function (context, reason) { runner.end(context, reason); } });
    }
    /** Active elapsed time: suspended work does not complete its wait in the background. */
    export function waitTicks(ticks: number): Node {
        if (!isFinite(ticks) || ticks < 0) throw new Error("Invalid behavior wait");
        var elapsed = 0, previous = 0;
        return step(function (context) { elapsed += context.tick - previous; previous = context.tick; return elapsed >= ticks ? success() : running(); },
            { enter: function (context) { previous = context.tick; }, resume: function (context) { previous = context.tick; } });
    }
    export function waitUntil(test: (context: Context) => boolean): Node {
        return step(function (context) { return test(context) ? success() : running(); });
    }
}
