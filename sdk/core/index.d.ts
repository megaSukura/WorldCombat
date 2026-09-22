interface CombatEquipment { provider(): string; slot(): string; index(): number; item(): string; count(): number; descriptionId(): string; tagged(id: string): boolean; stack(): CombatItem; }
/** The supported server-script surface. Instances and handles expire with their lifecycle. */
interface CombatPoint {
    x(): number;
    y(): number;
    z(): number;
    plus(other: CombatPoint): CombatPoint;
    minus(other: CombatPoint): CombatPoint;
    scale(factor: number): CombatPoint;
    length(): number;
    unit(): CombatPoint;
}
interface CombatActor {
    domain(): string;
    key(): string;
    /** Entity UUID and binding generation, suitable for transient memory. */
    ref(): string;
}
interface CombatImpact {
    /** Native projectile UUID; empty for an instantaneous trace. */
    projectile(): string;
    /** Native hit entity UUID, including non-living entities whose target() is null. Empty on block hits. */
    entity(): string;
    /** Native owner at impact, including deflection; lifetime remains with the original action/effect. Null for an instantaneous trace or absent living owner. */
    source(): CombatActor | null;
    position(): CombatPoint;
    target(): CombatActor | null;
    blocked(): boolean;
    hitEntity(): boolean;
}
interface CombatAction {
    id(): number;
    /** Parent instance id, or 0 for a top-level cast. */
    parent(): number;
    /** Start a distinct same-actor action after this action commits. Target, arguments, input, costs and cooldown belong to the child. Rejection returns a result and leaves this action running. linked ends on every parent termination; independent continues within its own maxTicks. */
    child(action: string, target: CombatActor | null, point: CombatPoint, direction: CombatPoint, argumentsJson: string,
        lifetime: "linked" | "independent"): CombatActionStart;
    /** Content id of the action definition, e.g. `world_combat:ember`. */
    content(): string;
    actor(): CombatActor;
    target(): CombatActor | null;
    direction(): CombatPoint;
    range(): number;
    targetKind(): "enemy" | "friend" | "aim" | "point" | "motion" | "self";
    /** Replace preparation input for subsequent callbacks. Validates relation and range (bounded by the registered maximum); retains this action's costs, cooldown identity and lifecycle. Original control() selections remain readable; commitment validates the replacement target dependency. */
    retarget(kind: "enemy" | "friend" | "aim" | "point" | "motion" | "self", target: CombatActor | null,
        point: CombatPoint, direction: CombatPoint, range: number): void;
    /** Server-authored input values, copied when the action starts. */
    argument(key: string): string | null;
    /** Latest server-validated selection JSON from the action's `input` contract (see WorldCombat.preview); `{}` when the action declares no steps. For sustained input it follows the held aim while the action runs. */
    control(): string;
    /** JSON object shared by this action's callbacks; released when the action ends. Scalar/array/null roots are rejected. */
    data(key: string): string | null;
    data(key: string, json: string): void;
    stage(stage: string): void;
    face(point: CombatPoint, yawSpeed: number, pitchSpeed: number): void;
    /** Preparation telegraphs share this action's lifetime and may precede commit. */
    present(key: string, type: string, version: number, point: CombatPoint, data: string): void;
    reject(reason: string): void;
    /** Source body's native bounding-box centre in world coordinates. */
    origin(): CombatPoint;
    /** Selected entity body centre, or the selected point/directional endpoint. */
    targetPosition(): CombatPoint;
    /** After commitment, freeze the last target point and allow this action to continue if that target leaves. The original handle still requires world.valid checks. */
    releaseTarget(): void;
    /** Settle attached costs and enable writes; 0 commits without reserving a cooldown. */
    commit(cooldownTicks: number): void;
    /** Attach a host-backed cost; commit validates and settles all attached costs together. */
    cost(cost: CombatCost): void;
    after(ticks: number, callback: (action: CombatAction) => void): void;
    on(event: string, callback: (action: CombatAction) => void): number;
    off(token: number): void;
    emit(event: string): void;
    trace(from: CombatPoint, to: CombatPoint, radius: number): CombatImpact;
    /** Vanilla throwable entity with NeoForge impacts, native tracking and action-owned cleanup. Returns its entity UUID. Impact receipts are scoped to the hit callback. Options may include item/sprite, scale, tint and glow. */
    /** `appearance` JSON also carries flight options: `homing` {target, turn (deg/tick), delay, range}, `pierce` (entities passed through), `bounce` (block rebounds) with `restitution`. */
    projectile(origin: CombatPoint, velocity: CombatPoint, gravity: number, radius: number, range: number, lifetime: number,
        hit: (action: CombatAction, impact: CombatImpact) => void, complete: (action: CombatAction) => void, appearance?: string): string;
    damage(impact: CombatImpact, amount: number): boolean;
    hit(impact: CombatImpact, amount: number, strike: string, metadata: string): boolean;
    /** Writable world scope available after commit(); preparation uses sense() and present(). */
    world(): CombatWorld;
    /** Read-only world scope, usable before commit. */
    sense(): CombatWorld;
    approach(within: number, speed: number): string;
    stopMovement(): void;
    effect(definition: string, target: CombatActor, data: string, ticks: number): number;
    signal(event: string, version: number, target: CombatActor, data: string): string;
    effectOperation(effect: number, operation: string, data: string): boolean;
    particle(position: CombatPoint): void;
    finish(): void;
    cancel(): void;
}
/** Opaque host resource adapter; gameplay chooses the quantity when obtaining it. */
interface CombatCost { readonly __combatCost: unique symbol; }
interface CombatActionStart { instance(): number; reason(): string; accepted(): boolean; }
interface CombatActionState {
    instance(): number; action(): string; stage(): string; reason(): string; committed(): boolean;
    parent(): number; lifetime(): "root" | "linked" | "independent";
}
/** Default exclusive preserves existing calls. Parallel actions coexist when claims are disjoint. movement also reserves aim; input is required for sustained input. Other claims are namespaced content-defined exclusion keys. */
interface CombatActionComposition { mode: "exclusive" | "parallel"; claims?: ("movement" | "aim" | "input" | `${string}:${string}`)[]; }
declare const WorldCombat: {
    register(id: string, version: string, maxTicks: number, callback: (action: CombatAction) => void): void;
    registerAction(id: string, version: string, maxTicks: number, targetKind: "enemy" | "friend" | "aim" | "point" | "motion" | "self", range: number, callback: (action: CombatAction) => void): void;
    /** Declare after registration while scripts load; JSON.stringify(CombatActionComposition). */
    composition(action: string, json: string): void;
    point(x: number, y: number, z: number): CombatPoint;
    /**
     * Declarative aiming contract for an action id, read by the client before the cast is sent:
     * `cells` (footprint offsets) with `rotation: "cardinal"`, `ground` and `replace` placement checks; `radius`;
     * `motion: "horizontal"` (dash end preview); `lineOfSight`; and `input: { version: 1, steps: ("point"|"entity"|"field")[], sustained?: boolean }`.
     * `steps` (up to 8) makes the player confirm one selection per step (path of points, an existing selectable field then a point, ...);
     * `sustained` with one step keeps the skill key held and streams the current aim while the action runs.
     * The action reads the selections from control(): `{ version, token, samples: [{ kind, point: [x,y,z], ref?, effect? }] }`.
     * Parsing: mods/world-combat-core/src/main/java/dev/worldcombat/core/runtime/{ActionPreview,ActionInput}.java.
     */
    preview(action: string, json: string): void;
    on(id: string, topic: string, after: string, handler: (event: CombatWorldEvent) => void): void;
    contentPack(id: string, version: string, dependencies: string): void;
    effect(id: string, schema: number, maxTicks: number, lifetime: "action" | "actor" | "persistent",
        normalize: (json: string) => string, migrate: (oldVersion: number, json: string) => string): void;
    effectHandler(id: string, key: string, handler: (effect: CombatEffect) => void): void;
    /** Timing for `/worldcombat profile`: `var t = WorldCombat.clock(); ...; WorldCombat.measured("step", t)`. */
    clock(): number;
    measured(key: string, started: number): void;
    event(id: string, schema: number, normalize: (json: string) => string): void;
    /** Comma-separated phase IDs that must execute before this phase. */
    phase(event: string, id: string, after: string): void;
};

