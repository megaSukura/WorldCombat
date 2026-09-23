/**
 * Shared identity and default carriers for combatant statuses, for every living combatant alike.
 *
 * Identity is a MobEffect tag `world_combat:status/<name>` (StatusVocabulary.tag). Consumers ask
 * `CombatStatus.has(world, actor, "burn")` and never depend on a producer's effect id. Producers have
 * three equally valid routes:
 *   - `CombatStatus.inflict(world, actor, "burn")` applies the shared default effect;
 *   - declare an own variant in startup.ts with `.tag(StatusVocabulary.tag("burn"))` and it carries the
 *     identity plus the shared behavior below;
 *   - add `.tag(CombatStatus.identityOnly)` as well to borrow only the identity and write every behavior yourself.
 * Any name works as an identity, vocabulary or not; a new concept tagged this way becomes consumable by
 * anyone who asks for it later. Pokemon-specific policy (type/ability immunity, the native status mirror)
 * contributes through the registries instead of owning a second code path.
 *
 * Volatile identities with a shared default but a per-producer payload (confusion, flinch) keep their own
 * carrier and encode their own chance in the carrier amplifier; only the judgement and reaction move here.
 */
namespace CombatStatus {
    export interface Definition { effect: string; amplifier: number; ticks: (world: CombatWorld) => number; beneficial?: boolean; }
    /** Default carrier per major status; sleep and frozen use the native durations, the rest a 40 second clock. */
    export var majors: { [name: string]: Definition } = {
        poison: { effect: "minecraft:poison", amplifier: 0, ticks: function () { return 800; } },
        toxic: { effect: "minecraft:poison", amplifier: 1, ticks: function () { return 800; } },
        burn: { effect: "world_combat:burn", amplifier: 0, ticks: function () { return 800; } },
        paralysis: { effect: "world_combat:paralysis", amplifier: 0, ticks: function () { return 800; } },
        sleep: { effect: "world_combat:sleep", amplifier: 0, ticks: function (world) { return (3 + Math.floor(world.random() * 4)) * 20; } },
        frozen: { effect: "world_combat:frozen", amplifier: 0, ticks: function () { return 160; } }
    };
    /** Toxic is poison with a raised amplifier, so detection order puts it first. */
    var detectionOrder = ["toxic", "poison", "burn", "paralysis", "sleep", "frozen"];
    /** A variant carrying this tag keeps its identity but opts out of the shared behavior below. */
    export var identityOnly = StatusVocabulary.tag("identity_only");
    export var burnInterval = 100;
    export var burnFraction = 1 / 16;
    export var paralysisFailure = 0.25;
    /** Standard rejection reasons shared by action gates, so logs and receipts agree across producers. */
    export var reasons = { asleep: "asleep", frozen: "frozen", paralyzed: "paralyzed", flinched: "flinched",
        confused: "confused", exhausted: "exhausted", rooted: "rooted", locked: "locked" };

    export interface Gate { world: CombatWorld; actor: CombatActor; name: string; ticks: number; amplifier: number; options: any; allowed: boolean; beneficial: boolean; reason: string; }
    /** Immunity and policy contributions; setting `allowed=false` with a reason blocks `inflict`. */
    export var gate = new WorldContributions.Registry<Gate>();
    export interface Applied { world: CombatWorld; actor: CombatActor; name: string; effect: CombatMobEffect; }
    /** Runs after `inflict` landed an effect; mirrors synchronize here. */
    export var applied = new WorldContributions.Registry<Applied>();
    export interface Cured { world: CombatWorld; actor: CombatActor; name: string; }
    export var cured = new WorldContributions.Registry<Cured>();
    export interface Pulse { world: CombatWorld; actor: CombatActor; name: string; effect: CombatMobEffect; amount: number; }
    /** Periodic status damage before it lands (burn); contributions may scale or zero `amount`. */
    export var pulse = new WorldContributions.Registry<Pulse>();

