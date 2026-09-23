/** Available in server scripts when the Cobblemon adapter is loaded. Read-only snapshots. */
interface CombatPokemonAttribute extends CombatAttribute { modifiers(): string; }
interface CombatPokemon {
    /** Snapshot of the adapter's registered public attributes, including saved permanent modifiers while recalled. */
    attribute(id: string): CombatPokemonAttribute | null;
    id(): string;
    species(): string;
    level(): number;
    health(): number;
    maxHealth(): number;
    /** Minecraft health units per native Pokemon HP. */
    healthScale(): number;
    /** Existing native DEF contribution to world armor; read from Cobblemon's own projection. */
    projectedArmor(): number;
    projectedToughness(): number;
    nature(): string;
    effectiveNature(): string;
    ability(): string;
    /** Empty string when no item is held. */
    heldItem(): string;
    /** Native ItemStack description ID, including namespaces supplied by other Mods. */
    heldDescriptionId(): string;
    heldStack(): CombatItem;
    heldKey(): string;
    heldTag(id: string): boolean;
    owner(): string;
    originalTrainer(): string;
    friendship(): number;
    experience(): number;
    baseExperience(): number;
    /** Exact native FormData.name, preserving spelling and case. */
    form(): string;
    /** JSON string array of the individual's calculated and forced native aspects; exact membership via aspect(). */
    aspects(): string; aspect(name: string): boolean;
    shiny(): boolean;
    /** Native individual scale modifier. */
    scale(): number;
    teraType(): string; dynamaxLevel(): number; gigantamaxFactor(): boolean;
    status(): string;
    statusKey(): string; statusSeconds(): number; weight(): number; canEvolve(): boolean;
    wild(): boolean;
    /** Native storage state name (inactive, sent-out, shouldered); independent of a live entity. */
    activeState(): string;
    /** Native PoseType name in lowercase; empty while no world entity exists. */
    pose(): string;
    /** Physical contact with the ground; independent of Flying type, pose and the riding controller's selected style. */
    grounded(): boolean;
    /** Native active riding style (land, liquid, air), or empty when this entity has no rider. */
    ridingStyle(): string;
    vehicle(): boolean;
    passenger(): boolean;
    /** UUID selected by native riding driver rules; empty if there is no driver. */
    driver(): string;
    /** Whether the world entity exists and Minecraft AI is enabled (respects NoAI). */
    aiEnabled(): boolean;
    /** JSON array of native IDs currently accessible by level, memory or evolution, plus equipped moves. */
    accessibleMoves(): string;
    canAccessMove(id: string): boolean;
    gender(): string;
    typeCount(): number;
    type(index: number): string;
    /** Native permanent stat ID, e.g. cobblemon:attack, or its Showdown alias atk. */
    stat(id: string): number;
    /** JSON string array of canonical permanent stat ids from the installed provider, including addon stats. */
    statIds(): string;
    /** Native form base stat, or null when the installed provider has no form base value for this stat. */
    baseStat(id: string): number | null;
    iv(id: string): number;
    effectiveIv(id: string): number;
    ev(id: string): number;
    evYield(id: string): number;
    moveSlots(): number;
    /** Zero-based native slot; empty slots remain null. */
    move(slot: number): CombatPokemonMove | null;
    /** Native Cobblemon pasture tether facts, or null for a party/wild individual. */
    pasture(): CombatPasture | null;
}
interface CombatPasture {
    id(): string; dimension(): string; position(): CombatPoint; min(): CombatPoint; max(): CombatPoint;
    owner(): string; combatAllowed(): boolean; json(): string;
}
interface CombatPokemonMove {
    /** Native move identity, stable across PP updates and replaced with the move. Catalogue views use a template key with no live resource balance. */
    key(): string;
    id(): string;
    type(): string;
    category(): string;
    power(): number;
    accuracy(): number;
    pp(): number;
    maxPp(): number;
    priority(): number; critRatio(): number;
    /** Native target identifier; independent of the world action's targeting kind. */
    target(): string; number(): number; basePp(): number; raisedPpStages(): number;
    /** JSON number array in native effect order. */
    effectChances(): string;
    /** Native flags object as JSON; flag(name) accepts native boolean/numeric flags and returns false when absent. */
    flags(): string; flag(name: string): boolean;
    /** Complete serializable native registry entry, refreshed with native data reload. Additional fields retain their native names/types; executable callbacks are omitted by native serialization. */
    metadata(): string;
}
declare const CobblemonCombat: {
    /** Compare the native base; world modifiers remain untouched and saving follows the individual. */
    attributeBase(world: CombatWorld, actor: CombatActor, id: string, expected: number, value: number): boolean;
    /** Register a namespaced, epoch-scoped handler for a currently owned party individual, sent out or recalled. */
    channel(id: string, callback: (request: CombatContentRequest) => void): void;
    /** Namespaced, bounded JSON object attached to the native individual, or null when absent. */
    data(world: CombatWorld, actor: CombatActor, key: string): string | null;
    /** Canonical JSON CAS; null means absent/deleted. Requires a live writable world scope. */
    compareData(world: CombatWorld, actor: CombatActor, key: string, expected: string | null, value: string | null): boolean;
    register(id: string, version: string, maxTicks: number, callback: (action: CombatAction) => void): void;
    /** WorldCombat.composition declares compatibility for these native-domain actions too. Shared NativeLoadout.fork starts an independent paid child from an explicit native slot; NativeRepertoire.Skill.composition supplies its control claims. */
    registerAction(id: string, version: string, maxTicks: number, targetKind: "enemy" | "friend" | "aim" | "point" | "motion" | "self", range: number, callback: (action: CombatAction) => void): void;
    tactics(callback: (view: CombatTactics) => void): void;
    skill(world: CombatWorld, slot: number): CombatWorldSkill;
    slot(slot: number, action: string): void;
    loadout(callback: (slot: CombatLoadout) => void): void;
    growth(callback: (event: CombatGrowthEvent) => void): void;
    capture(callback: (event: CombatCaptureEvent) => void): void;
    ppCost(action: CombatAction, slot: number, moveKey: string, amount: number): CombatCost;
    /** A native single-type relation. Unsupported pairs are explicit errors. */
    typeEffectiveness(attack: string, defence: string): number;
    /** Set the entity's base world health capacity while retaining native current HP. */
    healthCapacity(world: CombatWorld, actor: CombatActor, value: number): void;
    /** Read-only catalogue metadata; its PP fields are template defaults, not an individual's balance. */
    moveTemplate(id: string): CombatPokemonMove;
    /**
     * Read-only pack setting from the server-authoritative `config/cobblemon_world_combat-server.toml`, keyed by:
     * `mobilityBase`, `mobilityGrowth`, `mobilityMinimum`, `mobilityMaximum`, `ppCapacity`, `encounterIdleTicks`.
     * NeoForge syncs the server's file to clients; before a server provides it the built-in defaults are returned.
     * Unknown keys throw.
     */
    packConfig(key: "mobilityBase" | "mobilityGrowth" | "mobilityMinimum" | "mobilityMaximum" | "ppCapacity" | "encounterIdleTicks"): number;
    pokemon(actor: CombatActor): CombatPokemon;
    status(world: CombatWorld, actor: CombatActor, id: string, seconds: number, expectedKey: string): boolean;
    statusSeconds(world: CombatWorld, actor: CombatActor, seconds: number, expectedKey: string): boolean;
    /** Clear only this exact native status container when the current action/effect owner is released. */
    statusMirror(world: CombatWorld, actor: CombatActor, expectedKey: string): boolean;
    /** Content takes over the native status clock for this Pokemon; the lease holds until `statusRelease`. */
    statusLease(world: CombatWorld, actor: CombatActor): void;
    statusRelease(world: CombatWorld, actor: CombatActor): void;
    consumeHeld(world: CombatWorld, actor: CombatActor, expectedKey: string, count: number): boolean;
    /** Exchange current native held stacks after both identities and native pre-events accept. */
    swapHeld(world: CombatWorld, first: CombatActor, second: CombatActor, firstKey: string, secondKey: string): boolean;
    /** Ordered read-only party of the actor's owner as JSON [{slot,id,species,level,health,maxHealth,fainted,state,active}]; [] for a wild actor, an absent entity or an owner whose party no longer holds the actor. */
    party(world: CombatWorld, actor: CombatActor): string;
    pasture(world: CombatWorld, actor: CombatActor): CombatPasture | null;
    pastureAllows(world: CombatWorld, actor: CombatActor, point: CombatPoint): boolean;
    /** Native recall of the sent-out individual behind the actor; false with no state change when it is not the live partner. */
    recall(world: CombatWorld, actor: CombatActor): boolean;
    /** Native send-out of the owner's party `slot` at `point` (or the actor's position); JSON {ok,reason,ref,restored}. A non-null point must be finite, loaded, in-world and unblocked. */
    sendOut(world: CombatWorld, actor: CombatActor, slot: number, point: CombatPoint | null): string;
    /** Recall the actor and send party `slot` out where it stood; JSON {ok,reason,ref,restored}. The slot object is captured before the recall; `restored` is false when a refused send-out could not put the caster back. */
    switchOut(world: CombatWorld, actor: CombatActor, slot: number, point: CombatPoint | null): string;
    /** Restore a fainted party member to `ratio` of maximum HP (a separate step from sendOut); false with no change when it is not a legal fainted member. */
    revive(world: CombatWorld, actor: CombatActor, slot: number, ratio: number): boolean;
    /** Same revive step with a readable reason as JSON {ok,reason,restored}; both writes report their own result. */
    reviveResult(world: CombatWorld, actor: CombatActor, slot: number, ratio: number): string;
    /** Compare-and-write the native PP balance; stale move identities or balances return false. */
    pp(world: CombatWorld, actor: CombatActor, slot: number, moveKey: string, expectedPp: number, value: number): boolean;
    record(world: CombatWorld, actor: CombatActor, id: string, amount: number): void;
    resetCritical(world: CombatWorld, actor: CombatActor): void;
};

