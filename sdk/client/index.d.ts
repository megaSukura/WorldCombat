/** Client scripts draw from authoritative snapshots; commands remain server validated. */
/** Native library interop remains available for content-specific UI and effects. */
declare const Java: { loadClass(name: string): any };
/** KubeJS 2101 native client/common tooltip registration. */
declare const Platform: { isLoaded(modId: string): boolean };
declare const ItemEvents: { modifyTooltips(handler: (event: { add(item: string, lines: any[]): void }) => void): void };
interface CombatClientFrame {
    /** In a scene callback, data() is a CombatSceneEntry JSON object. Frame methods expire on callback return. */
    data(): string; width(): number; height(): number; translate(key: string): string;
    fill(x: number, y: number, width: number, height: number, color: number): void;
    text(text: string, x: number, y: number, color: number, width: number): void;
    textWidth(text: string): number;
    wrappedText(text: string, x: number, y: number, color: number, width: number, maxLines: number): number;
    distance(x: number, y: number, z: number): number;
    marker(actor: string, text: string, color: number): void;
    graphics(): any;
    /** Interpolated native entity position/height, MC health and name; JSON null if absent. */
    anchor(actor: string): string;
    billboard(actor: string, heightOffset: number, pixelSize: number, draw: (surface: CombatClientFrame) => void): void;
    billboard(x: number, y: number, z: number, pixelSize: number, draw: (surface: CombatClientFrame) => void): void;
    line(x: number, y: number, z: number, tx: number, ty: number, tz: number, color: number): void;
    ring(x: number, y: number, z: number, radius: number, color: number): void;
}
declare const WorldCombatClient: {
    /**
     * Describe a real item in an installed optional item-information viewer (JEI).
     * Keys are localized on the client; repeated contributions for one item merge in order.
     * Unknown items are ignored. Client-script reload replaces the declaration set and withdraws old pages.
     */
    itemInformation(itemId: string, textKeys: string[]): void;
    /**
     * Once per rendered frame per live entry; JSON.parse(frame.data()).data is the producer's payload.
     * Use ordinary script arithmetic/predicates/loops for exact persistent counts or custom geometry.
     * Draw with line/ring/billboard; anchor(ref) returns a loaded living entity or JSON null.
     * Registration is exclusive with WorldCombatParticles.scene for the same id/version.
     * Stateless drawing ends when entries disappear; owned caches/resources use tick and cleanup.
     */
    scene(id: string, version: number, handler: (frame: CombatClientFrame) => void): void;
    hud(id: string, version: number, handler: (frame: CombatClientFrame) => void): void;
    /** Once per world frame, after the current scene snapshots have been delivered. */
    world(id: string, version: number, handler: (frame: CombatClientFrame) => void): void;
    /** Client maintenance independent of HUD visibility and world rendering. */
    tick(id: string, handler: () => void): void;
    /** Release library-owned client resources before this script set reloads. */
    cleanup(id: string, handler: () => void): void;
};

/** Full scene envelope supplied to WorldCombatClient.scene; source is set by the producer's scope. */
interface CombatSceneEntry<T = ParticleSceneData> {
    key: string; owner: number; source: string; type: string; version: number;
    position: [number, number, number]; data: T;
    /** Host owner-release receipt; takes precedence over data.lifecycle. */
    lifecycle?: { reason?: string; tick?: number };
}
/** Standard payload consumers; additional fields can feed ParticleNumberBinding or a custom scene callback. */
interface ParticleSceneData {
    moment?: string;
    /** Only local() reads this field; server scene sources come from the envelope. */
    source?: string;
    target?: string; projectile?: string;
    point?: [number, number, number];
    path?: (string | [number, number, number])[];
    direction?: [number, number, number];
    /** Sampled once at instance creation. */
    seed?: number;
    scale?: number;
    /** Non-negative multiplier on rate and burst.count; trail spacing is distance-based. */
    intensity?: number;
    /** Numeric RGB channel multiplier; -1 leaves authored colors unchanged. */
    tint?: number;
    /** Each strictly increasing tick triggers this event once per instance. */
    event?: { name: string; tick: number };
    /** Stops emission; already spawned particles finish their own lifetime. */
    lifecycle?: { reason?: string; tick?: number };
    [field: string]: unknown;
}
/**
 * Replace any authored numeric leaf with a payload lookup. data is relative to entry.data;
 * dots traverse object fields or zero-based array indices. Missing/null uses fallback.
 * Present values must be finite numbers and satisfy the destination field's range. Payload-bound
 * counts/ticks round to the nearest integer at the parser boundary; packed colours remain exact integers.
 * Static numeric leaves remain strict. Burst counts are authored bases: intensity scales emission once.
 * Resolved once per changed payload, affecting future spawns; schedules, random streams and existing
 * particles retain their state. A changed burst count does not replay an elapsed burst.
 */
