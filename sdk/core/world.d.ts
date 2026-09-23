interface CombatObservation {
    actor(): CombatActor;
    /** Native bounding-box centre in world coordinates. */
    position(): CombatPoint;
    /** Native motion vector in world X/Y/Z axes, blocks per tick; zero vector for zero native motion. Independent of the movement-speed attribute. */
    velocity(): CombatPoint;
    health(): number; maxHealth(): number;
    movementSpeed(): number; visible(): boolean; friendly(): boolean;
    hostile(): boolean; player(): boolean; wet(): boolean; grounded(): boolean;
    attacking(): CombatActor | null; lastAttacker(): CombatActor | null; hurtAgo(): number; tags(): string;
    /** Bounding box in blocks; a medium combatant is about 0.9 wide and 1.4 tall. Use it to scale reach, area and presentation (data.scale). */
    width(): number; height(): number;
}
interface CombatEffectView {
    id(): number; definition(): string; source(): CombatActor; target(): CombatActor; remaining(): number; data(): string;
}
interface CombatSound { id(): number; sound(): string; position(): CombatPoint; tick(): number; data(): string; }
interface CombatEnergy { side(): string; stored(): number; capacity(): number; receive(): boolean; extract(): boolean; }
/**
 * One active Minecraft effect instance. `tags()` lists the registry tags of the effect type, space-separated
 * (`world_combat:status/burn ...`); `tagged(tag)` is the membership test consumers use for shared status identity.
 * `duration()` is the remaining number of ticks, or -1 for an infinite effect.
 * `key()` is an opaque comparison token retaining native application revision, hidden effects and NeoForge cure state;
 * only the duration fields serialized inside that token use absolute world ticks.
 */
