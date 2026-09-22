/** Native skill catalogue services; each instance supplies its own content, configuration and presentation. */
namespace NativeRepertoire {
    NativeLoadout.installActions({ input: LivingActions.input, host: LivingActions.host, lifecycle: LivingActions.lifecycle });
    declare const JsonIO: {
        read(path: string): any;
    };
    export interface Field {
        path: string[];
        label: any;
        group?: string;
        groupLabel?: any;
        kind: string;
        min?: number;
        max?: number;
        step?: number;
        options?: {
            /** Stored value is compared strictly; numeric choices can feed Formula.F.pref while label supplies the player text. */
            value: any;
            label: any;
        }[];
        display?: {
            scale?: number;
            suffix?: string;
        };
        help?: any;
        validate?: (value: any) => boolean;
    }
    export interface Skill {
        id: string;
        name: string;
        nameKey?: string;
        description: string;
        uses: string[];
        kind: "enemy" | "friend" | "aim" | "point" | "motion" | "self";
        /** Design range in blocks. `resolve` may return a different `range` per cast (configuration, level); it drives the real acceptance up to `maxRange`. */
        range: number;
        /** Upper bound registered with the host when `resolve` can raise the range above `range` (default: `range`). */
        maxRange?: number;
        /**
         * Optional rhythm for the shared LivingActions.run choreography (ticks, default 0). A skill without
         * `prepare` commits the moment it starts; `active` only documents the expected execution span.
         * Skills with their own rhythm (charge, channel, multi-stage) set `run` and manage commit/finish themselves.
         */
        prepare?: number;
        active?: number;
        recover?: number;
        cooldown?: number;
        style: string;
        defaults: any;
        fields: Field[];
        resolve?: (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null,
            attributes?: IndividualAttributes.Context) => { prepare: number; recover: number; cooldown: number; active?: number; range?: number; };
        /** Body of the shared choreography: runs after commit; call `done` when the effect has played out. Required unless `run` is set. */
        execute?: (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) => void;
        ready?: (action: CombatAction, config: any) => string;
        /** Telegraph the preparation and return its duration in ticks; `prepare` is the value `resolve` produced for this cast, return it to keep it. */
        windup?: (action: CombatAction, config: any, prepare: number) => number;
        freeMovement?: boolean;
        flags?: NativeLoadout.Policy["flags"];
        eligibility?: NativeLoadout.Policy["eligibility"];
        interruptible?: LivingActions.Lifecycle["interruptible"];
        version?: number;
        maximumTicks?: number;
        composition?: CombatActionComposition;
        /** Pure cost from the same effective preferences in availability, payment and detail views. */
        ppCost?: (pokemon: CombatPokemon, move: CombatPokemonMove, config?: any, world?: CombatWorld | null, actor?: CombatActor | null) => number;
        stationary?: boolean;
        turn?: number;
        normalize?: (value: any) => any;
        /**
         * Self-managed rhythm: the skill drives the whole action (sense/present before `action.commit`, world
         * effects after, `action.finish`/`cancel` when done). The shared prepare/recover/cooldown choreography,
         * `windup`, `ready` and `execute` are not used; `cooldown` passed to `commit` is the skill's own.
         * An inline caller may explicitly supply the owning action's cooldown.
         */
        run?: (action: CombatAction, move: CombatPokemonMove, config: any) => void;
        inspect?: (pokemon: CombatPokemon, detail: any, context: Inspection) => any;
        menu?: (context: MenuContext, slot: number) => CompanionMenus.Contribution;
        indicator?: (config: any, pokemon?: CombatPokemon) => {
            radius: number;
            geometry?: string;
            style?: string;
            color?: number;
            label?: string;
        };
    }
    export interface MenuContext {
        pokemon: CombatPokemon;
        skills: any[];
    }
    export interface Inspection {
        full: boolean;
        world?: CombatWorld | null;
        actor?: CombatActor | null;
        attributes: IndividualAttributes.Context;
        /** Read another skill's state in this catalogue for conditional descriptions. */
        state(id: string): any;
    }
    export interface Options {
        namespace: string;
        legacyNamespaces?: string[];
        channel?: string;
        configRoot?: string;
        stage?: (action: CombatAction, skill: Skill, phase: string, elapsed: number, duration: number) => void;
        request?: (request: CombatContentRequest, input: any) => boolean;
    }
    export function create(options: Options) {
        var skills: {
            [id: string]: Skill;
        } = Object.create(null);
        var preferences = new SkillPreferences.Registry();
        var menus = new CompanionMenus.Registry<MenuContext>();
        var commands = new CompanionMenus.Commands<CombatTactics>();
        var globalValues: {
            [id: string]: string | null;
        } = Object.create(null);
        function prefKey(move: string): string { return options.namespace + ":preferences/" + move; }
        function stateKey(move: string): string { return options.namespace + ":state/" + move; }
        function stored(read: (key: string) => string | null, kind: string, id: string): { key: string; value: string | null } {
            var key = options.namespace + ":" + kind + "/" + id, value = read(key);
            if (value != null) return { key: key, value: String(value) };
            for (var legacy of options.legacyNamespaces || []) {
                var previous = legacy + ":" + kind + "/" + id, old = read(previous);
                if (old != null) return { key: previous, value: String(old) };
            }
            return { key: key, value: null };
        }
        function field(path: string[], label: string, kind: string, extra?: any): Field {
            var result: any = { path: path, label: label, kind: kind };
            if (extra)
                Object.keys(extra).forEach(function (key) { result[key] = extra[key]; });
            return result;
        }
        function normalize(skill: Skill, input: any): any {
            if (!input || typeof input !== "object" || Array.isArray(input))
                throw new Error("invalid-preference");
            if (skill.normalize)
                return skill.normalize(input);
            skill.fields.forEach(function (field) {
                var value = input;
                field.path.forEach(function (part) { value = value && value[part]; });
                if (field.validate && !field.validate(value))
                    throw new Error("invalid-preference");
                if (["boolean", "number", "choice"].indexOf(field.kind) < 0 && !field.validate)
                    throw new Error("Field requires a validator: " + field.kind);
                if (field.kind === "boolean" && typeof value !== "boolean" || field.kind === "number" && (typeof value !== "number" || !isFinite(value) || value < field.min! || value > field.max!) ||
                    field.kind === "choice" && !field.options!.some(function (option) { return option.value === value; }))
                    throw new Error("invalid-preference");
            });
            return JSON.parse(JSON.stringify(input));
        }
        function storage(world: CombatWorld, actor: CombatActor): SkillPreferences.Storage {
            return {
                read: function (id: string, individual: string | null): string | null {
                    return individual === null ? globalValues[id] || null : stored(key => CobblemonCombat.data(world, actor, key), "preferences", id).value;
                },
                write: function (id: string, individual: string | null, value: string | null): void {
                    if (individual === null)
                        throw new Error("Global preferences are edited in this skill's configuration file");
                    var previous = stored(key => CobblemonCombat.data(world, actor, key), "preferences", id);
                    if (!CobblemonCombat.compareData(world, actor, prefKey(id), CobblemonCombat.data(world, actor, prefKey(id)), value)) throw new Error("settings-changed");
                    if (previous.key !== prefKey(id) && !CobblemonCombat.compareData(world, actor, previous.key, previous.value, null)) throw new Error("settings-changed");
                }
            };
        }
        /** Effective values per individual and skill, reused while the stored patch is unchanged; a decision reads one data key instead of merging layers. */
        var configCache: { [key: string]: { raw: string | null; json: string } } = Object.create(null), configCached = 0;
        function config(world: CombatWorld, actor: CombatActor, id: string): any {
            var individual = String(CobblemonCombat.pokemon(actor).id()), skillId = String(id);
            var raw = stored(key => CobblemonCombat.data(world, actor, key), "preferences", skillId).value;
            var cacheKey = individual + "|" + skillId, hit = configCache[cacheKey];
            if (!hit || hit.raw !== raw) {
                if (configCached >= 8192) { configCache = Object.create(null); configCached = 0; }
                hit = configCache[cacheKey] = { raw: raw, json: JSON.stringify(preferences.resolve(skillId, individual, storage(world, actor))) }; configCached++;
            }
            return JSON.parse(hit.json);
        }
        function state(world: CombatWorld, actor: CombatActor, id: string): any {
            var raw = stored(key => CobblemonCombat.data(world, actor, key), "state", id).value;
            return raw ? JSON.parse(raw) : {};
        }
        /** Persist a JSON object; numeric leaves are read with Formula.F.state(owner, label, path). Successful writes are immediately visible to state(). */
        function setState(world: CombatWorld, actor: CombatActor, id: string, value: any): void {
            var raw = stored(key => CobblemonCombat.data(world, actor, key), "state", id).value;
            if (!CobblemonCombat.compareData(world, actor, stateKey(id), CobblemonCombat.data(world, actor, stateKey(id)), JSON.stringify(value)))
                throw new Error("state-changed");
        }
        function define(skill: Skill): void {
            if (skills[skill.id])
                throw new Error("Duplicate skill: " + options.namespace + ":" + skill.id);
            if (!skill.run && !skill.execute)
                throw new Error("Skill needs execute (shared rhythm) or run (own rhythm): " + skill.id);
            // Rhythm numbers are optional: an unset prepare commits at start; unset recover/cooldown are 0.
            ["prepare", "active", "recover", "cooldown"].forEach(function (key) {
                var value = (<any>skill)[key];
                if (value === undefined || value === null) (<any>skill)[key] = 0;
                else if (!isFinite(value) || value < 0 || value % 1) throw new Error("Invalid " + key + " for skill " + skill.id);
            });
            skills[skill.id] = skill;
            preferences.define(skill.id, { version: skill.version || 1, defaults: skill.defaults, normalize: function (value: any) { return normalize(skill, value); } });
            if (typeof JsonIO !== "undefined") {
                var file = JsonIO.read((options.configRoot || "kubejs/config/worldcombat/skills/") + skill.id + ".json");
                if (file !== null)
                    globalValues[skill.id] = JSON.stringify(file);
            }
                        // A cast's real range comes from `resolve` (configuration, level), bounded by the registered maximum.
            function resolved(action: CombatAction): any {
                if (!skill.resolve) return skill;
                return skill.resolve(CobblemonCombat.pokemon(action.actor()), config(action.sense(), action.actor(), skill.id), action.sense(), action.actor());
            }
            var maximum = skill.maxRange === undefined ? skill.range : Math.max(skill.range, skill.maxRange);
            var claims = skill.composition && skill.composition.claims || [];
            var movement = !skill.composition || skill.composition.mode === "exclusive" || claims.indexOf("movement") >= 0;
            var aiming = movement || claims.indexOf("aim") >= 0;
            NativeLoadout.define(skill.id, options.namespace + ":" + skill.id, String(skill.version || 1), skill.maximumTicks || 600, skill.kind,
                { max: maximum, current: function (action) { var runtime = resolved(action); return runtime.range === undefined ? skill.range : Math.min(maximum, runtime.range); } }, function (action, move) {
                var settings = config(action.sense(), action.actor(), skill.id);
                if (skill.run) {
                    skill.run(action, move, settings);
                    return;
                }
                var runtime = resolved(action);
                var invocation = NativeLoadout.invocation(action);
                var prepare = skill.windup ? skill.windup(action, settings, runtime.prepare || 0) : runtime.prepare;
                LivingActions.run(action, {
                    prepare: isFinite(prepare) ? prepare : runtime.prepare, recover: invocation && invocation.recover !== undefined ? invocation.recover : runtime.recover,
                    cooldown: runtime.cooldown,
                    stationary: skill.stationary === undefined ? movement : skill.stationary,
                    turn: skill.turn === undefined ? aiming ? 15 : 0 : skill.turn,
                    interruptible: skill.interruptible,
                    ready: function (current) { return skill.ready ? skill.ready(current, settings) : ""; },
                    stage: function (current, phase, elapsed, duration) {
                        if (options.stage)
                            options.stage(current, skill, phase, elapsed, duration);
                    }
                }, function (current, done) { skill.execute!(current, move, settings, done); });
            }, function(pokemon, move, world) {
                return skill.ppCost ? skill.ppCost(pokemon, move, world ? config(world, world.source(), skill.id) : skill.defaults,
                    world || null, world ? world.source() : null) : NativeLoadout.defaultCost(pokemon, move);
            }, skill.composition);
            NativeLoadout.configure(skill.id, { flags: skill.flags, eligibility: skill.eligibility, interruptible: skill.interruptible });
            NativeLoadout.rangeWhen(skill.id,function(world,pokemon) {
                var runtime=skill.resolve?skill.resolve(pokemon,config(world,world.source(),skill.id),world,world.source()):skill;
                return Math.min(maximum,runtime.range===undefined?skill.range:runtime.range);
            });
            if (skill.freeMovement)
                NativeLoadout.availableWhen(skill.id, function (world, pokemon) {
                    return pokemon.vehicle() || pokemon.passenger() ? "mounted-control" : "";
                });
        }
        function installChannel(): void {
            CobblemonCombat.channel(options.channel || options.namespace + ":skills", function (request) {
                var pokemon = request.pokemon(), input = JSON.parse(String(request.input()));
                if (input.op === "attributes") {
                    request.reply(JSON.stringify({ attributes: IndividualAttributes.describe(IndividualAttributes.request(request)),
                        nature: { key: "cobblemon.nature." + String(pokemon.nature()).replace(/^cobblemon:/, "") } }));
                    return;
                }
                // Native request JSON can omit absent values; normalize once before crossing the CAS boundary.
                var expected = input.expected == null ? null : String(input.expected);
                var store: SkillPreferences.Storage = {
                    read: function (id, individual) { var value = individual === null ? globalValues[id] || null : stored(key => request.data(key), "preferences", id).value; return value == null ? null : String(value); },
                    write: function (id, individual, value) {
                        if (individual === null)
                            throw new Error("invalid-scope");
                        var previous = stored(key => request.data(key), "preferences", id);
                        if (previous.value !== expected) throw new Error("settings-changed");
                        if (previous.key !== prefKey(id) && !request.compareData(previous.key, expected, null)) throw new Error("settings-changed");
                        if (!request.compareData(prefKey(id), previous.key === prefKey(id) ? expected : null, value))
                            throw new Error("settings-changed");
                    }
                };
                if (input.op === "configure" || input.op === "reset") {
                    if (!skills[input.move] || !pokemon.canAccessMove(input.move)) {
                        request.reply('{"error":"move-unavailable"}');
                        return;
                    }
                    var current = stored(key => request.data(key), "preferences", input.move).value;
                    if ((current == null ? null : String(current)) !== expected) {
                        request.reply('{"error":"settings-changed"}');
                        return;
                    }
                    if (input.op === "configure")
                        preferences.update(input.move, String(pokemon.id()), input.patch, store);
                    else if (input.path === undefined)
                        preferences.clear(input.move, String(pokemon.id()), store);
                    else
                        preferences.clear(input.move, String(pokemon.id()), input.path, store);
                }
                else if (input.op !== "inspect") {
                    if (options.request && options.request(request, input))
                        return;
                    request.reply('{"error":"invalid-operation"}');
                    return;
                }
                var focus = typeof input.move === "string" ? input.move : "";
                if (!focus) for (var focusSlot = 0; focusSlot < pokemon.moveSlots(); focusSlot++) {
                    var focusMove = pokemon.move(focusSlot);
                    if (focusMove && skills[String(focusMove.id())]) { focus = String(focusMove.id()); break; }
                }
                function describe(skill: Skill, slot: number, move: CombatPokemonMove | null): any {
                    var prepared = stored(key => request.data(key), "state", skill.id).value;
                    var values = preferences.resolve(skill.id, String(pokemon.id()), store);
                    var attributes = IndividualAttributes.request(request);
                    var runtime = skill.resolve ? skill.resolve(pokemon, values, attributes.world, attributes.actor, attributes) : <any>skill;
                    var detail = { slot: slot, id: skill.id, name: skill.name, nameKey: skill.nameKey || "cobblemon.move." + skill.id, description: skill.description, uses: skill.uses,
                        timing: { prepare: runtime.prepare, active: runtime.active === undefined ? skill.active : runtime.active, recover: runtime.recover }, cooldown: runtime.cooldown,
                        range: runtime.range === undefined ? skill.range : runtime.range, kind: skill.kind, detailsComplete: skill.id === focus,
                        ppCost: skill.ppCost ? skill.ppCost(pokemon, move || CobblemonCombat.moveTemplate(skill.id), values, attributes.world, attributes.actor)
                            : NativeLoadout.defaultCost(pokemon, move || CobblemonCombat.moveTemplate(skill.id)),
                        pp: move ? move.pp() : null, maxPp: move ? move.maxPp() : CobblemonCombat.moveTemplate(skill.id).maxPp(), fields: skill.id === focus ? skill.fields : [],
                        values: values, overrides: preferences.overrides(skill.id, String(pokemon.id()), store), indicator: skill.indicator ? skill.indicator(values, pokemon) : null,
                        revision: store.read(skill.id, String(pokemon.id())), state: prepared ? JSON.parse(String(prepared)) : {},
                        unavailableReason: skill.freeMovement && (pokemon.vehicle() || pokemon.passenger()) ? "mounted-control" : "" };
                    return skill.inspect ? skill.inspect(pokemon, detail, { full: skill.id === focus, attributes: attributes,
                        world: skill.id === focus && request.world ? request.world() : null, actor: skill.id === focus && request.actor ? request.actor() : null, state: function (id) {
                        var data = stored(key => request.data(key), "state", id).value; return data ? JSON.parse(String(data)) : {};
                    } }) : detail;
                }
                var result: any[] = [], requested: any = null, equippedRequest = false;
                for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
                    var move = pokemon.move(slot), skill = move && skills[String(move.id())];
                    if (!move || !skill)
                        continue;
                    var detail = describe(skill, slot, move);
                    result.push(detail);
                    if (input.move === skill.id) equippedRequest = true;
                }
                if (!equippedRequest && typeof input.move === "string" && skills[input.move] && pokemon.canAccessMove(input.move))
                    requested = describe(skills[input.move], -1, null);
                var dependencies: string[] = [];
                result.concat(requested ? [requested] : []).forEach(detail => (detail.dependencies || []).forEach((id: string) => { if (dependencies.indexOf(id) < 0) dependencies.push(id); }));
                request.reply(JSON.stringify({ pokemon: { id: String(pokemon.id()), species: String(pokemon.species()), level: pokemon.level() },
                    skills: result, requested: requested, dependencies, menu: menus.resolve({ pokemon: pokemon, skills: result }), supportedMoves: Object.keys(skills) }));
            });
        }
        return { skills: skills, preferences: preferences, menus: menus, commands: commands, prefKey: prefKey, stateKey: stateKey, field: field, storage: storage, config: config, state: state, setState: setState, define: define, installChannel: installChannel };
    }
}