interface ParticleNumberBinding { data: string; fallback: number; }
type ParticleNumber = number | ParticleNumberBinding;
type ParticlePair = [ParticleNumber, ParticleNumber];
type ParticleVector = [ParticleNumber, ParticleNumber, ParticleNumber];
/** Rate curves use normalized moment age; lifetime/speed/spread/roll sample at birth (t=0) with stable random. */
type ParticleValue = ParticleNumber | ParticlePair | ParticlePair[] | { curve: ParticlePair[] } | { curve: ParticlePair[]; random: ParticlePair[] };
/** Custom palette lookup: reads `data[attribute]` as a lowercase id and maps it through `colors`. */
interface ParticleColorMap { attribute: string; colors: { [id: string]: number | string }; fallback: number | string; }
/** One graded colour: a fixed 0xRRGGBB/hex value, a number, a numeric binding or a palette lookup. */
type ParticleColorStop = ParticleNumber | string | ParticleColorMap;
/** Ordered colour ramp over the moment's progress 0..1 (stops ascend); sampled at each spawn. */
interface ParticleColorGradient { gradient: [t: number, color: ParticleColorStop][]; }
/**
 * Constant 0xRRGGBB (number or "#RRGGBB"), a `{data, fallback}` numeric binding, a
 * `{gradient: [...]}` ramp, or a `{attribute, colors, fallback}` lookup.
 */
type ParticleColor = ParticleNumber | string | ParticleColorGradient | ParticleColorMap;
/**
 * Initial velocity direction policy; a triple is a fixed world vector (it must not be the zero vector
 * unless its components are data-bound, in which case a missing payload falls back to +Y). To send
 * particles along `data.direction`, use orient:"direction" with a line/cylinder shape and direction:"shape".
 */
type ParticleDirection = "shape" | "up" | "down" | "outward" | "inward" | "toward" | "away" | "velocity" | ParticleVector;
/**
 * Anchor an emitter follows. "path" follows the vertices the server lists in `data.path`: each entry is
 * an entity reference ("source", "target", "projectile" or a UUID) or an `[x, y, z]` point; entity
 * vertices move with their entity every client tick. Path emitters use the "polyline" or "polygon" shape.
 * source comes from the message's scope; target/projectile read the corresponding data actor ref;
 * point reads data.point or the message position. The producer contract is in content/mechanisms/world-feedback.ts.
 * Later snapshots update all bindings. Unloaded entity path vertices are omitted; polyline needs two
 * resolved vertices, polygon three. A single-entity emitter holds its last resolved point until release.
 */
type ParticleBind = "source" | "target" | "projectile" | "point" | "path";
/**
 * How the shape's frame turns each tick. "fixed" keeps the authored rotation; "direction" stands local +Y
 * along the payload's `data.direction`; "toward" points it at the target anchor; "velocity" along the
 * anchor's own motion. A ring lies in the plane perpendicular to that axis, a line or cone runs along it.
 */
type ParticleOrient = "fixed" | "direction" | "toward" | "velocity";
/** Which sprite of a multi-texture particle type is shown; mapped to MadParticle SpriteFrom. */
type ParticleSpriteFrom = "random" | "age";
/** Interpolation over life for a size/alpha segment; mapped to MadParticle ChangeMode. */
type ParticleChangeMode = "linear" | "index" | "sin";
/** Built-in render layer; mapped to MadParticle ParticleRenderTypes. */
type ParticleRender = "instanced" | "translucent" | "opaque" | "lit";
/** Light source: world light, full bright, or an exp4j expression 0..15 in t. */
type ParticleLight = "world" | "full" | string;
/** Event kind that triggers an emitter-level child group. */
type ParticleChildTrigger = "birth" | "event";

