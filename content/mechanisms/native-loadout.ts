namespace NativeLoadout {
    export type CostReader = (pokemon: CombatPokemon, move: CombatPokemonMove, world?: CombatWorld) => number;
    export interface Policy {
        flags?: { [name: string]: boolean };
        /** Pure policy shared by loadout queries, submission and outgoing hit gates. */
        eligibility?: (context: CombatStatus.ActionPolicy) => void;
        interruptible?: boolean | ((action: CombatAction) => boolean);
    }
    interface Binding {
        action: string;
        cost: CostReader;
        recipe?: (action: CombatAction, move: CombatPokemonMove) => void;
        kind?: string; range?: number; currentRange?: (action: CombatAction) => number;
        loadoutRange?: (world:CombatWorld,pokemon:CombatPokemon)=>number;
        availability?: (world: CombatWorld, pokemon: CombatPokemon, move: CombatPokemonMove) => string;
        policy?: Policy;
    }
    export interface Invocation {
        source: string; slot: number; key: string; design: string; selection: string; executing: string; chain: string[];
        policyMove?: string; input?: Input; recover?: number; maximumRange?: number;
    }
    export interface Input {
        target: string | null; point: number[]; direction: number[]; range: number; cooldown?: number; released?: boolean; metadata?: any;
        live?: boolean; kind?: ReturnType<CombatAction["targetKind"]>;
    }
    export interface ActionRuntime {
        input(action: CombatAction, input: Input): CombatAction;
        host(action: CombatAction): CombatAction;
        lifecycle(action: CombatAction, policy: Policy): void;
    }
    var runtime: ActionRuntime | null = null;
    /** The catalogue composes its lifecycle/input library here; the native package can also run independently. */
    export function installActions(value: ActionRuntime): void { runtime = value; }
    export interface CallOptions {
        input?: { target?: CombatActor | null; point?: CombatPoint; direction?: CombatPoint };
        /** The paying source action remains the cooldown owner. Overrides also reach self-managed commit calls. */
        cooldown?: number;
        /** Shared choreography recovery override. Self-managed rhythms own their completion. */
        recover?: number;
        eligibility?: "caller" | "callee";
    }
    export interface ForkOptions {
        lifetime: "linked" | "independent";
        input?: { target?: CombatActor | null; point?: CombatPoint; direction?: CombatPoint; control?: string };
        /** Extra server-authored arguments. Native payment/selection keys are supplied by the selected slot. */
        arguments?: { [key: string]: string | number | boolean };
    }
    /** Independent invocation of the effective move in sourceSlot. That slot pays its own PP; its action owns cooldown,
     * configuration and eligibility. Callee input is validated afresh; the parent may already be executing/recovering. */
    export function fork(action: CombatAction, sourceSlot: number, options: ForkOptions): CombatActionStart {
        function refused(reason: string): CombatActionStart { return { instance: () => 0, reason: () => reason, accepted: () => false }; }
        var world = action.sense(), pokemon = CobblemonCombat.pokemon(action.actor());
        if (!isFinite(sourceSlot) || sourceSlot % 1 || sourceSlot < 0 || sourceSlot >= pokemon.moveSlots()) return refused("loadout-changed");
        var move = pokemon.move(sourceSlot); if (!move) return refused("empty-slot");
        var choice = selection(world, sourceSlot, move), binding = bindings[choice.id];
        if (!binding || !binding.recipe) return refused("move-unimplemented");
        var input = options.input || {}, target = binding.kind === "self" ? action.actor() : input.target === undefined ? action.target() : input.target;
        if (binding.kind === "point" || binding.kind === "motion") target = null;
        var observed = target && world.observe(target);
        if (target && !observed) return refused("target-left");
        var at = binding.kind === "self" ? observed!.position() : input.point || (observed ? observed.position() : action.targetPosition());
        var direction = input.direction || at.minus(action.origin()); if (direction.length() < .001) direction = action.direction();
        var args: { [key: string]: string | number | boolean } = {};
        Object.keys(options.arguments || {}).forEach(function (key) {
            if (key.indexOf("native-") === 0 || key === "world_combat:input") throw new Error("Reserved invocation argument");
            args[key] = options.arguments![key];
        });
        args["native-slot"] = String(sourceSlot); args["native-move"] = String(move.key());
        args["native-design"] = choice.id; args["native-selection"] = choice.key;
        if (input.control !== undefined) args["world_combat:input"] = input.control;
        return action.child(binding.action, target, at, direction, JSON.stringify(args), options.lifetime);
    }
    export interface Metadata { move: CombatPokemonMove; flags: { [name: string]: boolean }; data: any; }
    export var metadata = new WorldContributions.Registry<Metadata>();
    var bindings: { [move: string]: Binding } = Object.create(null);
    export function configure(move: string, policy: Policy): void {
        if (!bindings[move]) throw new Error("Define a native binding before its policy");
        bindings[move].policy = policy;
    }
    export function facts(move: CombatPokemonMove): Metadata {
        var nativeFlags = typeof move.flags === "function" ? JSON.parse(String(move.flags())) : {}, flags: { [name: string]: boolean } = {};
        Object.keys(nativeFlags).forEach(function (key) { flags[key] = !!nativeFlags[key]; });
        var nativeData = typeof move.metadata === "function" ? JSON.parse(String(move.metadata())) : {};
        var result = metadata.apply({ move: move, flags: flags, data: nativeData }), policy = bindings[String(move.id())];
        Object.keys(policy && policy.policy && policy.policy.flags || {}).forEach(function (key) { result.flags[key] = policy.policy!.flags![key]; });
        return result;
    }
    export function invocation(action: CombatAction): Invocation | null {
        var raw = action.data("cobblemon_world_combat:invocation"); return raw === null ? null : JSON.parse(raw);
    }
    export function view(action: CombatAction): CombatAction {
        var state = invocation(action); return state && state.input && runtime ? runtime.input(action, state.input) : action;
    }
    function policyMove(action: CombatAction, move: CombatPokemonMove): CombatPokemonMove {
        var state = invocation(action); return state && state.policyMove ? CobblemonCombat.moveTemplate(state.policyMove) : move;
    }
    export function restriction(action: CombatAction, move: CombatPokemonMove): string {
        return NativeModifiers.restriction(action.sense(), action.actor(), move, action, policyMove(action, move));
    }
    /** Use for action-authored world.hurt payloads; action-view hit/projectile callbacks already carry this context. */
    export function hitMetadata(action: CombatAction, data: any): any {
        var state = invocation(action);
        if (state) data.eligibilityMove = state.policyMove || state.executing;
        return data;
    }
    CombatStatus.actions.define({ id: "cobblemon_world_combat:skill-policy", after: ["cobblemon_world_combat:action-policy"], apply: function (context) {
        var move = context.move;
        if (!move && context.action) {
            var state = invocation(context.action);
            if (state) move = CobblemonCombat.moveTemplate(state.policyMove || state.executing);
            else if (String(context.actor.domain()) === "cobblemon") move = executing(context.action);
        }
        var damageMove = context.metadata.eligibilityMove || context.metadata.move;
        if (!move && damageMove && bindings[String(damageMove)] && typeof CobblemonCombat !== "undefined") move = CobblemonCombat.moveTemplate(String(damageMove));
        if (!move) return;
        context.move = move;
        var info = facts(move), supplied = !context.metadata.move || String(context.metadata.move) === String(move.id()) ? context.metadata.flags || {} : {};
        Object.keys(supplied).forEach(function (key) { info.flags[key] = supplied[key]; });
        context.metadata.flags = info.flags;
        var binding = bindings[String(move.id())];
        if (binding && binding.policy && binding.policy.eligibility) binding.policy.eligibility(context);
    } });
    export function map(move: string, action: string, cost: CostReader): void {
        if (bindings[move]) throw new Error("Duplicate native move binding: " + move);
        bindings[move] = { action: action, cost: cost };
    }
    export function availableWhen(move: string, check: (world: CombatWorld, pokemon: CombatPokemon, move: CombatPokemonMove) => string): void {
        if (!bindings[move]) throw new Error("Define a native binding before its availability rule");
        bindings[move].availability = check;
    }
    export function rangeWhen(move:string,read:(world:CombatWorld,pokemon:CombatPokemon)=>number):void {
        if(!bindings[move])throw new Error("Define a native binding before its range reader");
        bindings[move].loadoutRange=read;
    }
    export function define(move: string, action: string, version: string, ticks: number,
                           kind: "enemy" | "friend" | "aim" | "point" | "motion" | "self", range: number | { max: number; current: (action: CombatAction) => number },
                           recipe: (action: CombatAction, move: CombatPokemonMove) => void,
                           cost: CostReader = defaultCost,
                           composition?: CombatActionComposition): void {
        // `range` is the host-registered maximum; a per-cast `current` (configuration, level) narrows acceptance below it.
        var maximum = typeof range === "number" ? range : range.max;
        map(move, action, cost); bindings[move].recipe = recipe; bindings[move].kind = kind; bindings[move].range = maximum;
        if (typeof range !== "number") bindings[move].currentRange = range.current;
        CobblemonCombat.registerAction(action, version, ticks, kind, maximum, function (context) {
            var design = prepare(context, move);
            if (runtime) runtime.lifecycle(context, bindings[move].policy || {});
            recipe(context, design);
        });
        if (composition) WorldCombat.composition(action, JSON.stringify(composition));
    }
    export function defaultCost(_pokemon: CombatPokemon, _move: CombatPokemonMove): number { return 1; }
    function selected(layers: NativeModifiers.Layers, slot: number, move: CombatPokemonMove): { id: string; key: string } {
        var id = layers.moves![String(slot)];
        return { id: id || String(move.id()), key: id ? layers.moveKeys![String(slot)] : "native" };
    }
    /** Read this actor's effective slot identity; the equipped move remains the resource owner. */
    export function selection(world: CombatWorld, slot: number, move: CombatPokemonMove, actor: CombatActor = world.source()): { id: string; key: string } {
        return selected(NativeModifiers.read(world, actor), slot, move);
    }
    /** Current effective loadout, including temporary copies/replacements; independent of PP, cooldown and action restrictions. */
    export function hasEquipped(world: CombatWorld, actor: CombatActor, id: string): boolean {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return false;
        var pokemon = CobblemonCombat.pokemon(actor), layers = NativeModifiers.read(world, actor);
        for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
            var move = pokemon.move(slot);
            if (move !== null && selected(layers, slot, move).id === id) return true;
        }
        return false;
    }
    export function slot(view: CombatLoadout): void {
        var pokemon = view.pokemon();
        var move = pokemon.move(view.slot());
        if (move === null) { view.unavailable("empty-slot"); return; }
        var world = view.world(), choice = selection(world, view.slot(), move), design = choice.id === String(move.id()) ? move : CobblemonCombat.moveTemplate(choice.id);
        var binding = bindings[choice.id];
        view.bind(binding ? binding.action : "", String(move.key()) + "/" + choice.key + "/" + choice.id, "cobblemon.move." + choice.id);
        view.resource(move.pp(), move.maxPp());
        if(binding&&binding.loadoutRange)view.range(binding.loadoutRange(world,pokemon));
        view.argument("native-slot", String(view.slot()));
        view.argument("native-move", String(move.key()));
        view.argument("native-design", choice.id); view.argument("native-selection", choice.key);
        if (!binding) view.unavailable("move-unimplemented");
        else if (move.pp() < binding.cost(pokemon, design, world)) view.unavailable("no-pp");
        else { var reason = NativeModifiers.restriction(world, world.source(), design) || (binding.availability ? binding.availability(world, pokemon, design) : ""); if (reason) view.unavailable(reason); }
    }
    export function prepare(action: CombatAction, nativeId: string): CombatPokemonMove {
        var slotValue = action.argument("native-slot");
        var slot = slotValue === null ? -1 : Number(slotValue);
        var pokemon = CobblemonCombat.pokemon(action.actor());
        if (slot < 0 || slot >= pokemon.moveSlots() || slot !== Math.floor(slot)) action.reject("loadout-changed");
        var move = pokemon.move(slot);
        if (move === null || String(move.key()) !== String(action.argument("native-move"))) {
            action.reject("loadout-changed");
            throw new Error("Rejected native move");
        }
        var choice = selection(action.sense(), slot, move);
        if (choice.id !== nativeId || action.argument("native-selection") !== null && choice.key !== String(action.argument("native-selection"))) action.reject("loadout-changed");
        var design = choice.id === String(move.id()) ? move : CobblemonCombat.moveTemplate(choice.id);
        var reason = NativeModifiers.restriction(action.sense(), action.actor(), design); if (reason) action.reject(reason);
        var binding = bindings[nativeId];
        if (binding.availability) { var unavailable = binding.availability(action.sense(), pokemon, design); if (unavailable) action.reject(unavailable); }
        var cost = bindings[nativeId].cost(pokemon, design, action.sense());
        if (!isFinite(cost) || cost < 0 || cost % 1 !== 0) throw new Error("PP cost must be a nonnegative integer: " + nativeId);
        if (move.pp() < cost) action.reject("no-pp");
        if (cost > 0) action.cost(CobblemonCombat.ppCost(runtime ? runtime.host(action) : action, slot, String(move.key()), cost));
        action.data("cobblemon_world_combat:invocation", JSON.stringify({ source: String(move.id()), slot: slot, key: String(move.key()), design: nativeId,
            selection: choice.key, executing: nativeId, chain: [nativeId], maximumRange: action.range() }));
        return design;
    }
    export function executing(action: CombatAction): CombatPokemonMove | null {
        var data = action.data("cobblemon_world_combat:invocation");
        if (data !== null) return CobblemonCombat.moveTemplate(JSON.parse(data).executing);
        var slot = action.argument("native-slot"); return slot === null ? null : CobblemonCombat.pokemon(action.actor()).move(Number(slot));
    }
    function inputReason(action: CombatAction, binding: Binding): string {
        if (!binding.recipe) return "move-unimplemented";
        var world = action.sense(), target = action.target(), kind = binding.kind;
        if (target !== null && !world.valid(target)) return "target-left";
        if (kind === "self") return "";
        var reach = binding.currentRange ? Math.min(binding.range!, binding.currentRange(action)) : binding.range!;
        if (action.targetPosition().minus(action.origin()).length() > Math.min(action.range(), reach)) return "out-of-range";
        if ((kind === "enemy" || kind === "friend") && target === null || (kind === "point" || kind === "motion") && target !== null ||
            target !== null && (kind === "friend") !== world.friendly(target)) return "invalid-target";
        return "";
    }
    function coordinates(value: CombatPoint): number[] { return [value.x(), value.y(), value.z()]; }
    /** Map a chosen recipient into a borrowed move's declared input shape. Candidate selection stays with the caller. */
    export function inputFor(action: CombatAction, id: string, recipient: CombatActor | null, point?: CombatPoint): CallOptions["input"] | null {
        var binding = bindings[id]; if (!binding || !binding.kind) return null;
        var kind = binding.kind, target = kind === "self" ? action.actor() : recipient;
        var body = target && action.sense().observe(target);
        if ((kind === "self" || kind === "enemy" || kind === "friend") && !body) return null;
        var at = point || (body ? body.position() : action.targetPosition());
        if (kind === "self") at = body!.position();
        var direction = at.minus(action.origin()); if (direction.length() < .001) direction = action.direction();
        return { target: kind === "enemy" || kind === "friend" || kind === "self" ? target : null, point: at, direction: direction };
    }
    function mapped(action: CombatAction, binding: Binding, options: CallOptions): Input {
        var input = options.input || {}, kind = binding.kind;
        var target = kind === "self" ? action.actor() : input.target === undefined ? action.target() : input.target;
        var at = input.point || (target ? action.sense().observe(target)!.position() : action.targetPosition());
        if (kind === "point" || kind === "motion") target = null;
        if (kind === "self") at = action.sense().observe(action.actor())!.position();
        var direction = input.direction || at.minus(action.origin());
        if (direction.length() < .001) direction = action.direction();
        var state = invocation(action);
        return { target: target === null ? null : String(target.ref()), point: coordinates(at), kind: <Input["kind"]>binding.kind,
            direction: coordinates(direction.unit()), range: Math.min(state && state.maximumRange !== undefined ? state.maximumRange : action.range(), binding.range!),
            cooldown: options.cooldown === undefined && state && state.input ? state.input.cooldown : options.cooldown };
    }
    function candidate(action: CombatAction, id: string, options: CallOptions): { reason: string; input?: Input; policyMove?: string } {
        var state = invocation(action), binding = bindings[id];
        if (!state || !binding || !binding.recipe) return { reason: "move-unimplemented" };
        if (state.chain.length >= 4 || state.chain.indexOf(id) >= 0) return { reason: "call-limit" };
        if (options.input && options.input.target && !action.sense().valid(options.input.target)) return { reason: "target-left" };
        if (options.cooldown !== undefined && (!isFinite(options.cooldown) || options.cooldown < 1 || options.cooldown > 12000 || options.cooldown % 1)) throw new Error("Invalid inline cooldown");
        if (options.recover !== undefined && (!isFinite(options.recover) || options.recover < 0 || options.recover % 1)) throw new Error("Invalid inline recovery");
        if (!runtime && (options.input || options.cooldown !== undefined)) return { reason: "invalid-input" };
        var selection = runtime ? mapped(action, binding, options) : undefined;
        var current = runtime && selection ? runtime.input(action, selection) : action, move = CobblemonCombat.moveTemplate(id);
        var eligibility = options.eligibility === "caller" ? state.policyMove || state.executing : id;
        if (selection) selection.metadata = { eligibilityMove: eligibility };
        var reason = inputReason(current, binding) || NativeModifiers.restriction(action.sense(), action.actor(), move, current, CobblemonCombat.moveTemplate(eligibility)) ||
            (binding.availability ? binding.availability(action.sense(), CobblemonCombat.pokemon(action.actor()), move) : "");
        return { reason: reason, input: selection, policyMove: eligibility };
    }
    /** Inline invocation keeps the original PP transaction, cooldown identity and cleanup, with explicit callee input. */
    export function call(action: CombatAction, id: string, options: CallOptions = {}): void {
        var data = action.data("cobblemon_world_combat:invocation"), binding = bindings[id];
        if (!data || !binding || !binding.recipe) { action.reject("move-unimplemented"); return; }
        var state: Invocation = JSON.parse(data);
        if (state.chain.length >= 4 || state.chain.indexOf(id) >= 0) { action.reject("call-limit"); return; }
        var choice = candidate(action, id, options);
        if (choice.reason) { action.reject(choice.reason); return; }
        if (choice.input && runtime) {
            var input = choice.input;
            runtime.host(action).retarget(input.kind!, input.target === null ? null : action.sense().actor(input.target),
                WorldCombat.point(input.point[0], input.point[1], input.point[2]), WorldCombat.point(input.direction[0], input.direction[1], input.direction[2]), input.range);
            input.live = true;
        }
        state.executing = id; state.chain.push(id); state.input = choice.input; state.policyMove = choice.policyMove;
        if (options.recover !== undefined) state.recover = options.recover;
        action.data("cobblemon_world_combat:invocation", JSON.stringify(state));
        var current = view(action);
        if (runtime) runtime.lifecycle(current, binding.policy || {});
        binding.recipe(current, CobblemonCombat.moveTemplate(id));
    }
    export interface Selection { id: string; options: CallOptions; }
    /** Retains the chosen candidate's input so selection and invocation use the same mapping. */
    export function select(action: CombatAction, candidates: string[], input: CallOptions | ((id: string) => CallOptions | null) = {}): Selection | null {
        var world = action.sense(), options: Selection[] = [];
        candidates.forEach(function (id) {
            var settings = typeof input === "function" ? input(id) : input;
            if (settings !== null && !candidate(action, id, settings).reason) options.push({ id: id, options: settings });
        });
        return options.length ? options[Math.floor(world.random() * options.length)] : null;
    }
    export function choose(action: CombatAction, candidates: string[], input: CallOptions | ((id: string) => CallOptions | null) = {}): string | null {
        var selection = select(action, candidates, input); return selection ? selection.id : null;
    }
    function before(event: CombatWorldEvent): void {
        var action = event.action(); if (action === null || String(event.actor().domain()) !== "cobblemon") return;
        var data = action.data("cobblemon_world_combat:invocation"); if (!data) return;
        var state: Invocation = JSON.parse(data), pokemon = CobblemonCombat.pokemon(event.actor()), move = pokemon.move(state.slot);
        if (move === null || String(move.key()) !== state.key) { event.reject("loadout-changed"); return; }
        var choice = selection(event.world(), state.slot, move);
        if (choice.id !== state.design || choice.key !== state.selection) { event.reject("loadout-changed"); return; }
        var binding = bindings[state.executing];
        if (binding && binding.availability) { var unavailable = binding.availability(event.world(), pokemon, CobblemonCombat.moveTemplate(state.executing)); if (unavailable) { event.reject(unavailable); return; } }
        if (binding && binding.recipe) {
            var input = inputReason(view(action), binding); if (input) { event.reject(input); return; }
        }
        var reason = restriction(action, CobblemonCombat.moveTemplate(state.executing)) || restriction(action, CobblemonCombat.moveTemplate(state.design));
        if (reason) event.reject(reason);
    }
    if (typeof CobblemonCombat !== "undefined") WorldCombat.on("cobblemon_world_combat:loadout_commit", "world_combat:before_commit", "cobblemon_world_combat:before", before);
}
if (typeof CobblemonCombat !== "undefined") CobblemonCombat.loadout(NativeLoadout.slot);
