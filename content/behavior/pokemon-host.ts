/** Cobblemon supplies native individual facts, live equipped actions and command storage. */
namespace PokemonBehaviorHost {
    WorldBehaviorHost.defineActorFacts("cobblemon:individual", function (world, actor, key) {
        if (String(actor.domain()) !== "cobblemon") return undefined;
        if (key === "stages") {
            var values: { [stat: string]: number } = {};
            CombatStages.stats.forEach(function (stat) { values[stat] = NativeEffects.effectiveStage(world, actor, stat); });
            return values;
        }
        if (key === "mass") return CobblemonCombat.pokemon(actor).weight();
        if (key === "speed") return NativeEffects.effectiveStat(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor), "spe");
        if (key === "stats") {
            var facts = PokemonDamage.combatants.read(world, actor), stats: { [id: string]: number | null } = {};
            ["atk", "def", "spa", "spd", "spe"].forEach(function (id) {
                stats[id] = facts.stats[id] === undefined ? null : facts.stats[id] * NativeEffects.multiplier(NativeEffects.effectiveStage(world, actor, id));
            });
            return { level: facts.level === undefined ? null : facts.level, types: facts.types, healthScale: facts.healthScale, stats: stats };
        }
        return undefined;
    });
    export interface Facts extends WorldBehavior.Bag {
        species: string; level: number; status: string; wild: boolean; owner: string; aiEnabled: boolean;
        types: string[]; gender: string; form: string; aspects: string[];
    }
    function factsOf(pokemon: CombatPokemon): Facts {
        var types: string[] = [];
        for (var i = 0; i < pokemon.typeCount(); i++) types.push(String(pokemon.type(i)));
        return { species: String(pokemon.species()), level: pokemon.level(), status: String(pokemon.status()), wild: pokemon.wild(),
            owner: String(pokemon.owner()), aiEnabled: pokemon.aiEnabled(), types: types, gender: String(pokemon.gender()), form: String(pokemon.form()),
            aspects: JSON.parse(String(pokemon.aspects())) };
    }
    /** Native identity uses published survey facts when complete, otherwise one lazy snapshot per decision. */
    export function facts(context: WorldBehavior.Context, subject: WorldMethods.Subject): Facts | null {
        if (subject.domain && subject.domain !== "cobblemon") return null;
        var published = subject.facts;
        if (published && typeof published.species === "string" && Array.isArray(published.types) && typeof published.gender === "string"
            && typeof published.form === "string" && Array.isArray(published.aspects)) return published as Facts;
        return WorldMethods.fact<Facts>(context, "pokemon:facts", subject);
    }
    export interface Skill { range: number; kind: string; config: any; }
    export interface Source {
        describe(world: CombatWorld, actor: CombatActor, id: string): Skill | null;
        supports(id: string): boolean;
        supportsIndividual?(pokemon: CombatPokemon): boolean;
        enrich?(frame: WorldBehavior.Frame, world: CombatWorld, pokemon: CombatPokemon): void;
    }
    export class Adapter {
        readonly world: WorldBehaviorHost.Adapter;
        constructor(readonly uses: WorldMethods.Library, private source: Source) {
            this.world = new WorldBehaviorHost.Adapter(function (_access, actor, value, facts) {
                if (!value.visible || value.friendly) return;
                // Survey records carry the Pokemon's published facts; a lone observation reads the Pokemon itself.
                if (facts) { if (typeof facts.status === "string") value.sleeping = facts.status === "cobblemon:sleep"; return; }
                if (actor && String(actor.domain()) === "cobblemon") {
                    value.facts = factsOf(CobblemonCombat.pokemon(actor)); value.sleeping = value.facts.status === "cobblemon:sleep";
                }
            });
            this.world.probe("pokemon:status", function (_access, actor) {
                return String(actor.domain()) === "cobblemon" ? String(CobblemonCombat.pokemon(actor).status()) : "";
            });
            this.world.probe("pokemon:facts", function (_access, actor) {
                return String(actor.domain()) === "cobblemon" ? factsOf(CobblemonCombat.pokemon(actor)) : null;
            });
        }
        supports(pokemon: CombatPokemon, world?: CombatWorld): boolean {
            for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
                var move = pokemon.move(slot); if (!move) continue;
                var id = world ? NativeLoadout.selection(world, slot, move).id : String(move.id());
                if (this.uses.get(id) && this.source.supports(id)) return true;
            }
            return !!this.source.supportsIndividual && this.source.supportsIndividual(pokemon);
        }
        frame(access: CombatWorld, pokemon: CombatPokemon, intent: string, anchor: CombatPoint,
              owner: CombatActor | null, protect: CombatActor | null, focused: CombatActor | null, range: number, capture: string,
               cast: (slot: number, target: CombatActor | null, point: CombatPoint, direction: CombatPoint, input: string) => WorldMethods.Submission,
              report: (stage: string, reason: string) => void): WorldBehavior.Frame {
            var actor = access.source(), adapter = this;
            var tCapture = WorldCombat.clock();
            var result = this.world.capture(access, { intent: intent, anchor: anchor, owner: owner, focused: focused, range: range, focusActive: intent === "focus" });
            result.facts.self.facts = factsOf(pokemon);
            WorldCombat.measured("frame capture", tCapture);
            var tSkills = WorldCombat.clock();
            for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
                var move = pokemon.move(slot); if (!move) continue;
                var selection = NativeLoadout.selection(access, slot, move), id = selection.id;
                var use = this.uses.get(id), skill = use && this.source.describe(access, actor, id);
                if (!use || !skill) continue;
                var native = CobblemonCombat.skill(access, slot), key = String(move.key());
                // Selection revisions retire old plans while the equipped slot remains the resource owner.
                result.capabilities.push({ id: JSON.stringify([id, slot, key, selection.key]), protocols: use.protocols.slice(), data: {
                    use: id, move: id, source: String(move.id()), key: key, selection: selection.key, slot: slot,
                    range: skill.range, kind: skill.kind, ready: native.ready(), available: move.pp() > 0, pp: move.pp(), maxPp: move.maxPp(), config: skill.config
                } });
            }
            WorldCombat.measured("frame skills", tSkills);
            var tRest = WorldCombat.clock();
            var capturedRef = "";
            if (capture) (result.facts.nearby as WorldMethods.Subject[]).forEach(function (entry) {
                var other = access.actor(entry.ref);
                if (other && String(other.domain()) === "cobblemon" && String(CobblemonCombat.pokemon(other).id()) === capture) capturedRef = entry.ref;
            });
            if (capture && focused && String(focused.domain()) === "cobblemon" && String(CobblemonCombat.pokemon(focused).id()) === capture) {
                capturedRef = String(focused.ref()); result.facts.focusIssue = "capture-in-progress";
            }
            result.facts.capture = capturedRef; result.facts.protect = protect ? String(protect.ref()) : "";
            result.facts.mounted = pokemon.vehicle() || pokemon.passenger();
            NativeNatures.apply(result, pokemon);
            result.facts.attack = pokemon.stat("atk"); result.facts.specialAttack = pokemon.stat("spa"); result.facts.speed = pokemon.stat("spe"); result.facts.friendship = pokemon.friendship();
            result.services.report = report; result.services.cast = cast;
            result.services.behavior = adapter.world.operations(access, function (item, target) {
                if (item.data.action) return WorldAbilities.submit(result, item.id, target);
                var paying = CobblemonCombat.pokemon(actor).move(item.data.slot);
                if (!paying || String(paying.key()) !== item.data.key) return false;
                var selected = NativeLoadout.selection(access, item.data.slot, paying);
                if (selected.id !== item.data.move || selected.key !== item.data.selection) return false;
                var pointTarget = item.data.kind === "point" || item.data.kind === "motion";
                var actual = item.data.kind === "self" ? actor : pointTarget ? null : access.actor(target.ref);
                if (!pointTarget && !actual) return false;
                var position = WorldBehaviorHost.point(target.point), origin = access.observe(actor)!.position(), delta = position.minus(origin);
                var direction = delta.length() < 0.01 ? WorldCombat.point(0, 0, 1) : delta.unit();
                access.face(position, 15, 15);
                return cast(item.data.slot, actual, position, direction, "{}");
            });
            const attributes = IndividualAttributes.live(access, actor);
            result.services.attribute = (id: string) => IndividualAttributes.read(attributes, id);
            result.services.attributeDetails = (id: string) => IndividualAttributes.inspect(attributes, id);
            BehaviorProfiles.add(result, "individual:attributes", {
                curiosity: IndividualAttributes.read<number>(attributes, "world_combat:curiosity"),
                risk: IndividualAttributes.read<number>(attributes, "world_combat:risk"),
                persistence: IndividualAttributes.read<number>(attributes, "world_combat:persistence")
            });
            PokemonIndividuals.registry.apply({ pokemon: pokemon, world: access, actor: actor, frame: result });
            if (owner && access.valid(owner)) EquipmentBehavior.apply(access, owner, actor, result);
            if (this.source.enrich) this.source.enrich(result, access, pokemon);
            result = NativeItems.apply(access, actor, "behavior", { frame: result }).frame;
            result = NativeAbilities.apply(access, actor, "behavior", { frame: result }).frame;
            WorldCombat.measured("frame enrich", tRest);
            return result;
        }
    }
    export interface Order {
        id: string; target?: "point" | "friend" | "enemy"; range?: number; fallbackOwner?: boolean;
        persistent?: boolean; defendTarget?: boolean; attackTarget?: boolean;
        apply?(view: CombatTactics): void;
    }
    /** New command identities and their handlers are registered by the composition. */
    export class Orders {
        private definitions: { [id: string]: Order } = Object.create(null);
        private aliases: { [id: string]: string } = Object.create(null);
        register(order: Order): void {
            if (!order.id || this.definitions[order.id]) throw new Error("Duplicate companion order"); this.definitions[order.id] = order;
        }
        alias(previous: string, current: string): void { this.aliases[previous] = current; }
        canonical(id: string): string { return this.aliases[id] || id; }
        get(id: string): Order | null { return this.definitions[this.canonical(id)] || null; }
        execute(id: string, view: CombatTactics): boolean {
            var order = this.get(id); if (!order) return false;
            if (order.apply) { order.apply(view); return true; }
            var access = view.world(), observed = access.observe(view.actor())!, target = order.target === "friend" || order.target === "enemy" ? view.commandTarget() : null;
            if (!target && order.fallbackOwner) target = view.owner();
            if (order.target === "enemy" && !target) view.reject("invalid-target");
            if (target && access.friendly(target) !== (order.target === "friend")) view.reject("invalid-target");
            var destination = order.target === "point" ? view.commandPoint() : null;
            if (order.range !== undefined) {
                var targetView = target ? access.observe(target) : null, goal = targetView ? targetView.position() : destination;
                if (target && !targetView || goal && goal.minus(observed.position()).length() > order.range) view.reject("out-of-range");
            }
            view.intent(order.id, target, destination); return true;
        }
    }
    export interface CompanionOptions {
        id: string; legacyIds?: string[]; orders: Orders; defaultIntent: string; decisionTicks: number; manualGrace: number;
        settings: { lookRange: number; chaseRange: number };
        command?(operation: string, view: CombatTactics): boolean;
    }
    export class Companions {
        private installed = false;
        constructor(private adapter: Adapter, private pool: WorldMethods.Pool, private options: CompanionOptions) { }
        private save(view: CombatTactics): void {
            var existing = JSON.parse(String(view.preferences())), anchor = view.intentPoint();
            existing[this.options.id] = { intent: String(view.intent()), point: anchor ? WorldBehaviorHost.coordinates(anchor) : null };
            view.preferences(JSON.stringify(existing));
        }
        update(view: CombatTactics): void {
            var access = view.world(), actor = view.actor(), options = this.options;
            var operation = options.orders.canonical(String(view.operation()));
            // Commands run when they arrive; the decision loop itself runs on its own rhythm.
            if (operation === "tick" && access.tick() % options.decisionTicks !== 0) return;
            var pokemon = CobblemonCombat.pokemon(actor);
            var memory = JSON.parse(String(view.memory())), observed = access.observe(actor)!;
            if (!memory[options.id]) {
                var persisted = JSON.parse(String(view.preferences()));
                var saved = persisted[options.id];
                if (!saved) (options.legacyIds || []).some(function (id) { saved = persisted[id]; return !!saved; });
                saved = saved || {};
                var order = options.orders.get(saved.intent || "");
                var intent = order && order.persistent ? order.id : options.defaultIntent;
                var savedPoint = Array.isArray(saved.point) && saved.point.length === 3 ? WorldBehaviorHost.point(saved.point) : null;
                if (order && order.target === "point" && (!savedPoint || savedPoint.minus(observed.position()).length() > (order.range || 32))) { intent = options.defaultIntent; savedPoint = null; }
                view.settings(options.id, options.settings.lookRange, options.settings.chaseRange); view.intent(intent, null, savedPoint); memory[options.id] = true;
            }
            if (operation.indexOf("native_capture_") === 0) {
                var capture = JSON.parse(String(view.notice())).pokemon;
                if (operation === "native_capture_started") view.capture(capture);
                else if (operation === "native_capture_complete" && String(view.captureHold()) === capture) view.capture("");
            } else if (operation !== "tick") {
                if (!options.orders.execute(operation, view) && (!options.command || !options.command(operation, view))) view.reject("unsupported-command");
                this.save(view); delete memory.navigation;
            }
            var currentIntent = String(view.intent()), current = options.orders.get(currentIntent), owner = view.owner();
            var protectedActor = current && current.defendTarget ? view.intentTarget() || owner : null;
            var focused = current && current.attackTarget ? view.intentTarget() : null;
            var anchorView = access.observe(protectedActor || owner), anchor = view.intentPoint() || (anchorView ? anchorView.position() : observed.position());
            var input = this.adapter.frame(access, pokemon, currentIntent, anchor, owner, protectedActor, focused, view.chaseRange(), String(view.captureHold()),
                function (slot, target, position, direction, json) { return Number(view.submitInput(slot, target, position, direction, json)); },
                function (stage, reason) { view.report(stage, reason); });
            var state = this.pool.get(input, memory);
            if (operation !== "tick") { state.agent.stop("command-changed", input); delete state.agent.memory.navigation; }
            access.controlled(true); input.facts.managed = true;
            if (state.manual !== view.lastManual()) { state.agent.stop("manual-input", input); state.manual = view.lastManual(); }
            if (!view.pending() && access.tick() - view.lastManual() >= options.manualGrace && access.tick() % options.decisionTicks === 0) state.agent.tick(input);
            var events = state.agent.memory.events || {};
            Object.keys(events).forEach(function (key) { if (input.tick - events[key] > 1200) delete events[key]; });
            view.memory(JSON.stringify(state.agent.memory));
        }
        install(): void {
            if (this.installed) return; this.installed = true;
            var controller = this; CobblemonCombat.tactics(function (view) { controller.update(view); });
        }
    }
}