/**
 * Shared shape fields. `rotation` is yaw/pitch/roll in degrees applied as yaw about Y, then pitch
 * about X, then roll about Z, to both sampled points and directions. `randomDirection` blends toward
 * a uniformly random direction. Every field belongs to specific kinds; the parser rejects a field
 * that its kind does not accept and names the accepted keys. circle/ring/arc live in the XZ plane.
 */
interface ParticleShapeCommon {
    /** Degrees yaw/pitch/roll applied to sampled points and directions. */
    rotation?: ParticleVector;
    /** 0..1 blend toward a uniformly random direction; default 0. */
    randomDirection?: ParticleNumber;
}
/** A zero-extent point spawning along local +Y. */
interface ParticleShapePoint extends ParticleShapeCommon { kind: "point"; }
/** Uniform box of `size` blocks per axis, spawning along +Y. */
interface ParticleShapeBox extends ParticleShapeCommon { kind: "box"; size: ParticleVector; }
/** Solid or (thickness 0..1, 1 = surface) spherical shell around the anchor. */
interface ParticleShapeSphere extends ParticleShapeCommon { kind: "sphere"; radius: ParticleNumber; thickness?: ParticleNumber; }
/** Upper half of a sphere; same fields as sphere. */
interface ParticleShapeHemisphere extends ParticleShapeCommon { kind: "hemisphere"; radius: ParticleNumber; thickness?: ParticleNumber; }
/** Exactly the spherical surface; no thickness. */
interface ParticleShapeSphereSurface extends ParticleShapeCommon { kind: "sphere_surface"; radius: ParticleNumber; }
/** Filled disc (thickness 0) or rim band (thickness 0..1, 1 = only the rim) in the XZ plane. */
interface ParticleShapeCircle extends ParticleShapeCommon { kind: "circle"; radius: ParticleNumber; thickness?: ParticleNumber; }
/**
 * Zero-width circle in the XZ plane unless a band is authored. A band is either
 * `innerRadius`/`outerRadius` in blocks, or an absolute `thickness` band width centred on `radius`.
 */
interface ParticleShapeRing extends ParticleShapeCommon {
    kind: "ring"; radius: ParticleNumber; arcDegrees?: ParticleNumber;
    thickness?: ParticleNumber; innerRadius?: ParticleNumber; outerRadius?: ParticleNumber;
}
/** Ring sampled along `arcDegrees` instead of the full circle; same band fields as ring. */
interface ParticleShapeArc extends ParticleShapeCommon {
    kind: "arc"; radius: ParticleNumber; arcDegrees?: ParticleNumber;
    thickness?: ParticleNumber; innerRadius?: ParticleNumber; outerRadius?: ParticleNumber;
}
/** Cone surface (thickness 0..1, 1 = base rim only), spreading along local +Y at `angleDegrees` half-angle. */
interface ParticleShapeCone extends ParticleShapeCommon { kind: "cone"; radius: ParticleNumber; angleDegrees?: ParticleNumber; thickness?: ParticleNumber; }
/** Filled cone volume; `length` is the distance along the sampled direction (blocks). */
interface ParticleShapeConeVolume extends ParticleShapeCommon { kind: "cone_volume"; radius: ParticleNumber; length: ParticleNumber; angleDegrees?: ParticleNumber; thickness?: ParticleNumber; }
/** Segment along local +Y of `length` blocks. */
interface ParticleShapeLine extends ParticleShapeCommon { kind: "line"; length: ParticleNumber; }
/** Torus: `radius` is the major radius and `thickness` the absolute tube radius, both in blocks. */
interface ParticleShapeTorus extends ParticleShapeCommon { kind: "torus"; radius: ParticleNumber; thickness?: ParticleNumber; }
/** Cylinder: `radius` and `length` in blocks; `thickness` 0..1 keeps only the wall. */
interface ParticleShapeCylinder extends ParticleShapeCommon { kind: "cylinder"; radius: ParticleNumber; length: ParticleNumber; thickness?: ParticleNumber; }
/**
 * Samples the edges between the `data.path` vertices. `closed` also draws the edge from the last
 * vertex back to the first; default false. Path vertices are absolute world geometry and are never
 * scaled by fit/data.scale. Polyline needs two resolved vertices.
 */