/** JSON state and named subscriptions/timers can survive saving; this callback handle expires on return. */
interface CombatEffect {
    reason(): string;
    /** Only populated in this projectile's named hit handler; the receipt expires when that handler returns. */
    impact(): CombatImpact | null;
    /** Native UUID in named projectile hit/complete handlers; empty in other handlers. input() is the launch's copied JSON. */
    projectileId(): string;
    /** Writes and opt-in native carrier leases belong to this instance, including cleanup after invalidation. */
    world(): CombatWorld;
    id(): number;
    source(): CombatActor;
    target(): CombatActor;
    caller(): CombatActor;
    input(): string;
    state(): string;
    state(json: string): void;
    copyTo(source: CombatActor, target: CombatActor, json: string, ticks: number): number;
    remaining(): number;
    remaining(ticks: number): void;
    schedule(key: string, handler: string, ticks: number, input: string): void;
    unschedule(key: string): void;
    listen(event: string, phase: string, handler: string): void;
    unlisten(event: string, phase: string, handler: string): void;
    event(): CombatEffectEvent;
    emit(event: string, version: number, target: CombatActor, payload: string): string;
    reject(reason: string): void;
    end(): void;
}
interface CombatEffectEvent {
    id(): number;
    protocol(): string;
    version(): number;
    phase(): string;
    originKind(): string;
    origin(): number;
    root(): number;
    parent(): number;
    depth(): number;
    source(): CombatActor;
    target(): CombatActor;
    payload(): string;
    payload(json: string): void;
    reject(reason: string): void;
}