interface CombatMobEffect {
    id(): string; duration(): number; amplifier(): number; key(): string; tags(): string; tagged(tag: string): boolean;
    /** Native MobEffectCategory, including mod effects: beneficial, harmful or neutral. */
    category(): string;
}
interface CombatAttribute { base(): number; value(): number; }
/** Snapshot of a registered entry. tags() is a JSON string array; membership uses exact, namespaced tag ids. */
interface CombatRegistryEntry { registry(): string; id(): string; tags(): string; tagged(tag: string): boolean; }
/** Detached native ItemStack facts. Codec data includes native/mod components and their defaults. */
interface CombatItem {
    id(): string; count(): number; empty(): boolean; descriptionId(): string;
    maxCount(): number; damage(): number; maxDamage(): number;
    tags(): string; tagged(tag: string): boolean;
    /** JSON string array of present component type ids, including transient components. */
    components(): string; hasComponent(id: string): boolean;
    /** Native component codec JSON, or null when absent, transient or not encodable with the current registries. */
    component(id: string): string | null;
    /** Native ItemStack codec JSON (id/count/persistent component patch), accepted by item/insertItem/giveItem/dropItem; null if native serialization fails. */
    serialized(): string | null;
}
/** Loaded fluid state, including fluids contained within a block. */
interface CombatFluid {
    position(): CombatPoint; id(): string; tags(): string; tagged(tag: string): boolean;
    empty(): boolean; source(): boolean; amount(): number; height(): number; flow(): CombatPoint;
    property(name: string): string | null;
}
/** Native provenance on damage_incoming and damage_applied JSON, alongside script-authored metadata. */
interface CombatNativeDamageFacts {
    amount: number; cause: string; damageType: string; damageTags: string[];
    /** Nearby, available living source ref, or empty. Event actor falls back to the victim when this is empty. */
    sourceActor: string;
    /** Native causing/direct UUIDs and registry type ids; empty for absent entities. */
    sourceEntity: string; directEntity: string; sourceType: string; directType: string;
    /** True when the causing entity itself is the direct entity, distinct from the victim. */
    direct: boolean; bypassesInvulnerability: boolean;
    /** Native causing entity is living; scripted is true only inside a WorldCombat damage operation. */
    sourceLiving: boolean; scripted: boolean;
    actual?: number; before?: number; after?: number;
}
interface CombatWorld {
    /** Registered native MobEffect category before application: beneficial, harmful or neutral; empty for an unknown id. */
    mobEffectCategory(id: string): string;
    /** Detached active equipment facts from native inventories; absent optional integrations contribute no entries. Pokemon carried items appear as provider "cobblemon", slot "held", index 0. */
    equipment(actor: CombatActor): readonly CombatEquipment[];
    /**
     * Compare-and-set removal/consumption of one native equipment stack. `provider`, `slot` and `index` come from an
     * `equipment(...)` snapshot; `expected` is its exact stack (`stack().serialized()`), or "" to require an empty slot.
     * For a Pokemon's carried item use provider "cobblemon", slot "held", index 0. False covers a stale snapshot, a
     * read-only source and a native refusal. A positive `count` removes at most that many items and leaves the rest in
     * the source; omitted or <= 0 removes the whole observed stack.
     */
    equipmentTake(target: CombatActor, provider: string, slot: string, index: number, expected: string, count?: number): boolean;
    /** Same CAS removal, dropped as a real item entity (components preserved); `data` is {pickupDelay,velocity,glow}. Returns its UUID or "". */
    equipmentDrop(target: CombatActor, provider: string, slot: string, index: number, expected: string, data: string, count?: number): string;
    /** CAS install of an item id or serialized stack where `expected` sits ("" requires an empty slot); false covers the same refusals. */
    equipmentGive(target: CombatActor, provider: string, slot: string, index: number, expected: string, item: string, count?: number): boolean;
    /**
     * Atomic swap of two native equipment stacks. Both slots are checked against their snapshots and preflighted
     * (native pre-events, Curios canEquip/canUnequip, Cobblemon held-item gates) before either is written, so a refusal
     * leaves both items where they were. Either side may be empty, which expresses taking from or giving into an empty
     * slot; two empty slots report `empty`. A source that changed since the snapshot is never copied. When both sides
     * hold something the whole observed stacks swap; with one side empty a positive `count` moves at most that many
     * items and keeps the source remainder. A destination's native capacity applies, so a whole stack that cannot fit
     * (for example 64 items into a Pokemon's one-item held slot) is refused with `capacity`.
     */
    equipmentExchange(first: CombatActor, firstProvider: string, firstSlot: string, firstIndex: number, firstExpected: string,
        second: CombatActor, secondProvider: string, secondSlot: string, secondIndex: number, secondExpected: string, count?: number): boolean;
    /** Readable receipt for equipmentTake: JSON {ok,reason,item,count,drop}; item/count are the stack that left the slot. */
    equipmentTakeResult(target: CombatActor, provider: string, slot: string, index: number, expected: string, count?: number): string;
    /** Readable receipt for equipmentDrop: JSON {ok,reason,item,count,drop}; drop is the item entity UUID. */
    equipmentDropResult(target: CombatActor, provider: string, slot: string, index: number, expected: string, data: string, count?: number): string;
    /** Readable receipt for equipmentGive: JSON {ok,reason,item,count,drop}; item/count are the stack the slot held before the write. */
    equipmentGiveResult(target: CombatActor, provider: string, slot: string, index: number, expected: string, item: string, count?: number): string;
    /** Readable receipt for equipmentExchange: JSON {ok,reason,item,count,drop}; reason covers same-slot, stale, empty, capacity, preflight and write refusals. */
    equipmentExchangeResult(first: CombatActor, firstProvider: string, firstSlot: string, firstIndex: number, firstExpected: string,
        second: CombatActor, secondProvider: string, secondSlot: string, secondIndex: number, secondExpected: string, count?: number): string;
    /**
     * Read-only native probe: the full `width` x `height` bounding box fits with feet centre at `point`. Requires finite
     * positive width/height; checks every chunk the box overlaps, the build height, the world border and both block and
     * living collisions. The point stays within the host-authorized 64-block scope of the source.
     */
    freeSpace(point: CombatPoint, width: number, height: number): boolean;
    /** Whether two actors are allies, independent of which one is world.source(). */
    allied(first: CombatActor, second: CombatActor): boolean;
    source(): CombatActor; tick(): number; valid(actor: CombatActor): boolean;
    observe(actor: CombatActor): CombatObservation | null;
    attributeValue(actor: CombatActor, id: string): CombatAttribute | null;
    environment(point: CombatPoint): string;
    block(point: CombatPoint): CombatBlock | null;
    /** Read-only native BlockState.canSurvive probe, including mod overrides and registry tags. Uses the same state syntax as placeBlock. Requires the position and adjacent chunks loaded; invalid state/unavailable position returns false. Actual placement still checks occupancy, expectedState and protection hooks. */
    canSurvive(point: CombatPoint, state: string): boolean;
    /** Live registry lookup; null for unknown registries or entries. Tags are vanilla data-pack registry tags; NeoForge common tags use c:. Re-read after reload to obtain current membership. */
    registry(registry: string, id: string): CombatRegistryEntry | null;
    /** Item id creates a default-stack snapshot; native ItemStack codec JSON preserves component data. Unknown ids return null; malformed serialized stacks throw. */
    item(idOrStack: string): CombatItem | null;
    entityType(actor: CombatActor): CombatRegistryEntry | null;
    fluid(point: CombatPoint): CombatFluid | null;
    /** Invoke a native item on the compared block under the acting identity and NeoForge hooks. */
    useItem(point: CombatPoint, itemId: string, expectedState: string): string;
    /** Native bare-hand block use under the actor/owner identity and NeoForge interaction events; face is a cardinal direction. Returns used/pass/refused or a refusal reason. */
    interactBlock(point: CombatPoint, face: string, secondary: boolean, expectedState: string): string;
    /** Fresh NeoForge FE capability snapshot. auto chooses an input face, none asks the unsided capability; unavailable/unloaded returns null. */
    energy(point: CombatPoint, side: string): CombatEnergy | null;
    /** Sends content-budgeted FE to that native capability, returning only the actually accepted amount. simulate does not add energy; authority and protection still apply. */
    receiveEnergy(point: CombatPoint, side: string, amount: number, simulate: boolean): number;
    face(point: CombatPoint, yawSpeed: number, pitchSpeed: number): void;
    /** Resolve a loaded entity in this world within 64 blocks; stale or unavailable entities return null. */
    actor(entity: string): CombatActor | null;
    /** Available living actors whose body centres lie within the sphere, ordered by body-centre distance. Radius is >0..32; centre is within 64 blocks of the source body centre. Host arrays are fixed-size: copy with `.slice()` before adding entries. */
    query(centre: CombatPoint, radius: number, visibleOnly: boolean): readonly CombatActor[];
    /**
     * Everyone `query` would return, observed in one call and delivered as a JSON array (parse it). Behavior code that
     * reads a neighbourhood per decision uses this instead of observing subjects one by one. `effects` and `mobEffects`
     * are comma-separated ids; each subject reports which of them it carries. Subject fields: `ref, domain, point[x,y,z], velocity[x,y,z], health,
     * maximum, speed, visible, friendly, hostile, player, wet, grounded, attacking, lastAttacker, hurtAgo, width, height,
     * tags, effects[], mobEffects[], facts{}`; `facts` holds what the subject's domain publishes about it (for Pokemon:
     * `species, form, gender, types[], aspects[], level, status, wild, owner, aiEnabled`). All native subjects publish
     * `entityType, entityTags[]`; these registry tags are separate from the subject's scoreboard `tags`.
     * `domain` matches actor.domain(); `point` is body centre and `velocity` is the same world-axis blocks/tick snapshot as observe().velocity().
     * Inclusion uses centre distance; dimensions support script-side predicates on the returned actors.
     */
    survey(centre: CombatPoint, radius: number, visibleOnly: boolean, limit: number, effects: string, mobEffects: string): string;
    visible(actor: CombatActor): boolean; friendly(actor: CombatActor): boolean; random(): number;
    clear(from: CombatPoint, to: CombatPoint): boolean;
    sound(sound: string, point: CombatPoint, radius: number, data: string): void;
    heard(afterId: number, radius: number): readonly CombatSound[];
    navigate(point: CombatPoint, within: number, speed: number): string; stopMovement(): void; controlled(value: boolean): void;
    stopMovement(actor: CombatActor): void;
    /** Transient modifier, automatically removed with the current action or effect. */
    attribute(actor: CombatActor, id: string, amount: number, operation: "add_value" | "add_multiplied_base" | "add_multiplied_total"): boolean;
    displace(actor: CombatActor, delta: CombatPoint): number;
    /** Destination uses feet coordinates. */
    teleport(actor: CombatActor, point: CombatPoint): boolean; swap(first: CombatActor, second: CombatActor): boolean;
    /** Minecraft health units; returns the actual signed change. */
    health(actor: CombatActor, delta: number, cause: string): number;
    /** Metadata may select a registered damageType id; its native tags govern reductions and invulnerability timing. Without it the host selects its action/projectile type (and bypassCooldown variant). Also applies to action.hit. */
    hurt(actor: CombatActor, amount: number, metadata: string): boolean;
    /** Managed-effect/body-brain scope only. Same native physics/options as action.projectile. hit/complete name handlers on the owning effect; input is copied JSON delivered to each fresh callback. Bare MobEffect/WorldEvent hooks attach an actor/persistent effect first. Flights are transient: effect end, source/target invalidation, unload or reload discard them and cancel queued callbacks, even for persistent effects. */
    projectile(origin: CombatPoint, velocity: CombatPoint, gravity: number, radius: number, range: number, lifetime: number,
        hit: string, complete: string, input: string, appearance: string): string;
    /** Once per issued impact in its current hit handler. Preserves native causing/direct entities, including deflection. */
    projectileHit(impact: CombatImpact, amount: number, metadata: string): boolean;
    /** Owner-local operations; UUIDs confer no access to another action/effect's flight. Natural completion runs once after queued hits. */
    projectileActive(id: string): boolean;
    /** Silent cancellation drops queued hits and completion. */
    cancelProjectile(id: string): boolean;
    /** Stops flight and dispatches completion after already queued hits, at the next safe boundary. */
    finishProjectile(id: string): boolean;
    /** Broadcast to all current actions on the actor. */
    deliver(actor: CombatActor, event: string): boolean;
    deliver(actor: CombatActor, instance: number, event: string): boolean;
    /** Ends all current actions through normal cleanup. Settled costs and cooldown remain. */
    interrupt(actor: CombatActor, reason: string): boolean;
    interrupt(actor: CombatActor, instance: number, reason: string): boolean;
    marker(actor: CombatActor, id: string, ticks: number, amplifier: number): void;
    mobEffect(actor: CombatActor, id: string): CombatMobEffect | null;
    /** Every active effect on a loaded nearby actor; filter by `tagged(...)` for shared status identity. */
    mobEffects(actor: CombatActor): readonly CombatMobEffect[];
    /** Removes only the exact currently observed effect, including its hidden stack. */
    removeMobEffect(actor: CombatActor, id: string, expectedKey: string): boolean;
    /** Opt-in carrier ownership in an action/managed-effect scope. Binds this exact observation to the current resource owner;
     * returns 0 if it changed. A new binding supersedes the previous claim, even for an identical same-tick state.
     * Owner release also runs after source/target invalidation, permission loss or script failure. It removes the carrier only
     * while this claim and native application still match; native reapplication, replacement or cure retire old ownership.
     * The claim covers the observed native instance, including its hidden stack; use a dedicated carrier for independent ownership.
     * Still-owned carriers are omitted from native save copies; third-party refreshed/replaced states retain native persistence.
     * Ordinary marker/apply lifetimes remain independent. Persistent effects rebind in resume after their transient leases end. */
    leaseMobEffect(actor: CombatActor, id: string, expectedKey: string): number;
    /** Read-only check for a known token on a nearby live actor; usable from another event/effect scope. */
    mobEffectLeasePresent(token: number): boolean;
    /** Releases only a token owned by this scope; true only if its still-owned native carrier was removed. */
    releaseMobEffectLease(token: number): boolean;
    /**
     * Leased blocks: `cells` is `{"cells":[{"x","y","z","block"?:string,"state"?:string,"expectedState"?:string}],"replace"?:bool,"ground"?:bool,"linger"?:bool}`.
     * Each cell supplies one of block/state in native command format, including optional properties. Same-type changes preserve unspecified properties;
     * block.blockState() copies all properties. Optional expectedState compares block.state() before placement.
     * Each cell remembers its original block. Expiry restores it; without linger, scope end or source departure also restores it.
     * Native break/drop events queue restoration after the break actually succeeds; a cancelled break keeps the lease.
     * Other removals are reconciled on expiry. Temporary materials yield no block drops or experience.
     * Confirmed player/native placement takes ownership of its cell, so later restoration preserves that construction.
     * A successful overlapping lease inherits the original block and supersedes the previous cell's lease.
     * Solid restoration waits while a living entity occupies the cell. Unloaded cells retain their saved restoration record;
     * shutdown restores safe loaded cells and keeps unresolved cells for the next load.
     */
    terrain(cells: string, ticks: number): number; removeTerrain(id: number): void;
    /** Same placement operation, returning JSON {id,placed:[[x,y,z]],skipped:[{x,y,z,reason}]}. bestEffort skips refused cells;
     * native protection cancellation still rolls back the batch. Duplicate coordinates keep the first request. id=0 means nothing changed. */
    terrainResult(cells: string, ticks: number): string;
    /** Temporary body. `data` may declare an appearance rendered on the client: `{"item":"minecraft:iron_sword"}`, `{"block":"minecraft:stone"}` or `{"sprite":"cobblemon:balls/afterspark"}`, plus optional `"scale"`, `"tint"`, `"glow"`, `"spin"`. Absent fields keep the body invisible. */
    helper(point: CombatPoint, health: number, data: string, ticks: number): CombatActor;
    removeHelper(actor: CombatActor): void; helperSource(actor: CombatActor): CombatActor | null; helperData(actor: CombatActor): string;
    /**
     * A persistent, script-defined body: a living entity that belongs to itself. It survives this action, the
     * summoner's recall, chunk unloads and restarts, and leaves when its brain ends, it dies or it is dismissed.
     * `body` configures the entity as JSON: `appearance` (see helper), `size` [w,h], `health`, `speed`, `gravity`,
     * `pushable`, `invulnerable`, `knockbackResistance`, `name`/`nameVisible`, `silent`, `fireImmune`, `glow`.
     * `definition` is a persistent effect (`WorldCombat.effect(id, schema, maxTicks, "persistent", ...)`) that becomes the
     * body's brain with source = target = body, `data` its state and `ticks` its lifetime; its handlers drive the body
     * through `effect.world()` (navigate, motion, hurt, placeBlock, spawn, ...) and its timers replace per-tick callbacks.
     * Host hooks report interactions with actor = body: `world_combat:body_interact` (target = player; data {hand, item,
     * count, sneaking, consumed}), `world_combat:body_touch` (target = the entity touched), `world_combat:body_blocked`
     * (data {horizontal, vertical, block}), `world_combat:body_died` (target = killer or null). The shared library
     * `WorldBodies` routes these to the brain as operations.
     */
    spawn(point: CombatPoint, body: string, definition: string, data: string, ticks: number): CombatActor;
    /** `{definition, brain, summoner, owner, config}` for a body; empty for any other actor. */
    body(actor: CombatActor): string;
    /** Re-applies body configuration fields (appearance, size, name, physics...). */
    configure(actor: CombatActor, body: string): boolean;
    /** Ends a body's brain and removes it; allowed for the body, its summoner or its controlling player. */
    dismiss(actor: CombatActor): boolean;
    /** Sets or adds velocity (blocks per tick, length <= 4): launches, hovering bodies, scripted projectiles. */
    motion(actor: CombatActor, velocity: CombatPoint, add: boolean): boolean;
    /** Seats a rider on a vehicle (bodies can carry riders); a null vehicle dismounts. */
    mount(rider: CombatActor, vehicle: CombatActor | null): boolean;
    /**
     * Lasting native blockstate placement; `data` `{"replace"?:bool,"force"?:bool,"expectedState"?:string}`.
     * Same-type changes retain unspecified properties. expectedState compares the observed block.state() before writing.
     * Use terrain for a reversible block interaction and placeBlock when the interaction calls for a lasting change.
     * Blocks with a block entity (containers, furnaces, signs, campfires, machines) can only change state (`minecraft:campfire[lit=false]`
     * over a campfire); they are never replaced by another block or broken.
     * Empty result = placed, otherwise the reason (occupied, unbreakable, block-entity, protected-area, entity-in-the-way, invalid-state, unloaded).
     */
    placeBlock(point: CombatPoint, state: string, data: string): string;
    breakBlock(point: CombatPoint, drops: boolean): string;
    /** Block entity NBT as JSON (`{}` for plain blocks); setBlockData merges fields back and refuses containers (use insertItem / extractItem). */
    blockData(point: CombatPoint): string; setBlockData(point: CombatPoint, data: string): string;
    /** Container slots `[{item,count,stack},...]`; stack is native codec JSON data (null if unencodable). extractItem returns the same shape. insertItem accepts an id or JSON.stringify(stack), with count supplied separately. */
    container(point: CombatPoint): string; insertItem(point: CombatPoint, item: string, count: number): number; extractItem(point: CombatPoint, slot: number, count: number): string;
    /** Item id or serialized stack at a point (`data` `{"pickupDelay":ticks,"velocity":[x,y,z],"glow":bool}`); returns its UUID. count overrides the serialized count. */
    dropItem(point: CombatPoint, item: string, count: number, data: string): string;
    /** Item id or serialized stack into a player's inventory; returns the count taken (0 for non-players). count overrides the serialized count. */
    giveItem(actor: CombatActor, item: string, count: number): number;
    /** Native explosion (power 0.1..8), without block destruction or fire. data: {damage?:boolean,knockback?:number}.
     * Use damage:false when a script has already settled its damage formula; native knockback and explosion events still apply. */
    explode(point: CombatPoint, power: number, data: string): boolean;
    /** Native lightning strike (flash, thunder, the bolt). It never sets fire or deals native damage; content applies its own. */
    lightning(point: CombatPoint, visualOnly: boolean): boolean;
    /** Sets an actor on fire for `ticks`; 0 extinguishes. */
    ignite(actor: CombatActor, ticks: number): boolean;
    /** Points a mob's hostility at a target; null calms it. */
    target(actor: CombatActor, target: CombatActor | null): boolean;
    /** Dimension weather for `ticks` (20..168000). */
    weather(weather: "clear" | "rain" | "thunder", ticks: number): boolean;
    effect(definition: string, target: CombatActor, data: string, ticks: number): number;
    effects(actor: CombatActor, definition: string): readonly CombatEffectView[];
    /** Live managed effects of a definition in this dimension, regardless of the carrier's distance. Read-only snapshots. */
    effectsOfType(definition: string): readonly CombatEffectView[];
    operation(id: number, operation: string, data: string): boolean;
    signal(event: string, version: number, target: CombatActor, data: string): string;
    particle(point: CombatPoint): void; busy(): boolean; cooldown(action: string): number;
    /** Compatibility + cooldown/domain/content liveness, empty when ready. Target, native slot and resource eligibility are checked by submission/commit. busy() remains an observation of any active action. */
    readiness(action: string): string;
    /** Whether a current action reserves this claim. Ambient steering yields to action owners; native high-level decisions pause for movement/aim. controlled() leases stack by scope and each scope releases its own lease. */
    claimed(claim: string): boolean;
    /** Active same-actor instances in start order. Foreground host UI prioritizes input, movement, aim, then oldest. */
    actions(): readonly CombatActionState[];
    /** Same-actor active state or terminal receipt retained for 1200 ticks. Null after departure/reload or receipt expiry. */
    action(instance: number): CombatActionState | null;
    /** Publish bounded client data, replaced by key and removed with this action/effect. */
    present(key: string, type: string, version: number, point: CombatPoint, data: string): void;
    /** Bounded receipt (1..200 ticks). Survives owner release; scene envelope lifecycle reports its tick/reason. */
    presentFor(key: string, type: string, version: number, point: CombatPoint, data: string, ticks: number): void;
    cast(action: string, target: CombatActor | null, point: CombatPoint, direction: CombatPoint, argumentsJson: string): number;

