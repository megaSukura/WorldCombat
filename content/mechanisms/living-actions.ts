/** Shared action choreography. Content owns timing, aim, movement and interruption policy. */
namespace LivingActions {
    /** True once for this named action-local gate; its storage follows the action, including deferred callbacks. */
    export function first(action: CombatAction, key: string): boolean {
        var id = "world_combat:once/" + key.replace(":", "/");
        if (action.data(id) !== null) return false;
        action.data(id, "{}"); return true;
    }
    export interface Lifecycle { interruptible?: boolean | ((action: CombatAction) => boolean); }
    /** Shared and self-managed rhythms use the same action-owned subscriptions and host cleanup. */
    export function lifecycle(action: CombatAction, policy: Lifecycle = {}): void {
        var key = "world_combat:lifecycle", previous = action.data(key);
        if (previous !== null && policy.interruptible === undefined) return;
        if (previous !== null) {
            var old = JSON.parse(previous); action.off(old.interrupt); action.off(old.stop);
        }
        var interrupt = action.on("world_combat:interrupt", function (current) {
            if (policy.interruptible !== false && (typeof policy.interruptible !== "function" || policy.interruptible(current))) current.cancel();
        });
        var stop = action.on("world_combat:input-stop", function (current) { current.cancel(); });
        action.data(key, JSON.stringify({ interrupt: interrupt, stop: stop }));
    }
    /** Authoritative cancellation uses the host's cleanup path for every action definition. */
    export function interrupt(world: CombatWorld, actor: CombatActor, reason = "world_combat:interrupt"): boolean {
        return world.interrupt(actor, reason);
    }
    const interruptRequests: { actor: string; ended: { [instance: string]: boolean } }[] = [];
    /** Delivers the normal policy-respecting signal; counts actual synchronous action ends, not listener presence. */
    export function requestInterrupt(world: CombatWorld, actor: CombatActor, signal = "world_combat:interrupt"): number {
        const request = { actor: String(actor.ref()), ended: {} as { [instance: string]: boolean } };
        interruptRequests.push(request);
        try { world.deliver(actor, signal); return Object.keys(request.ended).length; }
        finally { interruptRequests.pop(); }
    }
    WorldCombat.on("world_combat:interrupt/receipt", "world_combat:action_ended", "", event => {
        if (!interruptRequests.length) return;
        const actor = String(event.actor().ref()), data = JSON.parse(String(event.data()));
        interruptRequests.forEach(request => { if (request.actor === actor) request.ended[String(data.instance)] = true; });
    });