interface ParticleShapePolyline extends ParticleShapeCommon { kind: "polyline"; closed?: boolean; }
/**
 * Fills one simple ordered `data.path` outline, convex or concave, in either winding. Triangulation
 * uses the dominant Newell-normal projection and samples by 3D triangle area, retaining vertex
 * heights. Repeated adjacent/closing points and redundant straight-edge vertices are tolerated;
 * collapsed or self-intersecting projections emit nothing until valid again; needs three vertices.
 */
interface ParticleShapePolygon extends ParticleShapeCommon { kind: "polygon"; }

type ParticleShape =
    | ParticleShapePoint | ParticleShapeBox | ParticleShapeSphere | ParticleShapeHemisphere
    | ParticleShapeSphereSurface | ParticleShapeCircle | ParticleShapeRing | ParticleShapeArc
    | ParticleShapeCone | ParticleShapeConeVolume | ParticleShapeLine | ParticleShapeTorus
    | ParticleShapeCylinder | ParticleShapePolyline | ParticleShapePolygon;

interface ParticleBurst {
    /** Finite spawn points per burst (0 allowed); scaled by intensity, then LOD/budgets. For exact persistent counts use a custom scene. */
    count: ParticleNumber;
    /** Ticks between bursts; default 1. */
    interval?: ParticleNumber;
    /** Burst count; default 1. */
    repeats?: ParticleNumber;
    /** Delay in ticks before the first burst; default 0. */
    at?: ParticleNumber;
}

interface ParticleVelocity {
    /** exp4j expression in t (normalized life 0..1), blocks/tick; a set axis overrides gravity/drag/deflection. */
    x?: string;
    /** exp4j expression in t, blocks/tick. */
    y?: string;
    /** exp4j expression in t, blocks/tick. */
    z?: string;
}

interface ParticleCollision {
    /** Bounces before disappearing; MadParticle bounceTime; 0 disables collision; default 1. */
    bounces?: ParticleNumber;
    /** Horizontal spread coefficient >= 0; MadParticle horizontalRelativeCollisionDiffuse; default 1. */
    horizontalSpread?: ParticleNumber;
    /** Vertical bounce coefficient 0..1; MadParticle verticalRelativeCollisionBounce; default 1. */
    verticalBounce?: ParticleNumber;
    /** Retained velocity fraction 0..1 after the first collision; default = drag. */
    dragAfter?: ParticleNumber;
    /** Blocks/tick^2 gravity after the first collision; default = gravity. */
    gravityAfter?: ParticleNumber;
    /** Horizontal deflection blocks/tick^2 after the first collision. */
    deflectionAfter?: ParticlePair;
    /** MadParticle DISAPPEAR_ON_COLLISION meta: disappear on the Nth bounce; 0 = never; default 0. */
    disappearAt?: ParticleNumber;
}

interface ParticleInteract {
    /** Horizontal factor of motion received from nearby entities; makes the particle tick on the main thread. */
    horizontal: ParticleNumber;
    /** Vertical factor of motion received from nearby entities. */
    vertical: ParticleNumber;
}

/**
 * A particle spawned by MadParticle when its parent dies. Every field is optional: an unwritten
 * field inherits the parent's value. `child` nests to any depth.
 */
