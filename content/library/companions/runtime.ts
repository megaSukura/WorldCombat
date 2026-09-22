namespace CompanionBehavior {
    export type Entity = WorldMethods.Subject;
    export type Use = WorldMethods.Use;
    export type Runtime = WorldMethods.Runtime;
    export const reports = new WorldContributions.Registry<{ context: WorldBehavior.Context; data: WorldBehavior.Bag }>();
    export var registry = new WorldBehavior.Registry();
    export var worksites = new WorldWork.Registry();
    export var uses = new WorldMethods.Library();
    var pool = new WorldMethods.Pool(registry);
    export var tasks = new WorldMethods.Tasks(uses, {
        reachFactor: 0.82,
        mayMove: function (context) { return Object.keys(movementRules).every(id => movementRules[id](context)); },
        mayApproach: function (context, item, purpose) { return context.facts.intent !== "stay" || purpose === "care" || ai(item, "leaveStation", false); },
        report: function (context, stage, reason) { note(context, stage, "world_combat:" + reason); }
    });
    var adapter = new PokemonBehaviorHost.Adapter(uses, {
        supports: function (id) { return !!CompanionRepertoire.catalogue.skills[id]; },
        supportsIndividual: pokemon => PokemonIndividuals.registry.supports(pokemon),
        describe: CompanionRepertoire.describe,
        enrich: function (frame, access) {
            Object.keys(factReaders).forEach(id => factReaders[id](frame, access));
            var point = access.observe(access.source())!.position();
            frame.facts.sunlight = WorldEnvironment.sunlight(access, point);
            if (typeof WorldEnvironment.read === "function") {
                var env = WorldEnvironment.read(access, point);
                frame.facts.environment = env;
                frame.facts.day = !!env.day; frame.facts.skyVisible = !!env.skyVisible; frame.facts.rain = Number(env.rain) || 0;
                frame.facts.thunder = Number(env.thunder) || 0; frame.facts.weather = env.weather || ""; frame.facts.skyKnown = !!env.skyKnown;
            }
        }
    });
    export var orders = new PokemonBehaviorHost.Orders();
    orders.register({ id: "follow" });
    orders.register({ id: "hold", persistent: true });
    orders.register({ id: "autonomous", persistent: true });
    orders.register({ id: "stay", target: "point", range: 32, persistent: true });
    orders.register({ id: "work", target: "point", range: 32, persistent: true });
    orders.register({ id: "protect", target: "friend", fallbackOwner: true, defendTarget: true });
    orders.register({ id: "focus", target: "enemy", range: 64, attackTarget: true });
    orders.alias("free", "autonomous");
    var companions = new PokemonBehaviorHost.Companions(adapter, pool, {
        id: "companion", legacyIds: ["verdant"], orders: orders, defaultIntent: "follow", decisionTicks: 4, manualGrace: 12,
        settings: { lookRange: 15, chaseRange: 16 }, command: function (operation, view) { return CompanionRepertoire.catalogue.commands.dispatch(operation, view); }
    });
    export var orderRules: { [id: string]: (context: WorldBehavior.Context, order: string[]) => void } = {};
    export function orderGoals(id: string, apply: (context: WorldBehavior.Context, order: string[]) => void): void {
        if (orderRules[id]) throw new Error("Duplicate goal ordering contribution: " + id); orderRules[id] = apply;
    }
    var installed = false;
    /** Other content can add usages, goal providers, methods and policies to the shared live companion runtime. */
    export function registerUse(move: string, value: Use): void { uses.register(move, value); }
    export function abilityMethod(specification: WorldMethods.AbilityMethod): void { tasks.method(registry, specification); }
    export function supports(pokemon: CombatPokemon, world?: CombatWorld): boolean { return adapter.supports(pokemon, world); }
    export function point(value: number[]): CombatPoint { return WorldBehaviorHost.point(value); }
    export function distance(a: number[], b: number[]): number { return WorldMethods.distance(a, b); }
    export function world(context: WorldBehavior.Context): CombatWorld { return context.services.world; }
    export function source(context: WorldBehavior.Context): Entity { return WorldMethods.source(context); }
    export function entity(context: WorldBehavior.Context, ref: string): Entity | null { return WorldMethods.find(context, ref); }
    export function ratio(value: Entity): number { return value.health / Math.max(1, value.maximum); }
    export function capability(context: WorldBehavior.Context, id: string): WorldBehavior.Capability | null { return uses.capability(context, id); }
    export function options(context: WorldBehavior.Context, protocol: string, target: Entity | null = null): WorldBehavior.Capability[] { return uses.options(context, protocol, target); }
    export function continuing(context: WorldBehavior.Context, id: string): boolean { return uses.continuing(context, id); }
    /** Candidates for a purpose, filtered by each use's `available` (with the proposed target when known) and ordered by `priority`. */
    export function ready(context: WorldBehavior.Context, protocol: string, target: Entity | null = null): WorldBehavior.Capability[] { return uses.ready(context, protocol, target); }
    export function castRange(context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string): number { return tasks.reach(context, item, purpose); }
    export function ai<T>(item: WorldBehavior.Capability, key: string, fallback: T): T {
        var config = item.data.config.ai; return config && config[key] !== undefined ? config[key] : fallback;
    }
    export function stationAllows(context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: Entity): boolean {
        var rule = uses.forCapability(item), selected = uses.selectTarget(context, item, target);
        if (!selected || !uses.accepts(context, item, selected)) return false;
        var destination = rule && rule.target ? rule.target(context, item, selected) : selected;
        var approach = rule && rule.approachTarget ? rule.approachTarget(context, item, selected) : destination;
        return !!approach && (context.facts.intent !== "stay" || ai(item, "leaveStation", false) || distance(source(context).point, approach.point) <= castRange(context, item, purpose));
    }
    export function note(context: WorldBehavior.Context, stage: string, reason: string): void {
        context.services.report(stage, reason);
        if (context.facts.managed && context.tick >= (context.memory.feedbackAt || 0)) {
            const report = reports.apply({ context, data: { actor: context.actor, intent: context.facts.intent, stage, reason } });
            WorldFeedback.keep(world(context), "world_combat:companion", "world_combat:companion", 1, point(source(context).point), report.data, 20);
            context.memory.feedbackAt = context.tick + 8;
        }
    }
    export function stopMovement(context: WorldBehavior.Context): void { tasks.stop(context); }
    export function navigate(context: WorldBehavior.Context, goal: number[], within: number): string { return tasks.move(context, goal, within); }
    export function recent(context: WorldBehavior.Context, kind: string, ref: string, duration: number): boolean { return WorldMethods.recent(context, kind, ref, duration); }
    export function remember(context: WorldBehavior.Context, kind: string, ref: string): void { WorldMethods.remember(context, kind, ref); }
    export function goalEntity(context: WorldBehavior.Context): Entity | null { return WorldMethods.goalSubject(context); }
    export function protectedControl(target: Entity): boolean { return target.sleeping || target.rooted; }
    export function fleeing(context: WorldBehavior.Context, target: Entity): boolean {
        return !!context.senses["world_combat:movement"] && !!context.senses["world_combat:movement"][target.ref];
    }
    export function observedFlag(context: WorldBehavior.Context, id: string, read: () => boolean): boolean { return WorldMethods.cached(context, id, read); }
    /** Register a read-only, callback-scoped observation; fact() caches its plain result for one decision. */
    export function registerFact(id: string, read: (access: CombatWorld, actor: CombatActor, argument: any) => any): void { adapter.world.probe(id, read); }
    export function fact<T>(context: WorldBehavior.Context, probe: string, target: Entity, argument: any = null): T | null { return WorldMethods.fact<T>(context, probe, target, argument); }
    export function domain(context: WorldBehavior.Context, target: Entity): string | null { return target.domain || fact<string>(context, "world:domain", target); }
    export function entityType(context: WorldBehavior.Context, target: Entity): WorldBehaviorHost.EntityType | null { return WorldBehaviorHost.entityType(context, target); }
    export function velocity(context: WorldBehavior.Context, target: Entity): number[] | null { return WorldBehaviorHost.velocity(context, target); }
    export function pokemonFacts(context: WorldBehavior.Context, target: Entity): PokemonBehaviorHost.Facts | null { return PokemonBehaviorHost.facts(context, target); }
    /** Read-only shared facts: current stage map, effective attack/defence/speed, native mass, bound identity, environment. */
    export function stages(context: WorldBehavior.Context, target: Entity): { [stat: string]: number } {
        return fact<{ [stat: string]: number }>(context, "world:stages", target) || {};
    }
    export function stage(context: WorldBehavior.Context, target: Entity, stat: string): number {
        var value = Number(stages(context, target)[stat]); return isFinite(value) ? value : 0;
    }
    export function combatStats(context: WorldBehavior.Context, target: Entity): any {
        return fact<any>(context, "world:stats", target);
    }
    export function speed(context: WorldBehavior.Context, target: Entity): number | null {
        var value = fact<number>(context, "world:speed", target); return typeof value === "number" && isFinite(value) ? value : null;
    }
    /** Native weight (hg) for a Pokemon; other bodies publish no native mass and return null. */
    export function mass(context: WorldBehavior.Context, target: Entity): number | null {
        var value = fact<number>(context, "world:mass", target); return typeof value === "number" && isFinite(value) ? value : null;
    }
    /** Bound identity: a rooted world effect or the partiallytrapped/trapped/leechseed status. */
    export function bound(context: WorldBehavior.Context, target: Entity): boolean {
        return !!fact<boolean>(context, "world:bound", target);
    }
    export function statuses(context: WorldBehavior.Context, target: Entity): string[] {
        return fact<string[]>(context, "world:statuses", target) || [];
    }
    export function environment(context: WorldBehavior.Context, target: Entity): any {
        return fact<any>(context, "world:environment", target);
    }
    /** One candidate while the shared threat sense ranks it; contributions qualify it and/or lower `score`. */
    export interface ThreatCandidate { context: WorldBehavior.Context; self: Entity; defended: Entity; subject: Entity; qualifies: boolean; score: number; }
    /** Named target-priority contributions let content pull scripted companions/wild AI toward marked or taunting subjects. */
    export var threatBiasRules = new WorldContributions.Registry<ThreatCandidate>();
    export function targetPriority(id: string, rule: (candidate: ThreatCandidate) => void): void {
        threatBiasRules.define({ id: "world_combat:threat/" + id, apply: rule });
    }
    export function threatBias(candidate: ThreatCandidate): void { threatBiasRules.apply(candidate); }
    export function marker(context: WorldBehavior.Context, target: Entity, id: string): boolean {
        return !!fact<boolean>(context, "world:marker", target, id);
    }
    export function effect(context: WorldBehavior.Context, target: Entity, id: string): boolean {
        return !!fact<boolean>(context, "world:effect", target, id);
    }
    export function guarded(context: WorldBehavior.Context, target: Entity, id: string): boolean {
        return !!fact<boolean>(context, "world:guard", target, id);
    }
    /** Shared status identity on any combatant, published through the world_combat:status/<name> tag. */
    export function status(context: WorldBehavior.Context, target: Entity, name: string): boolean {
        return !!fact<boolean>(context, "world:status", target, name);
    }
    export function poisoned(context: WorldBehavior.Context, target: Entity): boolean { return status(context, target, "poison"); }
    export function restingPlace(context: WorldBehavior.Context): boolean {
        return context.facts.intent === "stay" || context.facts.intent === "work" || context.facts.intent === "autonomous" || context.facts.wild && context.facts.restFor >= 80;
    }
    export function drainNeeded(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (ratio(source(context)) < ai(item, "healBelow", 0.82))
            return true;
        return item.data.config.recipient === "injured-friend" && (context.facts.nearby as Entity[]).some(function (other) {
            return other.friendly && other.health > 0 && ratio(other) < ai(item, "healBelow", 0.82) && distance(other.point, source(context).point) <= 6;
        });
    }
    /** Skill instances are reacquired every tick, including after PP, loadout or preference changes. */
    export function castNode(id: string, purpose: string, aim: (context: WorldBehavior.Context) => Entity | null): WorldBehavior.Node { return tasks.use(id, purpose, aim); }
    /** Work providers share normal movement, native PP settlement and action readiness. */
    export function performAt(context: WorldBehavior.Context, id: string, purpose: string, position: number[], progress: WorldBehavior.Bag): WorldBehavior.Result { return tasks.at(context, id, purpose, position, progress); }
    /** Additional usage methods share the same action readiness, approach and completion rules. */
    export function useSkillNode(id: string, purpose: string, aim: (context: WorldBehavior.Context) => Entity | null): WorldBehavior.Node {
        return castNode(id, purpose, aim);
    }
    export function travelNode(destination: (context: WorldBehavior.Context) => number[], within: number, stage: string, continuous: boolean): WorldBehavior.Node { return tasks.travel(destination, within, stage, continuous); }
    export function constrained(context: WorldBehavior.Context, destination: number[]): number[] {
        var anchor: number[] = context.facts.anchor, range = context.facts.range;
        var dx = destination[0] - anchor[0], dz = destination[2] - anchor[2], length = Math.sqrt(dx * dx + dz * dz);
        if (length > range)
            return [anchor[0] + dx / length * range, destination[1], anchor[2] + dz / length * range];
        return destination;
    }
    /** Plain data input shared by owned and wild adapters. Services must come from this callback. */
    export function frame(access: CombatWorld, pokemon: CombatPokemon, intent: string, anchor: CombatPoint, owner: CombatActor | null, protect: CombatActor | null, focused: CombatActor | null, range: number, capture: string, cast: (slot: number, target: CombatActor | null, point: CombatPoint, direction: CombatPoint, input: string) => WorldMethods.Submission, report: (stage: string, reason: string) => void): WorldBehavior.Frame {
        return adapter.frame(access, pokemon, intent, anchor, owner, protect, focused, range, capture, cast, report);
    }
    export function runtime(input: WorldBehavior.Frame, initial?: any): Runtime { return pool.get(input, initial); }
    export function update(view: CombatTactics): void { companions.update(view); }
    /** Wild ownership and encounter registration are supplied by the adapter; both populations run these methods. */
    export function runWild(input: WorldBehavior.Frame, memory?: any): WorldBehavior.Report {
        return runtime(input, memory).agent.tick(input);
    }
    export function stopWild(input: WorldBehavior.Frame, reason: string): void { pool.stop(input, reason); }
    /** The host already cancels actor resources on removal or rebinding; only transient script state remains. */
    export function forgetWild(actorRef: string): void { pool.forget(String(actorRef)); }
    export function install(): void { if (installed)
        return; installed = true; companions.install(); }
    export interface Combination {
        prepare(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity, controls: WorldBehavior.Capability[]): {
            requested: boolean;
            control: WorldBehavior.Capability | null;
            wait: boolean;
        } | null;
        wait(context: WorldBehavior.Context): WorldBehavior.Node;
        priority(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity | null): number;
    }
    export var combinations: {
        [id: string]: Combination;
    } = Object.create(null);
    export function registerCombination(id: string, value: Combination): void { if (combinations[id])
        throw new Error("Duplicate combination " + id); combinations[id] = value; }
    var usedHandlers: {
        [id: string]: (frame: WorldBehavior.Frame, resident: WorldBehavior.Bag) => void;
    } = Object.create(null);
    export function onUsed(id: string, used: (frame: WorldBehavior.Frame, resident: WorldBehavior.Bag) => void): void { usedHandlers[id] = used; }
    export function used(id: string, frame: WorldBehavior.Frame, resident: WorldBehavior.Bag): void { if (usedHandlers[id])
        usedHandlers[id](frame, resident); }
    var movementRules: {
        [id: string]: (context: WorldBehavior.Context) => boolean;
    } = Object.create(null);
    export function movementRule(id: string, rule: (context: WorldBehavior.Context) => boolean): void { movementRules[id] = rule; }
    var factReaders: {
        [id: string]: (frame: WorldBehavior.Frame, access: CombatWorld) => void;
    } = Object.create(null);
    export function readFacts(id: string, read: (frame: WorldBehavior.Frame, access: CombatWorld) => void): void { factReaders[id] = read; }
    install();
}