/** Synchronous owned-party scope. Writes publish together after successful return; retained handles expire. */
interface CombatContentRequest {
    pokemon(): CombatPokemon;
    /** Live, read-only scope for this owned party member in the caller's world. */
    world(): CombatWorld | null;
    actor(): CombatActor | null;
    /** JSON roster of party slots and loaded owned pasture residents; pasture entries use pseudo slots >= 6. */
    roster(): string;
    input(): string;
    data(key: string): string | null;
    compareData(key: string, expected: string | null, value: string | null): boolean;
    reply(json: string): void;
}

/** Synchronous observation with staged, once-only writes. Retained mutation handles expire on return. */
interface CombatGrowthEvent {
    kind(): string;
    actor(): CombatPokemon;
    target(): CombatPokemon | null;
    move(): CombatPokemonMove | null;
    amount(): number;
    cause(): string;
    recipientCount(): number;
    recipient(index: number): CombatGrowthRecipient;
    config(key: "experienceMultiplier" | "experienceShareMultiplier" | "luckyEggMultiplier" | "awardExperienceToFaintedPokemon"): number;
    record(id: "use_move" | "defeat" | "damage_taken" | "recoil" | "critical_hits", amount: number): void;
}
interface CombatGrowthRecipient {
    pokemon(): CombatPokemon;
    participated(): boolean;
    readyLevelEvolution(): boolean;
    experience(amount: number): void;
    ev(stat: string, amount: number): void;
}

