/** Reusable subject tasks. Hosts supply live observations and operations; providers supply purposes. */
namespace WorldMethods {
    export interface Subject extends WorldBehavior.Bag {
        ref: string; point: number[];
        domain?: string; facts?: WorldBehavior.Bag;
        /** Observed world-axis velocity in blocks per tick; absent when the host supplies no velocity fact. */
        velocity?: number[];
        grounded?: boolean; wet?: boolean; width?: number; height?: number; tags?: string;
        /** Observation ref of the actor this subject is attacking, or "" when none. */
        attacking?: string;
        /** Observation ref of the last living attacker, or "" when none. */
        lastAttacker?: string;
        /** Ticks since a living attacker last hurt this subject; a host with no recorded hit reports a large value. */
        hurtAgo: number;
        /** In sight after hidden/revealed resolution: a hidden, unrevealed subject reports false. Every host observation carries it. */
        visible: boolean;
        /** Carries the shared world_combat:hidden effect. */
        hidden?: boolean;
        /** Carries the reveal marker (minecraft:glowing). */
        revealed?: boolean;
    }
    /** Positive number = exact accepted action instance, 0/false = refusal. Boolean-only hosts retain busy-based completion. */
    export type Submission = number | boolean;
    export interface Host {
        move(point: number[], within: number, memory: WorldBehavior.Bag): string;
        stop(): void;
        face(point: number[], yaw: number, pitch: number): void;
        use(capability: WorldBehavior.Capability, target: Subject): Submission;
        random(): number;
    }
    /**
     * One move's own AI logic. The shared task drives the common shape (choose -> approach -> cast -> follow up);
     * every step is a hook the move can take over:
     * - `available(context, item, purpose, target)`: is this use meaningful now (self state, situation, the proposed target when known).
     *   It is a meaning / willing-to-engage gate, not a hit-distance gate: the shared task selects the target first and then walks in.
     *   A declared engagement range (`ai.maxChase`) belongs here; the actual hit distance belongs to `reach`/`priority`, so a target the
     *   body can still walk to is never filtered out before the approach can run.
     * - `priority(context, item, target)`: orders this move among candidates of the same purpose (higher first); 100 or more
     *   declares it urgent and it goes before the shared goal order (an escape, a set-up or a buff that beats attacking right now).
     *   An otherwise eligible move with priority 0 or below can still be selected by the normal order; it never blocks the approach
     *   on its own.
     * - `selectTarget`: choose a subject before availability and acceptance checks; null declines this proposal.
     * - `accepts(context, item, target)`: is this target right for the move (identity, state, relation) - not distance.
     * - `reach`: how close the body must get before casting, resolved from this individual's current range; `approach(context, item, target, reach)`:
     *   called only while outside that reach. Return an approach point, "wait" to hold this tick, or nothing for the default.
     *   In-range positioning belongs to a method's compose/task nodes; after handles movement once the action finishes.
     * - `target`: choose the casting subject/point after acceptance; `approachTarget`: choose a separate subject to
     *   approach, including for a self cast. Null fails the current use. `execute`: cast it yourself.
     * - `after(context, item, target, progress)`: what happens once the cast has been made - return a running result to keep
     *   acting (retreat, reposition, chain another move), success or failure to end, or nothing for the default.
     *
     * 调用契约：Library.options 先检查 available，Library.ready 再检查 ready 并按 priority 排序。
     * 有目标的查询与执行先应用 selectTarget，再以该目标检查 available/accepts；无目标查询传 null。
     * purpose 在选择时是协议 id，在执行时是方法声明的 purpose。
     * ready 缺省读取 item.data.ready；自定义回调负责自己的就绪判断。
     * Tasks.perform 复核选择后，应用 target，再处理 approachTarget、接近与 ready；
     * self 默认施放位置与接近对象都是自身；显式 target 可提供瞄准点，宿主仍以自身为动作实体目标。
     * 已开始的动作完成后才进入 after。宿主 use／自定义 execute 返回提交实例 id 时按该实例追踪；
     * boolean 宿主可显式写 progress.instance，并通过 actionInstances 服务观察；缺少身份或观察时沿用 busy。
     * 以上判断可在一帧内被多个候选调用，应保持只读。
     * reach 是开始出手的接近距离，使用本个体 resolve 出的当前射程，经 Tasks.options.reachFactor 收束；追击意愿由用途另行判断。
     * self 显式指定 approachTarget 时，reach 表示站位距离，独立于自身施放的目标射程。
     * 当前共享目标如何接入协议，见 content/behaviors/companion/rules.ts 与 wild/rules.ts；
     * 新用途可用同一 registry 注册目标、方法和策略。
     */
    export interface Use {
        protocols: string[];
        ready?(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean;
        available?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, purpose: string, target: Subject | null): boolean;
        priority?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Subject | null): number;
        reach?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, purpose: string): number;
        selectTarget?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, proposed: Subject): Subject | null;
        accepts?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Subject): boolean;
        approachTarget?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Subject): Subject | null;
        approach?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Subject, reach: number): number[] | "wait" | null | void;
        target?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Subject): Subject | null;
        /** Return the submitted instance for host-managed completion; boolean hosts may supply progress.instance explicitly. */
        execute?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Subject, progress: WorldBehavior.Bag): WorldBehavior.Result | Submission;
        after?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Subject, progress: WorldBehavior.Bag): WorldBehavior.Result | void;
    }
    export interface Options {
        report?(context: WorldBehavior.Context, stage: string, reason: string): void;
        mayMove?(context: WorldBehavior.Context): boolean;
        mayApproach?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, purpose: string, target: Subject): boolean;
        reachFactor?: number;
    }
    export interface AbilityMethod {
        id: string; protocol: string; purpose: string;
        matches(context: WorldBehavior.Context, goal: WorldBehavior.Goal): boolean;
        target?(context: WorldBehavior.Context): Subject | null;
        point?(context: WorldBehavior.Context): number[];
        filter?(context: WorldBehavior.Context, capability: WorldBehavior.Capability, goal: WorldBehavior.Goal): boolean;
        candidates?(context: WorldBehavior.Context, goal: WorldBehavior.Goal): WorldBehavior.Capability[];
        compose?(context: WorldBehavior.Context, choice: WorldBehavior.Choice, use: WorldBehavior.Node): WorldBehavior.Node;
    }
    export type Value = number | ((context: WorldBehavior.Context) => number);
    export interface WanderOptions {
        returnDistance?: Value; returnWithin?: Value; returnAnchorTolerance?: Value;
        minRadius?: Value; maxRadius?: Value; within?: Value;
        minPauseTicks?: Value; maxPauseTicks?: Value; excursionTicks?: Value; blockedWaitTicks?: Value;
    }
    export interface WithdrawalOptions {
        safeDistance?: Value; retreatDistance?: Value; homeAdvantage?: Value;
        within?: Value; fallbackWithin?: Value; settleTicks?: number;
    }
    function value(parameter: Value | undefined, context: WorldBehavior.Context, fallback: number): number {
        var result = parameter === undefined ? fallback : typeof parameter === "function" ? parameter(context) : parameter;
        if (typeof result !== "number" || !isFinite(result) || result < 0) throw new Error("Invalid behavior method parameter"); return result;
    }
    export function distance(a: number[], b: number[]): number {
        var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z);
    }
    export function source(context: WorldBehavior.Context): Subject { return context.facts.self; }
    export function find(context: WorldBehavior.Context, ref: string): Subject | null {
        if (source(context).ref === ref) return source(context);
        var nearby: Subject[] = context.facts.nearby || [];
        for (var i = 0; i < nearby.length; i++) if (nearby[i].ref === ref) return nearby[i];
        return null;
    }
    /** The subject a use is being considered for: the active choice's goal, or the candidate the library is proposing against. */
    export function goalSubject(context: WorldBehavior.Context): Subject | null {
        var proposed = context.scratch.proposedTarget as Subject | undefined;
        if (proposed) return find(context, proposed.ref);
        return context.choice ? find(context, context.choice.goal.data.ref) : null;
    }
    function proposing<T>(context: WorldBehavior.Context, target: Subject | null, read: () => T): T {
        var previous = context.scratch.proposedTarget; context.scratch.proposedTarget = target || undefined;
        try { return read(); } finally { context.scratch.proposedTarget = previous; }
    }
    export function recent(context: WorldBehavior.Context, kind: string, ref: string, duration: number): boolean {
        var value = (context.memory.events || {})[kind + ":" + ref]; return typeof value === "number" && context.tick - value < duration;
    }
    export function remember(context: WorldBehavior.Context, kind: string, ref: string): void {
        (context.memory.events || (context.memory.events = {}))[kind + ":" + ref] = context.tick;
    }
    export interface ObservedArea { id: string; position: number[]; radius: number; subjects: string[]; }
    /** Bounded plain memory of actual observations; new subjects or positions remain discoverable. */
    export function rememberArea(context: WorldBehavior.Context, key: string, area: ObservedArea): void {
        if (!area.subjects.length) return;
        var values: ObservedArea[] = context.memory[key] || (context.memory[key] = []);
        var previous = values.filter(function (entry) { return entry.id === area.id; })[0];
        if (previous) previous.subjects = area.subjects.slice();
        else { values.push({ id: area.id, position: area.position.slice(), radius: area.radius, subjects: area.subjects.slice() }); if (values.length > 32) values.shift(); }
    }
    export function observedArea(context: WorldBehavior.Context, key: string, subject: Subject,
                                 reachable: (position: number[]) => boolean): boolean {
        return ((context.memory[key] || []) as ObservedArea[]).some(function (area) {
            return area.subjects.indexOf(subject.ref) >= 0 && distance(area.position, subject.point) <= area.radius && reachable(area.position);
        });
    }
    export function cached<T>(context: WorldBehavior.Context, id: string, read: () => T): T {
        var values = context.scratch.observedFlags || (context.scratch.observedFlags = {});
        if (!Object.prototype.hasOwnProperty.call(values, id)) values[id] = read(); return values[id];
    }
    /** Probe values are cached only for this decision frame, including unavailable (null) observations. */
    export function fact<T>(context: WorldBehavior.Context, probe: string, subject: Subject, argument: any = null): T | null {
        return cached<T | null>(context, JSON.stringify([probe, subject.ref, argument]), function () {
            return context.services.fact(probe, subject.ref, argument);
        });
    }
    export function search(context: WorldBehavior.Context, candidates: Subject[], accepts: (subject: Subject) => boolean,
                           compare?: (a: Subject, b: Subject) => number): Subject | null {
        var matches = candidates.filter(accepts); if (compare) matches.sort(compare); return matches[0] || null;
    }
    export function motion(context: WorldBehavior.Context, key: string, mode: "escaping" | "moving" = "escaping"): WorldBehavior.Bag {
        var previous = context.memory[key] || {}, next: WorldBehavior.Bag = {}, escaping: WorldBehavior.Bag = {};
        (context.facts.nearby as Subject[]).forEach(function (other) {
            if (!other.visible) return;
            var before = previous[other.ref], until = before ? before.until : 0, away = other.point.map(function (value, i) { return value - source(context).point[i]; });
            if (before && context.tick > before.tick && context.tick - before.tick <= 12 && distance(other.point, before.point) <= 4) {
                var length = distance(other.point, source(context).point), outward = 0;
                for (var i = 0; i < 3; i++) outward += (other.point[i] - before.point[i]) * away[i];
                if (mode === "moving" ? distance(other.point, before.point) > .1 : length > 0 && outward / length > 0.25) until = context.tick + 20;
            }
            next[other.ref] = { point: other.point.slice(), tick: context.tick, until: until };
            if (until > context.tick) escaping[other.ref] = true;
        });
        context.memory[key] = next; return escaping;
    }
    /** The selector can name a tool, work recipe, skill or another content-owned usage identity. */
    export class Library {
        private definitions: { [id: string]: Use } = Object.create(null);
        constructor(private selector: (item: WorldBehavior.Capability) => string = function (item) { return item.data.use; }) { }
        register(id: string, definition: Use): void {
            if (!id || this.definitions[id]) throw new Error("Duplicate or unnamed ability usage: " + id);
            this.definitions[id] = definition;
        }
        get(id: string): Use | null { return this.definitions[id] || null; }
        id(item: WorldBehavior.Capability): string { return this.selector(item); }
        forCapability(item: WorldBehavior.Capability): Use | null { return this.get(this.selector(item)); }
        selectTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability, proposed: Subject): Subject | null {
            var rule = this.forCapability(item), target = proposing(context, proposed, function () { return rule && rule.selectTarget ? rule.selectTarget(context, item, proposed) : proposed; });
            return target && !(target.health !== undefined && target.health <= 0) ? target : null;
        }
        accepts(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Subject): boolean {
            var rule = this.forCapability(item); return proposing(context, target, function () { return !!rule && (!rule.accepts || rule.accepts(context, item, target)); });
        }
        available(context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: Subject | null = null): boolean {
            var rule = this.forCapability(item);
            return proposing(context, target, function () { return !!rule && item.data.available !== false && (!rule.available || rule.available(context, item, purpose, target)); });
        }
        options(context: WorldBehavior.Context, protocol: string, target: Subject | null = null): WorldBehavior.Capability[] {
            var library = this;
            return WorldBehavior.capabilities(context, protocol).filter(function (item) {
                var selected = target ? library.selectTarget(context, item, target) : null;
                return (!target || !!selected) && library.available(context, item, protocol, selected) && (!selected || library.accepts(context, item, selected));
            });
        }
        priority(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Subject | null): number {
            var rule = this.forCapability(item);
            var selected = target ? this.selectTarget(context, item, target) : null;
            return proposing(context, selected, function () { return rule && rule.priority ? rule.priority(context, item, selected) : 0; });
        }
        /** Stable order by each use's own priority (higher first); unranked uses keep their declaration order. */
        rank(context: WorldBehavior.Context, items: WorldBehavior.Capability[], target: Subject | null): WorldBehavior.Capability[] {
            var library = this;
            return items.map(function (item, index) { return { item: item, index: index, priority: library.priority(context, item, target) }; })
                .sort(function (a, b) { return b.priority - a.priority || a.index - b.index; }).map(function (entry) { return entry.item; });
        }
        continuing(context: WorldBehavior.Context, id: string): boolean {
            return WorldBehavior.continuing(context, choice => !!choice.offer.capabilities && choice.offer.capabilities.some(item => item.id === id));
        }
        /** Offered plans retain their method's eligibility/purpose; competing uses recheck host readiness and authored aim/readiness. */
        readyChoice(context: WorldBehavior.Context, choice: WorldBehavior.Choice): boolean {
            var library = this, items = choice.offer.capabilities || [];
            var proposed = choice.goal.data && typeof choice.goal.data.ref === "string" ? find(context, choice.goal.data.ref) : null;
            return items.length > 0 && items.every(function (item) {
                var selected = proposed ? library.selectTarget(context, item, proposed) : null;
                return item.data.available !== false && item.data.ready !== false && (!proposed || !!selected)
                    && (!selected || library.accepts(context, item, selected)) && library.isReady(context, item, selected);
            });
        }
        ready(context: WorldBehavior.Context, protocol: string, target: Subject | null = null): WorldBehavior.Capability[] {
            var library = this;
            return this.rank(context, this.options(context, protocol, target).filter(function (item) {
                return library.isReady(context, item, target ? library.selectTarget(context, item, target) : null) || library.continuing(context, item.id);
            }), target);
        }
        isReady(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Subject | null = null): boolean {
            var rule = this.forCapability(item);
            return proposing(context, target, function () { return !!rule && (rule.ready ? rule.ready(context, item) : item.data.ready !== false); });
        }
        capability(context: WorldBehavior.Context, id: string): WorldBehavior.Capability | null {
            for (var i = 0; i < context.capabilities.length; i++) if (context.capabilities[i].id === id) return context.capabilities[i]; return null;
        }
    }
    export class Tasks {
        constructor(readonly library: Library, private options: Options = {}) { }
        private movementBusy(context: WorldBehavior.Context): boolean {
            return context.facts.movementBusy === undefined ? !!context.facts.busy : !!context.facts.movementBusy;
        }
        private instances(context: WorldBehavior.Context): number[] | null {
            var read: (() => number[]) | undefined = context.services.actionInstances;
            return read ? read() : null;
        }
        private actionRunning(context: WorldBehavior.Context, progress: WorldBehavior.Bag): boolean {
            if (!progress.started || progress.following || progress.finished) return false;
            var live = this.instances(context);
            return progress.instance === undefined || live === null ? !!context.facts.busy : live.indexOf(progress.instance) >= 0;
        }
        /** Whether this behavior choice owns an outstanding submitted action, independent of other actor work. */
        running(context: WorldBehavior.Context, choice: WorldBehavior.Choice): boolean {
            var tasks = this, actions: WorldBehavior.Bag[] | undefined = choice.execution && choice.execution["world_combat:actions"];
            return actions === undefined ? !!context.facts.busy : actions.some(progress => tasks.actionRunning(context, progress));
        }
        private track(context: WorldBehavior.Context, progress: WorldBehavior.Bag): void {
            if (!context.choice) return;
            var tasks = this, execution = context.choice.execution || (context.choice.execution = {});
            var actions: WorldBehavior.Bag[] = execution["world_combat:actions"] || [];
            execution["world_combat:actions"] = actions.filter(other => other !== progress && tasks.actionRunning(context, other)).concat([progress]);
        }
        /** A new purpose supplies selection and targeting, while using the same live ability task. */
        method(registry: WorldBehavior.Registry, specification: AbilityMethod): void {
            var tasks = this;
            registry.method({ id: specification.id, propose: function (context, goal) {
                if (!specification.matches(context, goal)) return [];
                var proposed = goal.data && typeof goal.data.ref === "string" ? find(context, goal.data.ref) : null;
                var values = specification.candidates ? specification.candidates(context, goal) : tasks.library.ready(context, specification.protocol, proposed);
                return values.filter(function (item) { return !specification.filter || specification.filter(context, item, goal); })
                    .map(function (item) { return { id: item.id, data: {}, capabilities: [item] }; });
            }, create: function (context, choice) {
                var node = tasks.use(choice.offer.capabilities![0].id, specification.purpose, function (current) {
                    if (specification.point) {
                        var target: Subject = JSON.parse(JSON.stringify(source(current))); target.point = specification.point(current); return target;
                    }
                    return specification.target ? specification.target(current) : goalSubject(current);
                });
                return specification.compose ? specification.compose(context, choice, node) : node;
            } });
        }
        report(context: WorldBehavior.Context, stage: string, reason: string): void {
            if (this.options.report) this.options.report(context, stage, reason);
        }
        stop(context: WorldBehavior.Context): void {
            delete context.memory.navigation;
            if (!this.movementBusy(context)) (context.services.behavior as Host).stop();
        }
        move(context: WorldBehavior.Context, point: number[], within: number): string {
            if (this.movementBusy(context) || this.options.mayMove && !this.options.mayMove(context)) return "moving";
            var memory = context.memory.navigation || (context.memory.navigation = {});
            return (context.services.behavior as Host).move(point, within, memory);
        }
        reach(context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string): number {
            var rule = this.library.forCapability(item); if (!rule) return 0;
            var reach = rule.reach ? rule.reach(context, item, purpose) : item.data.range;
            var limit = item.data.kind === "self" && rule.approachTarget ? reach
                : typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : reach;
            return typeof reach === "number" && isFinite(reach) && reach >= 0 ? Math.min(limit, reach) * (this.options.reachFactor === undefined ? 1 : this.options.reachFactor) : -1;
        }
        perform(context: WorldBehavior.Context, id: string, purpose: string, target: Subject | null, progress: WorldBehavior.Bag): WorldBehavior.Result {
            var item = this.library.capability(context, id);
            this.track(context, progress);
            if (progress.started) {
                if (this.actionRunning(context, progress)) { this.report(context, "maintaining", purpose); return WorldBehavior.running(); }
                // The cast is made: the move decides what comes next until it returns a final result.
                var follow = item ? this.library.forCapability(item) : null;
                if (progress.subject) target = find(context, progress.subject);
                if (follow && follow.after && target) {
                    progress.following = true;
                    var outcome = follow.after(context, item!, target, progress);
                    if (outcome && outcome.state === "running") { this.report(context, "following", purpose); return outcome; }
                    if (outcome) return outcome;
                }
                progress.finished = true;
                return WorldBehavior.success({ cast: id, began: progress.launched });
            }
            if (!item) return WorldBehavior.failure("skill-unavailable");
            if (!target) return WorldBehavior.failure("target-left");
            target = this.library.selectTarget(context, item, target);
            if (!target) return WorldBehavior.failure("target-declined");
            if (!this.library.available(context, item, purpose, target)) return WorldBehavior.failure("skill-unavailable");
            var usage = this.library.forCapability(item)!;
            if (!this.library.accepts(context, item, target)) return WorldBehavior.failure("target-declined");
            var subject = target;
            target = usage.target ? usage.target(context, item, subject) : item.data.kind === "self" ? source(context) : subject;
            if (!target || target.health !== undefined && target.health <= 0) return WorldBehavior.failure("target-left");
            var approachTarget = usage.approachTarget ? usage.approachTarget(context, item, subject) : item.data.kind === "self" ? source(context) : target;
            if (!approachTarget || approachTarget.health !== undefined && approachTarget.health <= 0) return WorldBehavior.failure("target-left");
            if (context.facts.busy && !this.library.isReady(context, item, subject)) return WorldBehavior.running();
            var reach = this.reach(context, item, purpose); if (reach < 0) return WorldBehavior.failure("invalid-use-reach");
            if (distance(source(context).point, approachTarget.point) > reach) {
                if (this.options.mayApproach && !this.options.mayApproach(context, item, purpose, approachTarget)) return WorldBehavior.failure("guard-range");
                var plan = usage.approach ? usage.approach(context, item, approachTarget, reach) : null;
                if (plan === "wait") { this.stop(context); this.report(context, "waiting", purpose); return WorldBehavior.running(); }
                var destination = plan && typeof plan !== "string" ? plan : approachTarget.point, within = plan && typeof plan !== "string" ? 1 : reach;
                var navigation = this.move(context, destination, within), moving = navigation === "moving" || navigation === "arrived";
                this.report(context, moving ? "approaching" : "blocked", moving ? purpose : navigation);
                return moving ? WorldBehavior.running() : WorldBehavior.failure(navigation);
            }
            if (!this.library.isReady(context, item, subject)) return WorldBehavior.failure("skill-not-ready");
            var rule = this.library.forCapability(item)!;
            var result = rule.execute ? rule.execute(context, item, target, progress) : (context.services.behavior as Host).use(item, target);
            if (typeof result !== "boolean" && typeof result !== "number") return result;
            if (typeof result === "number") {
                if (!isFinite(result) || result < 0 || result % 1) throw new Error("Invalid submitted action instance");
                if (result > 0) progress.instance = result;
            }
            if (!result) return WorldBehavior.failure("cast-refused");
            progress.started = true; progress.launched = context.tick;
            if (usage.selectTarget) progress.subject = subject.ref;
            remember(context, purpose, usage.selectTarget || usage.approachTarget ? subject.ref : target.ref); remember(context, "move", this.library.id(item));
            this.report(context, "preparing", this.library.id(item)); return WorldBehavior.running();
        }
        use(id: string, purpose: string, target: (context: WorldBehavior.Context) => Subject | null): WorldBehavior.Node {
            var tasks = this, progress: WorldBehavior.Bag = {};
            return WorldBehavior.step(function (context) { return tasks.perform(context, id, purpose, target(context), progress); },
                { suspend: function (context) { tasks.stop(context); }, exit: function (context) { tasks.stop(context); } });
        }
        at(context: WorldBehavior.Context, id: string, purpose: string, point: number[], progress: WorldBehavior.Bag): WorldBehavior.Result {
            var target: Subject = JSON.parse(JSON.stringify(source(context))); target.point = point.slice();
            return this.perform(context, id, purpose, target, progress);
        }
        travel(destination: (context: WorldBehavior.Context) => number[], within: Value, stage: string, continuous: boolean): WorldBehavior.Node {
            var tasks = this;
            return WorldBehavior.step(function (context) {
                if (tasks.movementBusy(context)) return WorldBehavior.running();
                var result = tasks.move(context, destination(context), value(within, context, 0));
                tasks.report(context, result === "moving" ? "approaching" : result === "arrived" ? stage : "blocked", stage);
                if (result !== "moving" && result !== "arrived") return WorldBehavior.failure(result);
                return result === "arrived" && !continuous ? WorldBehavior.success() : WorldBehavior.running();
            }, { suspend: function (context) { tasks.stop(context); }, exit: function (context) { tasks.stop(context); } });
        }
        hold(reason: string): WorldBehavior.Node {
            var tasks = this; return WorldBehavior.step(function (context) {
                if (!tasks.movementBusy(context) && !context.facts.mounted) tasks.stop(context);
                tasks.report(context, "idle", reason); return WorldBehavior.running();
            }, { exit: function (context) { tasks.stop(context); } });
        }
        wander(home: (context: WorldBehavior.Context) => number[], reason: string, options: WanderOptions = {}): WorldBehavior.Node {
            var tasks = this;
            return WorldBehavior.step(function (context) {
                if (tasks.movementBusy(context)) return WorldBehavior.running();
                var anchor = home(context), host = context.services.behavior as Host;
                var minPause = value(options.minPauseTicks, context, 80), maxPause = value(options.maxPauseTicks, context, 160);
                if (maxPause < minPause) throw new Error("Wander pause interval is reversed");
                if (distance(source(context).point, anchor) > value(options.returnDistance, context, 9)) {
                    delete context.memory.explore;
                    if (context.tick < (context.memory.returnAfter || 0) && context.memory.returnPoint && distance(anchor, context.memory.returnPoint) < value(options.returnAnchorTolerance, context, 3)) {
                        tasks.report(context, "blocked", "path-blocked"); return WorldBehavior.running();
                    }
                    var returning = tasks.move(context, anchor, value(options.returnWithin, context, 3));
                    if (returning === "path-blocked") { tasks.stop(context); context.memory.returnAfter = context.tick + value(options.blockedWaitTicks, context, 80); context.memory.returnPoint = anchor.slice(); }
                    tasks.report(context, returning === "path-blocked" ? "blocked" : "approaching", returning === "path-blocked" ? "path-blocked" : "returning");
                    return WorldBehavior.running();
                }
                var exploration = context.memory.explore || (context.memory.explore = { next: context.tick + minPause, goal: null, until: 0 });
                if (exploration.goal) {
                    var result = tasks.move(context, exploration.goal, value(options.within, context, 1.2));
                    if (result === "arrived" || result === "path-blocked" || context.tick >= exploration.until) {
                        tasks.stop(context); exploration.goal = null; exploration.next = context.tick + minPause + Math.floor(host.random() * (maxPause - minPause));
                    }
                } else if (context.tick >= exploration.next) {
                    var minRadius = value(options.minRadius, context, 2), maxRadius = value(options.maxRadius, context, 5);
                    if (maxRadius < minRadius) throw new Error("Wander radius interval is reversed");
                    var angle = host.random() * Math.PI * 2, radius = minRadius + host.random() * (maxRadius - minRadius);
                    exploration.goal = [anchor[0] + Math.cos(angle) * radius, anchor[1], anchor[2] + Math.sin(angle) * radius]; exploration.until = context.tick + value(options.excursionTicks, context, 120);
                }
                tasks.report(context, exploration.goal ? "observing" : "idle", reason); return WorldBehavior.running();
            }, { exit: function (context) { tasks.stop(context); } });
        }
        withdraw(threat: (context: WorldBehavior.Context) => Subject | null, home: (context: WorldBehavior.Context) => Subject | null,
                 constrain: (context: WorldBehavior.Context, point: number[]) => number[], options: WithdrawalOptions = {}): WorldBehavior.Node {
            var tasks = this, destination: number[] = [];
            return WorldBehavior.sequence([
                WorldBehavior.step(function (context) {
                    var danger = threat(context); if (!danger) return WorldBehavior.failure("target-left");
                    var self = source(context), refuge = home(context), dx = self.point[0] - danger.point[0], dz = self.point[2] - danger.point[2];
                    var length = Math.sqrt(dx * dx + dz * dz) || 1;
                    var retreat = value(options.retreatDistance, context, 7);
                    destination = distance(self.point, danger.point) >= value(options.safeDistance, context, 8) ? self.point.slice()
                        : refuge && distance(refuge.point, danger.point) > distance(self.point, danger.point) + value(options.homeAdvantage, context, 2) ? refuge.point.slice()
                        : constrain(context, [self.point[0] + dx / length * retreat, self.point[1], self.point[2] + dz / length * retreat]);
                    return WorldBehavior.success();
                }), WorldBehavior.fallback([
                    tasks.travel(function () { return destination; }, options.within === undefined ? 1.5 : options.within, "retreating", false),
                    tasks.travel(function (context) { return context.facts.anchor; }, options.fallbackWithin === undefined ? 2.5 : options.fallbackWithin, "retreating", false)
                ]), WorldBehavior.waitTicks(options.settleTicks === undefined ? 12 : options.settleTicks)
            ]);
        }
        observe(target: (context: WorldBehavior.Context) => Subject | null, within: number, ticks: number, reason: string): WorldBehavior.Node {
            var tasks = this;
            return WorldBehavior.sequence([
                WorldBehavior.step(function (context) {
                    var subject = target(context); if (!subject) return WorldBehavior.failure("target-left");
                    var result = tasks.move(context, subject.point, within); tasks.report(context, "approaching", reason);
                    return result === "arrived" ? WorldBehavior.success() : result === "moving" ? WorldBehavior.running() : WorldBehavior.failure(result);
                }), WorldBehavior.step(function (context) {
                    var subject = target(context); if (!subject) return WorldBehavior.failure("target-left");
                    tasks.stop(context); (context.services.behavior as Host).face(subject.point, 12, 12);
                    remember(context, "observe", subject.ref); tasks.report(context, "observing", reason); return WorldBehavior.success();
                }), WorldBehavior.waitTicks(ticks)
            ]);
        }
        work(registry: WorldWork.Registry, key: string): WorldBehavior.Node {
            var tasks = this;
            return registry.cycle(key, { report: function (context, stage, reason) { tasks.report(context, stage, reason); }, stop: function (context) { tasks.stop(context); },
                choose: function (context, jobs) {
                    return jobs.sort(function (a, b) { return distance(source(context).point, a.data.point || context.facts.anchor) - distance(source(context).point, b.data.point || context.facts.anchor); })[0] || null;
                } });
        }
    }
    export interface Runtime { agent: WorldBehavior.Agent; seen: number; manual: number; }
    /** A pool belongs to the composition that constructs it; it never stores a live host frame. */
    export class Pool {
        private entries: { [actor: string]: Runtime } = Object.create(null);
        constructor(private registry: WorldBehavior.Registry, private options: WorldBehavior.Options = {}, private enrich?: (frame: WorldBehavior.Frame) => void) { }
        get(frame: WorldBehavior.Frame, memory?: WorldBehavior.Bag): Runtime {
            if (this.enrich) this.enrich(frame);
            var current = this.entries[frame.actor];
            if (!current || current.seen > frame.tick) current = this.entries[frame.actor] = { agent: new WorldBehavior.Agent(this.registry, this.options, memory || {}), seen: frame.tick, manual: -1 };
            current.seen = frame.tick;
            var entries = this.entries;
            Object.keys(entries).forEach(function (id) { if (id !== frame.actor && (entries[id].seen > frame.tick || frame.tick - entries[id].seen > 1200)) delete entries[id]; });
            return current;
        }
        stop(frame: WorldBehavior.Frame, reason: string): void {
            var entry = this.entries[frame.actor]; if (entry) entry.agent.stop(reason, frame); delete this.entries[frame.actor];
        }
        forget(id: string): void { delete this.entries[id]; }
    }
}