    /** A bounded inline input view; the original action owns costs, cooldown identity, timers and cleanup. */
    export interface Input {
        target: string | null; point: number[]; direction: number[]; range: number; cooldown?: number; released?: boolean; committed?: boolean;
        metadata?: any; live?: boolean; anchor?: number[]; kind?: ReturnType<CombatAction["targetKind"]>;
    }
    function point(value: number[]): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }
    export function coordinates(value: CombatPoint): number[] { return [value.x(), value.y(), value.z()]; }
    /** Unwrap before handing an action to an opaque native resource adapter. */
    export function host(action: CombatAction): CombatAction { return action instanceof InputView ? action.native : action; }
    /** Settle one hit, retaining the original target's last point if that hit ends its life.
     * Target-specific follow-ups still observe the target; independent follow-ups keep the paid action alive.
     * A different area victim does not release a living original target, and source/action invalidation still propagates.
     */
    export function settleHit(action: CombatAction, settle: () => boolean): boolean {
        var native = host(action), original = native.target(), world = action.sense();
        if (original !== null && world.valid(original)) {
            native.targetPosition();
            if (native !== action) action.targetPosition();
        }
        var landed = settle(), current = native.target();
        if (original !== null && current !== null && String(current.ref()) === String(original.ref()) && !world.valid(original))
            action.releaseTarget();
        return landed;
    }
    export function input(action: CombatAction, selection: Input, prepaidValidation?: (action: CombatAction) => string): CombatAction {
        return new InputView(host(action), selection, prepaidValidation);
    }
    class InputView implements CombatAction {
        constructor(public native: CombatAction, private selection: Input, private prepaidValidation?: (action: CombatAction) => string) {
            if (selection.target !== null && !selection.live && !selection.released && !selection.anchor) {
                const target = this.target(), body = target && this.sense().observe(target);
                if (body) {
                    const min = coordinates(body.boundsMin()), max = coordinates(body.boundsMax());
                    selection.anchor = min.map((low, i) => max[i] === low ? .5 : Math.max(0, Math.min(1, (selection.point[i] - low) / (max[i] - low))));
                }
            }
        }
        private bodyPoint(body: CombatObservation): number[] {
            const min = coordinates(body.boundsMin()), max = coordinates(body.boundsMax()), anchor = this.selection.anchor!;
            return min.map((low, i) => low + (max[i] - low) * anchor[i]);
        }
        private next(current: CombatAction): CombatAction { return new InputView(current, this.selection, this.prepaidValidation); }
        id() { return this.native.id(); }
        parent() { return this.native.parent(); }
        child(action: string, target: CombatActor | null, at: CombatPoint, direction: CombatPoint, args: string, lifetime: "linked" | "independent") {
            return this.native.child(action, target, at, direction, args, lifetime);
        }
        content() { return this.native.content(); }
        actor() { return this.native.actor(); }
        target() { return this.selection.live ? this.native.target() : this.selection.target === null ? null : this.sense().actor(this.selection.target); }
        direction() { return this.selection.live ? this.native.direction() : point(this.selection.direction); }
        range() { return this.selection.live ? this.native.range() : this.selection.range; }
        targetKind() { return this.selection.live ? this.native.targetKind() : this.selection.kind || this.native.targetKind(); }
        retarget(kind: ReturnType<CombatAction["targetKind"]>, target: CombatActor | null, at: CombatPoint, direction: CombatPoint, range: number) {
            this.native.retarget(kind, target, at, direction, range);
            this.selection.live = true;
        }
        origin() { return this.native.origin(); }
        targetPosition() {
            if (this.selection.live) return this.native.targetPosition();
            if (this.selection.target !== null && !this.selection.released) {
                var target = this.target(), body = target && this.sense().observe(target);
                if (!body) { this.reject("target-left"); return point(this.selection.point); }
                this.selection.point = this.bodyPoint(body);
            }
            return point(this.selection.point);
        }
        releaseTarget() {
            this.native.releaseTarget();
            if (this.selection.live) this.selection.point = coordinates(this.native.targetPosition());
            else if (!this.selection.released && this.selection.target !== null) {
                var target = this.sense().actor(this.selection.target), body = target && this.sense().observe(target);
                if (body) this.selection.point = this.bodyPoint(body);
            }
            this.selection.released = true;
        }
        argument(key: string) { return this.native.argument(key); }
        control() { return this.native.control(); }
        movementLease() { return this.native.movementLease(); }
        data(key: string): string | null;
        data(key: string, json: string): void;
        data(key: string, json?: string): any { return json === undefined ? this.native.data(key) : this.native.data(key, json); }
        stage(stage: string) { this.native.stage(stage); }
        face(at: CombatPoint, yaw: number, pitch: number) { this.native.face(at, yaw, pitch); }
        present(key: string, type: string, version: number, at: CombatPoint, data: string) { this.native.present(key, type, version, at, data); }
        reject(reason: string) { this.native.reject(reason); }
        commit(cooldown: number) {
            if (this.prepaidValidation) {
                if (this.selection.committed) throw new Error("Inline action already committed");
                const reason = this.prepaidValidation(this);
                if (reason) { this.reject(reason); return; }
                this.selection.committed = true;
                return;
            }
            if (!this.selection.live) this.retarget(this.targetKind(), this.target(), this.targetPosition(), this.direction(), this.range());
            this.native.commit(this.selection.cooldown === undefined ? cooldown : this.selection.cooldown);
            this.selection.committed = true;
        }
        cost(cost: CombatCost) { this.native.cost(cost); }
        after(ticks: number, callback: (action: CombatAction) => void) { this.native.after(ticks, current => callback(this.next(current))); }
        on(event: string, callback: (action: CombatAction) => void) { return this.native.on(event, current => callback(this.next(current))); }
        off(token: number) { this.native.off(token); }
        emit(event: string) { this.native.emit(event); }
        trace(from: CombatPoint, to: CombatPoint, radius: number, hitAllies = false) { return this.native.trace(from, to, radius, hitAllies); }
        moveSweep(delta: CombatPoint, radius: number, ignoredContacts?: string) { return this.native.moveSweep(delta, radius, ignoredContacts || "[]"); }
        projectile(origin: CombatPoint, velocity: CombatPoint, gravity: number, radius: number, range: number, lifetime: number,
            hit: (action: CombatAction, impact: CombatImpact) => void, complete: (action: CombatAction) => void, appearance?: string) {
            this.releaseTarget();
            return this.native.projectile(origin, velocity, gravity, radius, range, lifetime,
                (current, impact) => hit(this.next(current), impact), current => complete(this.next(current)), appearance || "{}");
        }
        damage(impact: CombatImpact, amount: number) { return this.hit(impact, amount, "primary", "{}"); }
        hit(impact: CombatImpact, amount: number, strike: string, metadata: string) {
            var data = JSON.parse(metadata), extra = this.selection.metadata || {};
            Object.keys(extra).forEach(function (key) { data[key] = extra[key]; });
            return this.native.hit(impact, amount, strike, JSON.stringify(data));
        }
        world() { return this.native.world(); }
        sense() { return this.native.sense(); }
        approach(within: number, speed: number) {
            var destination = this.targetPosition();
            if (destination.minus(this.native.targetPosition()).length() < .001) return this.native.approach(within, speed);
            if (!this.selection.committed) { this.reject("invalid-target"); return "invalid-target"; }
            return this.world().navigate(destination, within, speed);
        }
        stopMovement() { this.native.stopMovement(); }
        effect(definition: string, target: CombatActor, data: string, ticks: number) { return this.native.effect(definition, target, data, ticks); }
        signal(event: string, version: number, target: CombatActor, data: string) { return this.native.signal(event, version, target, data); }
        effectOperation(effect: number, operation: string, data: string) { return this.native.effectOperation(effect, operation, data); }
        particle(position: CombatPoint) { this.native.particle(position); }
        finish() { this.native.finish(); }
        cancel() { this.native.cancel(); }
    }
    export interface Preparation { instance: number; sequence: number; identity: string; remaining: number; total: number; advanced: number; }
    export interface Start { action: CombatAction; sequence: number; identity: string; tick: number; prepare: number; }
    /** One notification per real shared choreography, including zero preparation. Observers do not alter its timing. */
    export const started = new WorldContributions.Registry<Start>();
    let preparationSequence = 0;
    interface PreparationClock { actor: string; sequence: number; identity: string; total: number; elapsed: number; tick: number; token: number; advanced: number; }
    const preparationClocks: { [instance: string]: PreparationClock } = Object.create(null);
    const preparationRequests: { [instance: string]: { ticks: number; advanced: number } } = Object.create(null);
    const preparationChannel = "world_combat:preparation/advance";
    /** Only the standard run preparation is declared here; custom action waits and later phases remain their own clocks. */
    export function preparing(world: CombatWorld, actor: CombatActor): Preparation[] {
        if (!world.valid(actor) || world.observe(actor) === null) return [];
        const ref = String(actor.ref()), now = world.tick(), result: Preparation[] = [];
        Object.keys(preparationClocks).forEach(id => {
            const clock = preparationClocks[id]; if (clock.actor !== ref) return;
            const remaining = Math.max(0, clock.total - clock.elapsed - Math.max(0, now - clock.tick));
            if (remaining > 0) result.push({ instance: Number(id), sequence: clock.sequence, identity: clock.identity, remaining: remaining, total: clock.total, advanced: clock.advanced });
        });
        return result;
    }
    /** Writable delivery to a live instance; returns actual shortened ticks, preserving at least one preparation tick. */
    export function advancePreparation(world: CombatWorld, actor: CombatActor, instance: number, ticks: number): number {
        if (!isFinite(ticks) || ticks < 1 || ticks % 1) return 0;
        if (preparationRequests[String(instance)] || !preparing(world, actor).some(clock => clock.instance === instance && clock.remaining > 1)) return 0;
        const request = { ticks: ticks, advanced: 0 }; preparationRequests[String(instance)] = request;
        try { world.deliver(actor, instance, preparationChannel); return request.advanced; }
        finally { delete preparationRequests[String(instance)]; }
    }
    WorldCombat.on("world_combat:preparation/ended", "world_combat:action_ended", "", event => {
        const id = String(JSON.parse(event.data()).instance);
        delete preparationClocks[id]; delete preparationRequests[id];
    });
    export interface Plan {
        prepare: number; recover: number; cooldown: number;
        /** Current recipe identity, distinct from an inline caller's host action id. */
        identity?: string;
        stationary?: boolean; turn?: number; interruptible?: Lifecycle["interruptible"];
        stage?: (action: CombatAction, phase: string, elapsed: number, duration: number) => void;
        ready?: (action: CombatAction) => string;
    }
    export function run(action: CombatAction, plan: Plan,
                        execute: (action: CombatAction, complete: (current: CombatAction) => void) => void): void {
        [plan.prepare, plan.recover, plan.cooldown].forEach(function (ticks) {
            if (!isFinite(ticks) || ticks < 0 || ticks % 1) throw new Error("Invalid action timing");
        });
        var initialReason = plan.ready ? plan.ready(action) : "";
        if (initialReason) { action.reject(initialReason); return; }
        var completed = false, preparationTicks = plan.prepare;
        lifecycle(action, { interruptible: plan.interruptible });
        const preparationId = String(action.id());
        const startSequence = ++preparationSequence, identity = plan.identity || String(action.content());
        if (preparationTicks > 0) {
            const clock: PreparationClock = { actor: String(action.actor().ref()), sequence: startSequence, identity: identity, total: preparationTicks, elapsed: 0,
                tick: action.sense().tick(), token: 0, advanced: 0 };
            clock.token = action.on(preparationChannel, current => {
                const request = preparationRequests[preparationId]; if (!request || preparationClocks[preparationId] !== clock) return;
                const remaining = preparationTicks - clock.elapsed - Math.max(0, current.sense().tick() - clock.tick);
                const shortened = Math.max(0, Math.min(request.ticks, remaining - 1));
                preparationTicks -= shortened; clock.total = preparationTicks; clock.advanced += shortened; request.advanced = shortened;
            });
            preparationClocks[preparationId] = clock;
        }
        function releasePreparation(current: CombatAction): void {
            const clock = preparationClocks[preparationId];
            if (clock) { current.off(clock.token); delete preparationClocks[preparationId]; }
        }
        function phase(current: CombatAction, name: string, elapsed: number, duration: number): void {
            current.stage(name);
            posture(current, plan);
            if (plan.stage) plan.stage(current, name, elapsed, duration);
        }
        function recover(current: CombatAction, elapsed: number): void {
            if (elapsed >= plan.recover) { current.finish(); return; }
            phase(current, "recovering", elapsed, plan.recover);
            current.after(1, function (next) { recover(next, elapsed + 1); });
        }
        function complete(current: CombatAction): void {
            if (completed) throw new Error("Action execution completed twice");
            completed = true; current.releaseTarget(); recover(current, 0);
        }
        function prepare(current: CombatAction, elapsed: number): void {
            if (elapsed < preparationTicks) {
                const clock = preparationClocks[preparationId];
                if (clock) { clock.elapsed = elapsed; clock.tick = current.sense().tick(); }
                phase(current, "preparing", elapsed, preparationTicks);
                current.after(1, function (next) { prepare(next, elapsed + 1); });
                return;
            }
            releasePreparation(current);
            var reason = plan.ready ? plan.ready(current) : "";
            if (reason) { current.reject(reason); return; }
            current.commit(plan.cooldown);
            phase(current, "executing", 0, 1);
            execute(current, complete);
        }
        started.apply({ action: action, sequence: startSequence, identity: identity, tick: action.sense().tick(), prepare: preparationTicks });
        prepare(action, 0);
    }
    /**
     * The same posture rule `run` applies per beat, for actions that drive their own multi-beat segment:
     * hold position when stationary, and turn toward the target when a turn rate is set.
     */
    export function posture(action: CombatAction, plan: { stationary?: boolean; turn?: number }): void {
        if (plan.stationary) action.stopMovement();
        if (plan.turn) {
            var facing = action.targetPosition();
            if (facing.minus(action.origin()).length() < 0.01) facing = action.origin().plus(action.direction());
            action.face(facing, plan.turn, plan.turn);
        }
    }
    /**
     * Moves `delta` in legal steps because the host caps one displace at 4 blocks; stops when a step is
     * blocked and returns the distance actually applied. Content computes large launches, the host keeps
     * native collision and lifecycle.
     */
    export function step(world: CombatWorld, actor: CombatActor, delta: CombatPoint, budget = 4): number {
        if (!(budget > 0) || !isFinite(budget)) throw new Error("Invalid step budget");
        var remaining = delta, moved = 0;
        for (var guard = 0; guard < 64 && remaining.length() > 1e-6; guard++) {
            var leg = remaining.length() <= budget ? remaining : remaining.unit().scale(budget);
            var applied = world.displace(actor, leg);
            moved += applied;
            if (!(applied > 0) || applied < leg.length() - 1e-6) break;
            remaining = remaining.minus(leg);
        }
        return moved;
    }
    /** Whether the host exposes the native free-space probe (feet-centred; load, block and living-collision aware). */
    export function hasFreeSpace(world: CombatWorld): boolean { return typeof (world as any).freeSpace === "function"; }
    /** Native probe for one feet-centre point; throws only when the host entry is missing. */
    export function freeSpace(world: CombatWorld, point: CombatPoint, width: number, height: number): boolean {
        var probe = (world as any).freeSpace;
        if (typeof probe !== "function") throw new Error("world.freeSpace is unavailable");
        return !!probe.call(world, point, width, height);
    }
    /** First free feet-centre within `radius` of `centre`, reusing the native probe; null when none is free. */
    export function freeSpot(world: CombatWorld, centre: CombatPoint, width: number, height: number, radius = 3): CombatPoint | null {
        if (!hasFreeSpace(world)) return null;
        var offsets: CombatPoint[] = [WorldCombat.point(0, 0, 0)], reach = Math.max(0, Math.floor(radius));
        for (var ring = 1; ring <= reach; ring++) {
            offsets.push(WorldCombat.point(ring, 0, 0), WorldCombat.point(-ring, 0, 0), WorldCombat.point(0, 0, ring), WorldCombat.point(0, 0, -ring),
                WorldCombat.point(ring, 0, ring), WorldCombat.point(-ring, 0, ring), WorldCombat.point(ring, 0, -ring), WorldCombat.point(-ring, 0, -ring));
        }
        for (var i = 0; i < offsets.length; i++) {
            var candidate = centre.plus(offsets[i]);
            if (freeSpace(world, candidate, width, height)) return candidate;
        }
        return null;
    }
    /** Item or atlas-sprite form reused by helpers; sprite may name an item or particle texture. */
    export interface Appearance {
        item?: string; sprite?: string; scale?: number; tint?: number; glow?: boolean;
        /** Degrees per game tick: billboard roll for a sprite, vertical yaw for an item/block. true means 4. */
        spin?: number | boolean;
    }
    /** Native projectile options forwarded with its appearance payload, matching what the host renders. */
    export interface ProjectileAppearance extends Appearance {
        /** After actual native movement/deflection, before gravity: (v + unit(v)*acceleration)*drag.
         * acceleration defaults to 0; optional drag/waterDrag are velocity retention 0..1. Omission keeps native .99/.8.
         * Range and lifetime still bound the flight; zero speed never creates a guessed direction. */
        acceleration?: number; drag?: number; waterDrag?: number;
        /** Allow native collision delivery to allies; the hit callback decides healing or another friendly interaction. */
        hitAllies?: boolean;
        /** A whole block rendered as the projectile; `item`/`sprite` are the other forms. */
        block?: string;
        /** A pierced target cannot be hit again by this flight; guidance ends after that contact. */
        homing?: { target: string; turn?: number; delay?: number; range?: number };
        /** Number of entities passed through, or true for every entity once; walls, range and lifetime still end flight. */
        pierce?: number | boolean; bounce?: number; restitution?: number;
    }
    export interface Flight {
        speed: number; range: number; radius: number; direction?: CombatPoint;
        /** Actual reachable launch point, also used to derive aim. Defaults to action.origin(). */
        origin?: CombatPoint;
        gravity?: number;
        lifetime?: number;
        appearance?: ProjectileAppearance;
        impact: (action: CombatAction, impact: CombatImpact, age: number) => void;
    }
    export interface BallisticSolution {
        direction: CombatPoint;
        /** Arrival in ticks, including the final partial tick. */
        ticks: number;
        /** Native per-tick motion segments up to the target. */
        points: CombatPoint[];
        length: number;
    }
    /** Read-only trajectory in air. Vanilla moves first, then applies air drag and gravity.
     * Native water drag, collisions and deflections still govern the actual entity. */
    export function ballisticPath(origin: CombatPoint, velocity: CombatPoint, gravity: number, ticks: number): CombatPoint[] {
        if (!(ticks >= 0) || !isFinite(ticks) || !(gravity >= 0) || !isFinite(gravity)) throw new Error("Invalid ballistic path");
        const points = [origin]; let at = origin, motion = velocity;
        for (let elapsed = 0; elapsed < ticks; elapsed++) {
            at = at.plus(motion.scale(Math.min(1, ticks - elapsed))); points.push(at);
            motion = WorldCombat.point(motion.x() * .99, motion.y() * .99 - gravity, motion.z() * .99);
        }
        return points;
    }
    /** Low and high launch solutions in arrival order, restricted to the caller's flight lifetime.
     * A reachable point can have only its low solution inside that lifetime. No solution means no
     * launch at the requested speed can arrive in time; callers choose another point or report it. */
    export function ballisticSolutions(origin: CombatPoint, target: CombatPoint, speed: number, gravity: number, maximumTicks: number): BallisticSolution[] {
        if (!isFinite(speed) || speed <= 0 || !isFinite(gravity) || gravity <= 0 || !isFinite(maximumTicks) || maximumTicks <= 0)
            throw new Error("Invalid ballistic geometry");
        const delta = target.minus(origin), drag = .99, epsilon = Math.min(.0001, maximumTicks / 100);
        if (delta.length() < .01) return [];
        function required(time: number): CombatPoint {
            const steps = Math.floor(time), fraction = time - steps, decay = Math.pow(drag, steps);
            const distance = (1 - decay) / (1 - drag) + fraction * decay;
            const fall = gravity / (1 - drag) * (steps - (1 - decay) / (1 - drag) + fraction * (1 - decay));
            return WorldCombat.point(delta.x() / distance, (delta.y() + fall) / distance, delta.z() / distance);
        }
        // Required launch speed has a single minimum between the short and long flight branches.
        let left = epsilon, right = maximumTicks;
        for (let i = 0; i < 64; i++) {
            const a = left + (right - left) / 3, b = right - (right - left) / 3;
            if (required(a).length() < required(b).length()) right = b; else left = a;
        }
        const minimum = (left + right) / 2;
        if (required(minimum).length() > speed + 1e-8) return [];
        function root(from: number, to: number, ascending: boolean): number {
            for (let i = 0; i < 48; i++) {
                const middle = (from + to) / 2;
                if ((required(middle).length() > speed) === ascending) to = middle; else from = middle;
            }
            return (from + to) / 2;
        }
        const times = [root(epsilon, minimum, false)];
        if (required(maximumTicks).length() >= speed && maximumTicks - minimum > 1e-6) {
            const high = root(minimum, maximumTicks, true);
            if (high - times[0] > 1e-4) times.push(high);
        }
        return times.map(time => {
            const direction = required(time).unit(), points = ballisticPath(origin, direction.scale(speed), gravity, time);
            let length = 0; for (let i = 1; i < points.length; i++) length += points[i].minus(points[i - 1]).length();
            return { direction, ticks: time, points, length };
        });
    }
    /** Low arc using vanilla throwable air drag (0.99) and its move/drag/gravity order. */
    export function ballistic(origin: CombatPoint, target: CombatPoint, speed: number, gravity: number): CombatPoint | null {
        if (!isFinite(speed) || speed <= 0 || !isFinite(gravity) || gravity <= 0)
            throw new Error("Invalid ballistic geometry");
        var delta = target.minus(origin), drag = .99;
        if (delta.length() < .01) return WorldCombat.point(0, 1, 0);
        function velocity(time: number): CombatPoint {
            var steps = Math.floor(time), fraction = time - steps, decay = Math.pow(drag, steps);
            var distance = (1 - decay) / (1 - drag) + fraction * decay;
            var fall = gravity / (1 - drag) * (steps - (1 - decay) / (1 - drag) + fraction * (1 - decay));
            return WorldCombat.point(delta.x() / distance, (delta.y() + fall) / distance, delta.z() / distance);
        }
        var low = .0001;
        for (var high = .25; high <= 200; high += .25) {
            if (velocity(high).length() <= speed) {
                for (var iteration = 0; iteration < 24; iteration++) {
                    var middle = (low + high) / 2;
                    if (velocity(middle).length() > speed) low = middle; else high = middle;
                }
                return velocity(high).unit();
            }
            low = high;
        }
        return null;
    }
    /** Skill-owned payload on a tracked native projectile; Java owns physics and collision. */
    export function projectile(action: CombatAction, flight: Flight, complete: (current: CombatAction) => void): string {
        var origin = flight.origin || action.origin(), offset = action.targetPosition().minus(origin);
        var direction = flight.direction || (offset.length() < .01 ? action.direction() : offset.unit());
        var born = action.world().tick();
        return action.projectile(origin, direction.scale(flight.speed), flight.gravity || 0, flight.radius,
            flight.range, flight.lifetime || 200,
            function (current, hit) { flight.impact(current, hit, current.world().tick() - born); }, complete,
            JSON.stringify(flight.appearance || {}));
    }
}