    // --- the native world -------------------------------------------------------------------------
    // Everything Minecraft and the installed mods can do is material. The methods above wrap what the host can guard
    // and clean up; these hand over the raw Java objects (Rhino calls any public method on them) for the rest: leads,
    // boats, item frames, area effect clouds, mod entities and blocks, inventories, AI goals, attributes, NBT.
    // Reads work in every scope. Writes belong to writable scopes, and what content changes through a raw object it also
    // puts back (an effect's `end`, a body's brain, or a lifetime on the spawn).

    /** `net.minecraft.world.entity.Entity` behind an actor, or null. */
    nativeEntity(actor: CombatActor): any;
    /** `net.minecraft.server.level.ServerLevel` the source stands in. */
    nativeLevel(): any;
    /** `net.minecraft.world.level.block.state.BlockState` at a point. */
    nativeBlock(point: CombatPoint): any;
    /** `net.minecraft.world.level.block.entity.BlockEntity` at a point, or null. */
    nativeBlockEntity(point: CombatPoint): any;
    /** Raw entities of every kind within `radius`, measured from their native entity positions; `type` filters by entity type id, "" keeps all. */
    nativeEntities(centre: CombatPoint, radius: number, type: string): readonly any[];
    /**
     * Spawns any registered entity type (`minecraft:leash_knot`, `minecraft:tnt`, `minecraft:area_effect_cloud`, `minecraft:boat`,
     * a mod's entity) with optional NBT JSON, as /summon would. `ticks` > 0 discards it after that long, 0 leaves it to its
     * own rules. Returns the raw entity or null.
     */
    spawnEntity(type: string, point: CombatPoint, nbt: string, ticks: number): any;
    /** Runs a server command as the controlling player at the actor's position (the console when nobody controls); returns the result count. */
    command(command: string): number;
}
interface CombatBlock {
    position(): CombatPoint; id(): string; state(): string;
    /** Full command-format state for terrain/placeBlock. state() remains the opaque comparison token. */
    blockState(): string;
    /** tags() is a JSON string array of native registry tags, including installed common conventions. */
    property(name: string): string | null; tags(): string; tagged(tag: string): boolean; growable(): boolean;
}
interface CombatWorldEvent {
    topic(): string; actor(): CombatActor; target(): CombatActor | null; action(): CombatAction | null;
    world(): CombatWorld; data(): string; data(value: string): void; reject(reason: string): void;
}