    /** Content may supply a default carrier without adding any behavior to the identity. */
    var defaults: { [name: string]: Definition } = Object.create(null);
    export function define(name: string, definition: Definition): void {
        name = normalize(name);
        if (!name || majors[name] || defaults[name]) throw new Error("Duplicate status carrier: " + name);
        defaults[name] = definition;
    }
    // Shared volatile carriers. A producer that wants its own icon or payload still declares a tagged carrier and
    // encodes its own chance/duration; these let `inflict` and the secondary route work without a per-unit effect.
    // The shared confusion carrier must actually do something on its own, so its amplifier carries the default
    // 33% fumble chance; a producer variant keeps its own chance in its own carrier amplifier.
    define("confusion", { effect: "world_combat:confusion", amplifier: 33, ticks: function () { return 200; } });
    define("flinch", { effect: "world_combat:flinch", amplifier: 0, ticks: function () { return 20; } });
    /** The shared default definition for an identity (majors first, then registered volatiles), or null. */
    export function defaultCarrier(name: string): Definition | null {
        name = normalize(name);
        return majors[name] || defaults[name] || null;
    }

    // --- classification: harmful by default, beneficial declared by carrier or content -------------------------
    export type Side = "beneficial" | "harmful";
    export interface Classification { world: CombatWorld; actor: CombatActor; name: string; side: Side; }
    /** Extensible classification: a contribution may flip the side for a whole identity vocabulary. */
    export var classification = new WorldContributions.Registry<Classification>();
    var declaredSide: { [name: string]: Side } = Object.create(null);
    /** Declare an identity's side; `define` may also carry `beneficial: true` on its default carrier. */
    export function classify(name: string, side: Side): void { declaredSide[normalize(name)] = side; }
    /** Harmful unless declared beneficial or overridden per call; a ward blocks only harmful routed statuses. */
    export function side(world: CombatWorld, actor: CombatActor, name: string, options?: any): Side {
        name = normalize(name);
        var chosen: Side = "harmful";
        if (options && (options.beneficial === true || options.harmful === true)) chosen = options.harmful === true ? "harmful" : "beneficial";
        else {
            var definition = majors[name] || defaults[name];
            if (definition && definition.beneficial === true) chosen = "beneficial";
            else if (declaredSide[name]) chosen = declaredSide[name];
        }
        if (world.valid(actor)) {
            var context: Classification = { world: world, actor: actor, name: name, side: chosen };
            classification.apply(context); chosen = context.side;
        }
        return chosen;
    }
    export function beneficial(world: CombatWorld, actor: CombatActor, name: string, options?: any): boolean {
        return side(world, actor, name, options) === "beneficial";
    }

    export interface ActionPolicy {
        world: CombatWorld; actor: CombatActor; action: CombatAction | null;
        /** Optional domain-supplied action metadata object (a native move snapshot for native loadouts). */
        move: any;
        phase: "available" | "commit" | "damage";
        metadata: any;
        /** Remove a named restriction to exempt it; independent restrictions remain in force. */
        blocked: { [reason: string]: boolean };
        /** Attempt probabilities are rolled at commit or a native attack impact, never by availability queries. */
        failures: { [reason: string]: number };
        /** Rejection details attached to whichever reason stops the action; rides before_commit into action_rejected. */
        detail: { [reason: string]: any };
    }
    export var actions = new WorldContributions.Registry<ActionPolicy>();
    export function actionPolicy(world: CombatWorld, actor: CombatActor, action: CombatAction | null = null,
        move: any = null, phase: ActionPolicy["phase"] = "available", metadata: any = {}): ActionPolicy {
        var context: ActionPolicy = { world: world, actor: actor, action: action, move: move, phase: phase,
            metadata: metadata, blocked: {}, failures: {}, detail: {} };
        if (behaves(world, actor, "sleep")) { context.blocked.asleep = true; context.detail.asleep = { status: "sleep" }; }
        if (behaves(world, actor, "frozen")) { context.blocked.frozen = true; context.detail.frozen = { status: "frozen" }; }
        if (behaves(world, actor, "paralysis")) { context.failures.paralyzed = paralysisFailure; context.detail.paralyzed = { status: "paralysis" }; }
        if (phase !== "damage" || DamageSemantics.read(metadata).attack) {
            if (behaves(world, actor, "flinch")) { context.blocked.flinched = true; context.detail.flinched = { status: "flinch" }; }
            // Confusion is identity-driven: any carrier of the identity rolls its own amplifier, so every producer
            // keeps its own probability while the miss/reaction logic lives here.
            var confused = representative(world, actor, "confusion", true);
            if (confused !== null) {
                var chance = Math.max(0, Math.min(1, confused.amplifier() / 100));
                if (chance > 0) { context.failures.confused = chance; context.detail.confused = { status: "confusion", chance: chance, effect: String(confused.id()) }; }
            }
        }
        return actions.apply(context);
    }
    export function actionReason(context: ActionPolicy): string {
        var reasons = Object.keys(context.blocked);
        for (var i = 0; i < reasons.length; i++) if (context.blocked[reasons[i]]) return reasons[i];
        return "";
    }
    /** One probability pass for an actual attempt; callers keep their own rejection lifecycle. */
    export function attemptReason(context: ActionPolicy): string {
        var reason = actionReason(context);
        if (reason) return reason;
        var failures = Object.keys(context.failures);
        for (var i = 0; i < failures.length; i++) {
            var chance = context.failures[failures[i]];
            if (!isFinite(chance) || chance < 0 || chance > 1) throw new Error("Invalid action failure probability");
            if (chance > 0 && context.world.random() < chance) return failures[i];
        }
        return "";
    }