interface ParticleChildParticle {
    /** Registered ParticleType id, e.g. "minecraft:flame" or "world_combat_core:cobblemon/orb/orb"; inherit when omitted. */
    particle?: string;
    /** Sprite selection for a multi-texture type; inherit when omitted. */
    spriteFrom?: ParticleSpriteFrom;
    /** Lifetime in ticks; inherit when omitted. */
    lifetime?: ParticleNumber;
    /** Lifetime percentage jitter 0..100; MadParticle meta.life; inherit when omitted. */
    lifeJitter?: ParticleNumber;
    /** Begin/end size in blocks, or a single value; inherits when omitted. */
    size?: ParticleNumber | ParticlePair;
    /** Size interpolation; inherit when omitted. */
    sizeMode?: ParticleChangeMode;
    /** ParticleColor; inherit when omitted. A gradient is sampled at the child's spawn. */
    color?: ParticleColor;
    /** Begin/end alpha 0..1, or a single value; inherit when omitted. */
    alpha?: ParticleNumber | ParticlePair;
    /** Alpha interpolation; inherit when omitted. */
    alphaMode?: ParticleChangeMode;
    /** Spin in degrees/tick; inherit when omitted. */
    spin?: ParticleNumber;
    /** Blocks/tick^2, mapped as gravity / 0.04; inherit when omitted. */
    gravity?: ParticleNumber;
    /** Retained velocity fraction 0..1 per tick; inherit when omitted. */
    drag?: ParticleNumber;
    /** Horizontal constant acceleration [x, z] in blocks/tick^2; inherit when omitted. */
    deflection?: ParticlePair;
    /** Per-axis exp4j velocity expressions; inherit when omitted. */
    velocity?: ParticleVelocity;
    /** Collision behaviour; inherit when omitted. */
    collision?: ParticleCollision;
    /** Render layer; inherit when omitted. */
    render?: ParticleRender;
    /** Light source; inherit when omitted. */
    light?: ParticleLight;
    /** Iris bloom factor; inherit when omitted. */
    bloom?: ParticleNumber;
    /** Particles generated per point; inherit when omitted. */
    amount?: ParticleNumber;
    /** MadParticle position jitter per axis in blocks; inherit when omitted. */
    positionJitter?: ParticleVector;
    /** MadParticle velocity jitter per axis in blocks/tick; inherit when omitted. */
    velocityJitter?: ParticleVector;
    /** Nested grandchild particle; inherit when omitted. */
    child?: ParticleChildParticle;
}

interface ParticleEmitter {
    /** Unique inside its moment. */
    name: string;
    /**
     * Registered ParticleType id, e.g. "minecraft:flame" or "world_combat_core:cobblemon/<path>".
     * Cobblemon types are listed in assets/world_combat_core/particle_types.txt as
     * "<path> <frames> <w>x<h>"; multi-frame types are cut from Cobblemon's flipbook strips.
     */
    particle: string;
    /** Multi-frame selection; default "age" plays the frames once across the lifetime, "random" picks one frame. */
    spriteFrom?: ParticleSpriteFrom;
    /** Anchor to follow; default "source". */
    bind?: ParticleBind;
    /** World-axis blocks added to the anchor; body fit scales entity offsets. Independent of orient and data.scale. */
    offset?: ParticleVector;
    /** Entity height fraction added to offset.y; default 0.5. */
    height?: ParticleNumber;
    /**
     * Body fit. "body" (default for source/target/projectile binds) multiplies offset, shape geometry,
     * size, speed and trail spacing by the bound body's factor: (width + height) / 2.3, clamped 0.4..4,
     * so a medium combatant (0.9 x 1.4 blocks) is 1. Author numbers for that medium body. "none" is the
     * default for point/path binds: shape geometry, speed and trail spacing follow the payload's
     * `data.scale` (mechanic radius / authored reference radius), so ground areas match their real radius.
     * `data.scale` also multiplies particle size for every emitter.
     * Path vertices are absolute world geometry: offset is applied but fit/scale/orient/shape.rotation do not transform them.
     */
    fit?: "body" | "none";
    /** Per-tick turning of the shape frame; default "fixed". */
    orient?: ParticleOrient;
    /** When set, spawn along the anchor's history instead of at the anchor; minDistance in blocks and > 0. */
    trail?: { minDistance: ParticleNumber };
    /** First emitting tick inside the moment; default 0. */
    start?: ParticleNumber;
    /** Stop-emitting tick; default = moment exit.stop. */
    stop?: ParticleNumber;
    /** Continuous particles per second; may be 0 with burst only. */
    rate?: ParticleValue;
    /** Burst/repeat pattern; independent of rate. */
    burst?: ParticleBurst;
    /** Spawn volume; default point. */
    shape?: ParticleShape;
    /** Initial speed in blocks/tick. */
    speed?: ParticleValue;
    /** Direction spread in degrees. */
    spread?: ParticleValue;
    /** Initial direction policy; default "shape". */
    direction?: ParticleDirection;
    /** Particles handed to MadParticle per spawn point, jittered by MadParticle; default 1. */
    amount?: ParticleNumber;
    /** MadParticle position jitter per axis in blocks; default none. */
    positionJitter?: ParticleVector;
    /** MadParticle velocity jitter per axis in blocks/tick; default none. */
    velocityJitter?: ParticleVector;
    /** Particle lifetime in ticks; required. */
    lifetime: ParticleValue;
    /** Lifetime percentage jitter 0..100; MadParticle meta.life; default 0. */
    lifeJitter?: ParticleNumber;
    /** Begin/end size in blocks, or a single value; required. Approximate MadParticle scale = blocks / 0.15. */
    size: ParticleNumber | ParticlePair;
    /** Size interpolation; default "linear". */
    sizeMode?: ParticleChangeMode;
    /** ParticleColor; default 0xFFFFFF. A gradient is sampled over the moment's progress at each spawn. */
    color?: ParticleColor;
    /** Begin/end alpha 0..1, or a single value; default 1. */
    alpha?: ParticleNumber | ParticlePair;
    /** Alpha interpolation; default "linear". */
    alphaMode?: ParticleChangeMode;
    /** Initial roll in degrees. */
    roll?: ParticleValue;
    /** Roll change in degrees/tick; mapped to MadParticle rollSpeed as turns/tick. */
    spin?: ParticleNumber;
    /** Blocks/tick^2, mapped as gravity / 0.04. */
    gravity?: ParticleNumber;
    /** Retained velocity fraction per tick 0..1; mapped to friction; default 1. */
    drag?: ParticleNumber;
    /** Horizontal constant acceleration [x, z] in blocks/tick^2, mapped as value / 0.04. */
    deflection?: ParticlePair;
    /** Per-axis exp4j velocity expressions in t, blocks/tick; overrides gravity/drag/deflection per axis. */
    velocity?: ParticleVelocity;
    /** Collision behaviour; omit for no collision. */
    collision?: ParticleCollision;
    /** Near-entity motion response; omit for none. */
    interact?: ParticleInteract;
    /** Render layer; default "instanced". */
    render?: ParticleRender;
    /** Light source; default "world". */
    light?: ParticleLight;
    /** Skip normal distance culling and use double distance; default false. */
    alwaysRender?: boolean;
    /** Iris bloom factor; default 0. */
    bloom?: ParticleNumber;
    /** Pre-simulate the whole lifetime then replay; default false. */
    preCalculate?: boolean;
    /** Pre-simulate then play backwards (TENET); default false. */
    reverse?: boolean;
    /** Child particle MadParticle spawns at this particle's death. */
    child?: ParticleChildParticle;
    /** Estimated live-particle cap for this emitter (spawn tick + lifetime); 0 = unlimited. */
    maxParticles?: ParticleNumber;
}