interface CombatCaptureEvent {
    kind(): "interaction" | "capture";
    ball(): string;
    target(): CombatPokemon;
    tick(): number;
    activeCount(): number;
    active(index: number): CombatPokemon;
    /** Transient values for this player and wild individual; absent values are NaN. */
    number(key: string): number;
    setNumber(key: string, value: number): void;
    /** Overrides the ball modifier; the native capture calculator and capture effects still execute. */
    multiplier(value: number): void;
}

interface CombatLoadout {
    pokemon(): CombatPokemon;
    /** Callback-scoped, read-only world facts for temporary bindings and restrictions. */
    world(): CombatWorld;
    slot(): number;
    bind(action: string, identity: string, labelTranslationKey: string): void;
    unavailable(reason: string): void;
    resource(remaining: number, maximum: number): void;
    /** Current individual/configuration-dependent reach, bounded by the action's registered maximum. */
    range(value: number): void;
    argument(key: string, value: string): void;
}

interface CombatWorldSkill {
    id(): string; kind(): string; range(): number; ready(): boolean;
    cast(target: CombatActor | null, point: CombatPoint, direction: CombatPoint): boolean;
    /** Exact accepted instance, even if already finished when submission returns; 0 on refusal. cast() is the boolean convenience wrapper. */
    submit(target: CombatActor | null, point: CombatPoint, direction: CombatPoint): number;
}
/** Synchronous scope; all mutation access expires when the callback returns. */
interface CombatTactics {
    castInput(slot: number, target: CombatActor | null, point: CombatPoint, direction: CombatPoint, input: string): boolean;
    /** Identity-preserving submission, with the same validation as castAt/castPoint/castInput; 0 on refusal. */
    submitAt(slot: number, target: CombatActor): number;
    submitPoint(slot: number, point: CombatPoint, direction: CombatPoint): number;
    submitInput(slot: number, target: CombatActor | null, point: CombatPoint, direction: CombatPoint, input: string): number;
    world(): CombatWorld; actor(): CombatActor;
    /** Live owner in this world, or null while the owner is offline or elsewhere. */
    owner(): CombatActor | null;
    operation(): string; notice(): string; value(): number; memberIndex(): number;
    commandTarget(): CombatActor | null; commandPoint(): CombatPoint;
    intent(): string; intentTarget(): CombatActor | null; intentPoint(): CombatPoint | null;
    intent(id: string, target: CombatActor | null, point: CombatPoint | null): void;
    tactics(): string; permissions(): number; chaseRange(): number;
    settings(preset: string, permissions: number, range: number): void;
    captureHold(): string; capture(id: string): void; lastManual(): number; pending(): boolean;
    /** True only while a ready buffered action owns approach navigation. Cooldown buffering leaves normal AI running. */
    pendingNavigation(): boolean;
    blockedUntil(): number; blockedUntil(tick: number): void;
    memory(): string; memory(json: string): void; preferences(): string; preferences(json: string): void;
    report(stage: string, reason: string): void; reject(reason: string): never;
    action(slot: number): string; canUse(slot: number): boolean; kind(slot: number): string; range(slot: number): number;
    castAt(slot: number, target: CombatActor): boolean;
    castPoint(slot: number, point: CombatPoint, direction: CombatPoint): boolean;
}