    // --- failure reactions --------------------------------------------------------------------------------------
    export interface Rejected {
        world: CombatWorld; actor: CombatActor; target: CombatActor | null; content: string; reason: string;
        /** Identity that caused the failure (from rejection details or the standard reason map), or "". */
        status: string; details: any;
    }
    /** Reusable receipt for an action ended by a status gate; producers attach per-move reactions (self-hit, text). */
    export var rejected = new WorldContributions.Registry<Rejected>();
    var reasonStatus: { [reason: string]: string } = { asleep: "sleep", frozen: "frozen", paralyzed: "paralysis", flinched: "flinch", confused: "confusion" };
    export function statusOfReason(reason: string): string { return reasonStatus[String(reason)] || ""; }

    // --- application ---------------------------------------------------------------------------------------------
    export interface Result { applied: boolean; reason: string; effect: CombatMobEffect | null; }
    export interface Options { unique?: boolean; secondary?: boolean; ignoreAbility?: boolean; ignoreType?: boolean;
        beneficial?: boolean; harmful?: boolean; amplifier?: number; effect?: string; [key: string]: any; }

    export function tag(name: string): string { return StatusVocabulary.tag(name); }
    function carries(effect: CombatMobEffect, name: string): boolean {
        if (effect.tagged(tag(name))) return true;
        if (name === "toxic") return effect.tagged(tag("poison")) && effect.amplifier() >= 1;
        if (name === "poison") return effect.tagged(tag("toxic"));
        return false;
    }
    /** Every status identity an effect carries (`["burn"]`, `["soaked"]`, ...), from its tags. */
    export function names(effect: CombatMobEffect): string[] {
        var prefix = StatusVocabulary.namespace + ":status/", result: string[] = [], tags = String(effect.tags()).split(/\s+/);
        for (var i = 0; i < tags.length; i++) {
            if (tags[i].indexOf(prefix) !== 0 || tags[i] === identityOnly) continue;
            var name = tags[i].substring(prefix.length); if (result.indexOf(name) < 0) result.push(name);
        }
        if (effect.tagged(tag("poison")) && effect.amplifier() >= 1 && result.indexOf("toxic") < 0) result.push("toxic");
        return result;
    }
    /** Active effects carrying the identity, whichever unit produced them. */
    export function tagged(world: CombatWorld, actor: CombatActor, name: string): CombatMobEffect[] {
        if (!world.valid(actor)) return [];
        name = normalize(name);
        var all = world.mobEffects(actor), result: CombatMobEffect[] = [];
        for (var i = 0; i < all.length; i++) if (carries(all[i], name)) result.push(all[i]);
        return result;
    }
    export function has(world: CombatWorld, actor: CombatActor, name: string): boolean { return tagged(world, actor, name).length > 0; }
    /** The first major status the actor carries now, or ""; statuses may coexist, this is a convenience for consumers. */
    export function major(world: CombatWorld, actor: CombatActor): string {
        for (var i = 0; i < detectionOrder.length; i++) if (has(world, actor, detectionOrder[i])) return detectionOrder[i];
        return "";
    }
    /** Accepts project names, Cobblemon native names (`poisonbadly`) and Showdown codes (`brn`). */
    export function normalize(name: string): string {
        var value = String(name).replace("cobblemon:", "");
        if (value === "poisonbadly") return "toxic";
        return StatusVocabulary.showdownMajor[value] || value;
    }
    export function allowed(world: CombatWorld, actor: CombatActor, name: string, ticks: number, amplifier: number, options?: any): Gate {
        return gate.apply({ world: world, actor: actor, name: normalize(name), ticks: ticks, amplifier: amplifier,
            options: options || {}, allowed: true, beneficial: beneficial(world, actor, normalize(name), options), reason: "" });
    }
    /**
     * Apply a status to any living combatant through its shared default effect. Returns false when the actor
     * is unavailable or a policy contribution refuses it (native type/ability immunity). `ticks` -1 keeps the
     * effect until cured. `options` reach the gate contributions (`ignoreAbility`, `ignoreType`, `secondary`, ...). For an
     * identity without a shared default, use `apply` with a tagged carrier or register one with `define`.
     */
    export function inflict(world: CombatWorld, actor: CombatActor, name: string, ticks?: number, amplifier?: number, options?: any): boolean {
        name = normalize(name);
        var definition = majors[name] || defaults[name];
        if (!definition) throw new Error("No default carrier for '" + name + "'; register CombatStatus.define or supply a tagged carrier to CombatStatus.apply");
        if (!world.valid(actor)) return false;
        var duration = ticks === undefined ? definition.ticks(world) : ticks, strength = amplifier === undefined ? definition.amplifier : amplifier;
        return apply(world, actor, name, definition.effect, duration, strength, options);
    }
    /** Apply a tagged carrier through the same policy/mirror hooks. `unique` replaces other carriers of this identity. */
    export function apply(world: CombatWorld, actor: CombatActor, name: string, id: string, duration: number, strength = 0,
        options?: Options): boolean {
        name = normalize(name);
        if (!world.valid(actor)) return false;
        if (duration !== -1 && (!isFinite(duration) || duration < 1 || duration % 1)) throw new Error("Status duration must be positive ticks or -1");
        if (!isFinite(strength) || strength < 0 || strength % 1) throw new Error("Status amplifier must be a non-negative integer");
        if (!allowed(world, actor, name, duration, strength, options).allowed) return false;
        return land(world, actor, name, id, duration, strength, options);
    }
    /** Land an already-allowed carrier; shared by `apply` and `impose` so the gate runs exactly once. */
    function land(world: CombatWorld, actor: CombatActor, name: string, id: string, duration: number, strength: number, options?: Options): boolean {
        world.marker(actor, id, duration, strength);
        var effect = world.mobEffect(actor, id);
        if (effect === null || !carries(effect, name)) return false;
        if (options && options.unique) tagged(world, actor, name).forEach(function (other) {
            if (String(other.id()) !== String(effect!.id())) world.removeMobEffect(actor, other.id(), other.key());
        });
        applied.apply({ world: world, actor: actor, name: name, effect: effect });
        return true;
    }
    /**
     * Apply a status without throwing when no shared default exists: the reusable route for secondary effects.
     * `options.effect` names a producer carrier; otherwise the registered default is used. The result tells
     * `applied` from `immune` (a policy refusal) and `no-carrier`/`unavailable`, for receipts and feedback.
     */
    export function impose(world: CombatWorld, actor: CombatActor, name: string, ticks?: number, options?: Options): Result {
        name = normalize(name);
        var definition = majors[name] || defaults[name];
        var id = options && options.effect ? String(options.effect) : definition ? definition.effect : "";
        if (!id) return { applied: false, reason: "no-carrier", effect: null };
        if (!world.valid(actor)) return { applied: false, reason: "unavailable", effect: null };
        var duration = ticks === undefined || ticks === null ? (definition ? definition.ticks(world) : 40) : ticks;
        var strength = options && options.amplifier !== undefined ? options.amplifier : definition ? definition.amplifier : 0;
        if (duration !== -1 && (!isFinite(duration) || duration < 1 || duration % 1)) return { applied: false, reason: "invalid", effect: null };
        if (!isFinite(strength) || strength < 0 || strength % 1) return { applied: false, reason: "invalid", effect: null };
        var outcome = allowed(world, actor, name, duration, strength, options);
        if (!outcome.allowed) return { applied: false, reason: outcome.reason === "safeguard" ? "immune" : (outcome.reason || "immune"), effect: null };
        if (!land(world, actor, name, id, duration, strength, options)) return { applied: false, reason: "carrier", effect: null };
        return { applied: true, reason: "applied", effect: representative(world, actor, name) };
    }
    export interface Secondary {
        world: CombatWorld; source: CombatActor | null; target: CombatActor; name: string;
        /** applied | immune | miss | no-carrier | unavailable | carrier. */
        outcome: string; ticks: number | undefined; chance: number; options: any;
    }
    /** Receipt for every resolved secondary status, so feedback can distinguish immunity from a miss once. */
    export var secondary = new WorldContributions.Registry<Secondary>();
    /** Remove every effect carrying the identity; returns whether anything was removed. */
    export function cure(world: CombatWorld, actor: CombatActor, name: string): boolean {
        name = normalize(name);
        var removed = false, effects = tagged(world, actor, name);
        for (var i = 0; i < effects.length; i++) removed = world.removeMobEffect(actor, effects[i].id(), effects[i].key()) || removed;
        if (removed) cured.apply({ world: world, actor: actor, name: name });
        return removed;
    }
    export function cureMajor(world: CombatWorld, actor: CombatActor): boolean {
        var name = major(world, actor); return !!name && cure(world, actor, name);
    }
    export interface EffectClassification { world: CombatWorld; actor: CombatActor; effect: CombatMobEffect; category: string; }
    /** Native MobEffectCategory is the default; named contributions can classify neutral or custom carriers. */
    export var effectClassification = new WorldContributions.Registry<EffectClassification>();
    export function harmfulEffects(world: CombatWorld, actor: CombatActor): CombatMobEffect[] {
        if (!world.valid(actor)) return [];
        return world.mobEffects(actor).filter(function (effect) {
            return effectClassification.apply({ world: world, actor: actor, effect: effect, category: String(effect.category()) }).category === "harmful";
        });
    }
    export function hasHarmful(world: CombatWorld, actor: CombatActor): boolean { return harmfulEffects(world, actor).length > 0; }
    function removeObserved(world: CombatWorld, actor: CombatActor, effects: readonly CombatMobEffect[]): number {
        var count = 0, removed: { [name: string]: boolean } = {};
        effects.forEach(function (effect) {
            if (!world.removeMobEffect(actor, effect.id(), effect.key())) return;
            count++; names(effect).forEach(function (name) { removed[name] = true; });
        });
        Object.keys(removed).forEach(function (name) { cured.apply({ world: world, actor: actor, name: name }); });
        return count;
    }
    /** Full cleansing includes native/mod harmful effects, preserving beneficial and neutral effects. */
    export function cureHarmful(world: CombatWorld, actor: CombatActor): number {
        return removeObserved(world, actor, harmfulEffects(world, actor));
    }
    /** Remove observed carriers with an arbitrary shared category/tag, reporting each removed identity once. */
    export function cureTagged(world: CombatWorld, actor: CombatActor, category: string): number {
        if (!world.valid(actor)) return 0;
        return removeObserved(world, actor, world.mobEffects(actor).filter(function (effect) { return effect.tagged(category); }));
    }