interface ParticleChild {
    /** When the child emitters spawn; manual "event" is dispatched by the engine. */
    on: ParticleChildTrigger;
    /** Optional emitter name to watch; default all emitters in the moment. */
    of?: string;
    /** Manual event name for on: "event". */
    event?: string;
    /** Emitters spawned once at the triggering particle's position. */
    emit: ParticleEmitter[];
}

interface ParticleMoment {
    /** Ticks; 0 = until the server releases the key. Default 0. */
    duration?: ParticleNumber;
    /** exit.stop = stop-emitting tick, default duration; exit.drain = ticks to wait for survivors, default 40. */
    exit?: { stop?: ParticleNumber; drain?: ParticleNumber };
    /** Emitters active during this moment. */
    emitters: ParticleEmitter[];
    /** Child emitter groups triggered by emitter events. */
    children?: ParticleChild[];
}

interface ParticleDefinition {
    /** Named phases; the server entry selects one via data.moment; default "main". */
    moments: { [name: string]: ParticleMoment };
    /** How the instance leaves when the key disappears; default "drain". Both modes leave spawned MadParticle particles to expire naturally. */
    interrupt?: "hide" | "drain";
}

declare const WorldCombatParticles: {
    /** Register a static or numeric-bound definition. Fallback values are validated now; resolved payloads on update. Keep id/version stable for a live scene key. */
    scene(id: string, version: number, definition: ParticleDefinition | string): void;
    /** Play a definition locally at a world point for `ticks`; `data` is the server data object (its `source` sets the entry source). */
    local(id: string, version: number, x: number, y: number, z: number, dataJson: string, ticks: number): void;
};