    // Shared behavior of the major statuses. Applies to every effect carrying the identity unless it opted out.
    export function behaves(world: CombatWorld, actor: CombatActor, name: string): boolean {
        var effects = tagged(world, actor, name);
        for (var i = 0; i < effects.length; i++) if (!effects[i].tagged(identityOnly)) return true;
        return false;
    }
    function immobile(world: CombatWorld, actor: CombatActor): string {
        if (behaves(world, actor, "sleep")) return "asleep";
        if (behaves(world, actor, "frozen")) return "frozen";
        return "";
    }
    function fireCause(cause: any): boolean {
        return ["inFire", "onFire", "lava", "hotFloor", "fireball", "unattributedFireball", "campfire"].indexOf(String(cause || "")) >= 0;
    }
    /** A resolved secondary status: roll the chance, then apply without throwing, and publish one receipt. */
    function secondaryStatus(world: CombatWorld, source: CombatActor | null, target: CombatActor, data: any): void {
        var opts = data.statusOptions || {};
        var chance = data.chance === undefined ? 1 : Number(data.chance);
        var ticks = opts.ticks !== undefined ? Number(opts.ticks) : data.statusTicks !== undefined ? Number(data.statusTicks) : undefined;
        var options: Options = { secondary: true, unique: opts.unique === true,
            ignoreAbility: !!(opts.ignoreAbility || data.ignoreAbility), ignoreType: !!(opts.ignoreType || data.ignoreType),
            beneficial: opts.beneficial === true, amplifier: opts.amplifier, effect: opts.effect };
        var outcome: string;
        if (!(isFinite(chance) && chance > 0 && world.random() < chance)) outcome = "miss";
        else outcome = impose(world, target, String(data.status), ticks, options).reason;
        data.statusOutcome = outcome;
        secondary.apply({ world: world, source: source, target: target, name: normalize(String(data.status)),
            outcome: outcome, ticks: ticks, chance: isFinite(chance) ? chance : 1, options: opts });
    }
    export function install(): void {
        WorldCombat.on("world_combat:status/commit", "world_combat:before_commit", "", function (event) {
            var world = event.world(), actor = event.actor(), context = actionPolicy(world, actor, event.action ? event.action() : null, null, "commit");
            var reason = attemptReason(context);
            if (reason) { if (context.detail[reason] !== undefined) event.data(JSON.stringify(context.detail[reason])); event.reject(reason); return; }
        });
        // Failure reactions: the failed action is already released and its costs rolled back, so this is a
        // writable scope. Receipts tell the identity apart so producers can attach per-move self-hit and text.
        WorldCombat.on("world_combat:status/rejected", "world_combat:action_rejected", "", function (event) {
            var data = JSON.parse(String(event.data() || "{}")), details = data.details || {};
            var reason = String(data.reason || "");
            var status = String(details.status || statusOfReason(reason) || "");
            var context: Rejected = { world: event.world(), actor: event.actor(), target: event.target(),
                content: String(data.content || ""), reason: reason, status: status, details: details };
            if (context.status && context.details.status === undefined) context.details.status = context.status;
            rejected.apply(context);
        });
        WorldCombat.on("world_combat:status/navigate", "world_combat:navigate", "", function (event) {
            if (!immobile(event.world(), event.actor())) return;
            var data = JSON.parse(String(event.data())); data.speed = 0; event.data(JSON.stringify(data));
        });
        WorldCombat.on("world_combat:status/attacks", "world_combat:damage_incoming", "", function (event) {
            var target = event.target(), actor = event.actor();
            if (target === null || String(target.key()) === String(actor.key())) return;
            var data = JSON.parse(String(event.data()));
            if (data.bypassesInvulnerability || !(data.amount > 0)) return;
            var context = actionPolicy(event.world(), actor, event.action ? event.action() : null, null, "damage", data);
            var nativeAttack = DamageSemantics.read(data).attack;
            var reason = nativeAttack ? attemptReason(context) : actionReason(context);
            if (!reason) return;
            event.reject(reason);
            if (nativeAttack) rejected.apply({ world: event.world(), actor: actor, target: target, content: "",
                reason: reason, status: statusOfReason(reason), details: context.detail[reason] || {} });
        });
        WorldCombat.on("world_combat:status/applied", "world_combat:damage_applied", "", function (event) {
            var world = event.world(), target = event.target(), data = JSON.parse(String(event.data()));
            if (target === null || !(data.actual > 0) || !world.valid(target)) return;
            if (behaves(world, target, "sleep")) cure(world, target, "sleep");
            if (behaves(world, target, "frozen") && (data.type === "fire" || fireCause(data.cause))) cure(world, target, "frozen");
            // A move's secondary status (`impact(..., { status, chance, statusTicks, statusOptions })`) lands on any
            // living target through the same route; an unregistered identity fails explainably instead of throwing.
            if (data.kind === "move" && data.status && world.valid(target)) {
                try { secondaryStatus(world, event.actor(), target, data); }
                catch (error) { data.statusOutcome = "error"; }
            }
        });
        WorldCombat.on("world_combat:status/tick", "world_combat:mob_effect_tick", "", function (event) {
            var world = event.world(), actor = event.actor(), data = JSON.parse(String(event.data()));
            if (world.tick() % burnInterval !== 0 || !world.valid(actor)) return;
            var effect = representative(world, actor, "burn", true);
            if (effect === null || String(effect.id()) !== String(data.id)) return;
            var body = world.observe(actor); if (body === null) return;
            var exposure = pulse.apply({ world: world, actor: actor, name: "burn", effect: effect, amount: -Math.max(1, Math.floor(body.maxHealth() * burnFraction)) });
            if (exposure.amount < 0) world.health(actor, exposure.amount, "world_combat:status");
        });
    }
    /** Stable strongest carrier for one-per-identity consumers, including tick consumers. */
    export function representative(world: CombatWorld, actor: CombatActor, name: string, behaviorOnly = false): CombatMobEffect | null {
        var effects = tagged(world, actor, name).filter(function (effect) { return !behaviorOnly || !effect.tagged(identityOnly); });
        effects.sort(function (a, b) { return b.amplifier() - a.amplifier() || (String(a.id()) < String(b.id()) ? -1 : String(a.id()) > String(b.id()) ? 1 : 0); });
        return effects.length ? effects[0] : null;
    }
}
CombatStatus.install();
