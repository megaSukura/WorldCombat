/** Composable example mechanisms: areas, transferable effects, decoys and reactive defence. */
namespace WorldEffects {
    export interface Flight {
        origin: CombatPoint; velocity: CombatPoint; gravity?: number; radius: number; range: number; lifetime: number;
        hit: string; complete: string; input?: any; appearance?: LivingActions.ProjectileAppearance;
    }
    /** Uses named handlers on this effect/brain; every handler receives a fresh effect.world() scope. */
    export function projectile(effect: CombatEffect, flight: Flight): string {
        return effect.world().projectile(flight.origin, flight.velocity, flight.gravity || 0, flight.radius, flight.range, flight.lifetime,
            flight.hit, flight.complete, JSON.stringify(flight.input || {}), JSON.stringify(flight.appearance || {}));
    }
    export function redirectConnected(world: CombatWorld, protectedActor: CombatActor, recipient: CombatActor, range: number): boolean {
        var protectedBody = world.observe(protectedActor), body = world.observe(recipient);
        return !!protectedBody && !!body && world.friendly(recipient) && recipient.key() !== protectedActor.key()
            && body.position().minus(protectedBody.position()).length() <= range && world.clear(protectedBody.position(), body.position());
    }
    /** Scan cadence and legacy authoring defaults. maxActors is available to designs, not a scan truncation. */
    export const fieldLimits = { maxActors: 16, sourceRange: 48, scanInterval: 5 };
    /**
     * Extensible field vocabulary. Producers own their rule id and may declare a semantic identity plus
     * tags; consumers read identity or category instead of naming each producer (terrain, weather,
     * entry hazards, screens). Categories are declarations, never inferred from names.
     */
    export function category(name: string): string { return "world_combat:category/" + name; }
    export function identity(kind: string, name: string): string { return "world_combat:" + kind + "/" + name; }
    export function terrain(name: string): string { return identity("terrain", name); }
    export function hazard(name: string): string { return identity("hazard", name); }
    export function screen(name: string): string { return identity("screen", name); }
    export var categories = { terrain: category("terrain"), weather: category("weather"), hazard: category("hazard"), screen: category("screen"), haze: category("haze") };
    export interface FieldRuleOptions { identity?: string; tags?: string[]; lineOfSight?: boolean;
        /** Opt in only when all ownership lives in field/source, leave releases members, and data is portable unchanged. */
        transferable?: boolean;
    }
    export interface Field {
        identity?: string; rule: string; position: number[]; radius: number; data: any; members: string[];
        /** Declared tags and current effect facts, filled for callbacks. Defaults keep pre-tag fields working. */
        tags?: string[]; lineOfSight?: boolean; id?: number; remaining?: number;
        /** Previous membership on the first scan after a source change; producers retain their own hit history. */
        reassignedMembers?: string[];
    }
    export interface Area {
        id: number; source: string; rule: string; identity: string; tags: string[];
        position: number[]; radius: number; pending: boolean; remaining: number; data: any;
    }
    var rules: { [id: string]: Rule } = Object.create(null);
    var definitions: { [id: string]: { identity: string; tags: string[]; lineOfSight: boolean; transferable: boolean } } = Object.create(null);
    function positioned(value: any): boolean {
        return Array.isArray(value) && value.length === 3 && value.every(function (entry: any) { return typeof entry === "number" && isFinite(entry); });
    }
    function horizontal(position: number[], point: CombatPoint): number {
        var dx = position[0] - point.x(), dz = position[2] - point.z(); return Math.sqrt(dx * dx + dz * dz);
    }
    function readArea(id: number, source: string, state: any, pending: boolean, remaining: number): Area | null {
        if (!state || typeof state.rule !== "string" || !positioned(state.position) || !isFinite(state.radius)) return null;
        var definition = definitions[state.rule], tags = Array.isArray(state.tags) ? state.tags.slice() : definition ? definition.tags.slice() : [];
        // A detached field keeps the caster as its attributable owner even while a self-owned body carries it.
        var owner = typeof state.owner === "string" && state.owner.length > 0 ? state.owner : source;
        return { id: id, source: owner, rule: state.rule,
            identity: typeof state.identity === "string" ? state.identity : definition ? definition.identity : state.rule,
            tags: tags, position: state.position, radius: Number(state.radius), pending: pending, remaining: remaining, data: state.data || {} };
    }
    /**
     * Every live field and reservation in the current dimension, ordered by nothing and bounded by the host,
     * read straight from `world.effectsOfType` so callers see real positions without a nearby-carrier search.
     * Ended or dispelled work is gone. Older hosts without the dimension-wide query fall back to nearby carriers.
     */
    function live(world: CombatWorld): Area[] {
        var result: Area[] = [], ofType = (world as any).effectsOfType;
        if (typeof ofType === "function") {
            ["world_combat:field", "world_combat:area_reservation"].forEach(function (kind) {
                var views: CombatEffectView[] = ofType.call(world, kind) || [];
                for (var i = 0; i < views.length; i++) {
                    var view = views[i], state: any;
                    try { state = JSON.parse(String(view.data())); } catch (error) { continue; }
                    var area = readArea(view.id(), String(view.source().ref()), state, kind === "world_combat:area_reservation", view.remaining());
                    if (area) result.push(area);
                }
            });
            return result;
        }
        var body = world.observe(world.source());
        if (!body) return result;
        var actors = [world.source()].concat(Array.prototype.slice.call(world.query(body.position(), 32, false))), seen: string[] = [];
        actors.forEach(function (actor: CombatActor) {
            var ref = String(actor.ref()); if (seen.indexOf(ref) >= 0) return; seen.push(ref);
            ["world_combat:field", "world_combat:area_reservation"].forEach(function (kind) {
                world.effects(actor, kind).forEach(function (effect) {
                    var state: any;
                    try { state = JSON.parse(String(effect.data())); } catch (error) { return; }
                    var remaining = typeof (effect as any).remaining === "function" ? effect.remaining() : 0;
                    var area = readArea(effect.id(), String(effect.source().ref()), state, kind === "world_combat:area_reservation", remaining);
                    if (area) result.push(area);
                });
            });
        });
        return result;
    }
    /** Live field work matching a producer rule id or a shared semantic identity; an omitted rule keeps everything. */
    export function areas(world: CombatWorld, rule?: string, centre?: CombatPoint, radius?: number): Area[] {
        var all = live(world), result: Area[] = [];
        for (var i = 0; i < all.length; i++) {
            var area = all[i];
            if (rule && area.rule !== rule && area.identity !== rule) continue;
            if (centre && radius !== undefined && horizontal(area.position, centre) > radius + area.radius) continue;
            result.push(area);
        }
        return result;
    }
    /** `areas` centred on an arbitrary point; the caller decides how far it reaches. */
    export function areasAround(world: CombatWorld, centre: CombatPoint, radius: number, rule?: string): Area[] {
        return areas(world, rule, centre, radius);
    }
    /** Live, non-reservation fields carrying an exact declared tag, optionally covering a point within `radius`. */
    export function areasWithTag(world: CombatWorld, tag: string, centre?: CombatPoint, radius?: number): Area[] {
        var all = live(world), result: Area[] = [];
        for (var i = 0; i < all.length; i++) {
            var area = all[i];
            if (area.pending || area.tags.indexOf(tag) < 0) continue;
            if (centre && radius !== undefined && horizontal(area.position, centre) > radius + area.radius) continue;
            result.push(area);
        }
        return result;
    }
    /** Entry-hazard fields declared by their producers, in the current dimension. */
    export function hazards(world: CombatWorld, centre?: CombatPoint, radius?: number): Area[] {
        return areasWithTag(world, categories.hazard, centre, radius);
    }
    /** Dispels every non-reservation field carrying one declared tag; returns how many ended. */
    export function clearTagged(world: CombatWorld, tag: string, centre?: CombatPoint, radius?: number): number {
        var found = areasWithTag(world, tag, centre, radius), cleared = 0;
        for (var i = 0; i < found.length; i++) if (world.operation(found[i].id, "world_combat:dispel", "{}")) cleared++;
        return cleared;
    }
    /** Short, invisible coordination while an autonomous action is preparing. */
    export function reserveArea(world: CombatWorld, rule: string, point: CombatPoint, radius: number, data: any, ticks: number): number {
        return world.effect("world_combat:area_reservation", world.source(), JSON.stringify({ rule: rule,
            position: WorldAI.coordinates(point), radius: radius, data: data }), ticks);
    }
    /**
     * Member callbacks run for bodies whose centre the host query returns and, by default, whose position is
     * in sight of the field centre; members are who the field position reaches, so the caller's chosen point
     * decides who gets marked. `scan` runs every `fieldLimits.scanInterval` ticks (5) and any write it makes to
     * `field.data` is saved and persists across scans. `field.id`/`field.remaining` are the owning effect's
     * read-only facts for the current scan.
     */
    export interface Rule { canTransfer?: (field: Field) => boolean; enter?: (world: CombatWorld, actor: CombatActor, field: Field) => void; stay?: (world: CombatWorld, actor: CombatActor, field: Field) => void; leave?: (world: CombatWorld, actor: CombatActor, field: Field) => void; scan?: (effect: CombatEffect, world: CombatWorld, field: Field) => void; }
    /**
     * A producer owns its callback id; identity and tags let independent producers share consumers.
     * `lineOfSight` defaults true: members need an unobstructed line from the field centre. Set it false
     * for shapes that should not be filtered by sight. A plain string third argument keeps the old identity form.
     */
    export function fieldRule(id: string, rule: Rule, identityOrOptions?: string | FieldRuleOptions): void {
        if (!id) throw new Error("Field rule requires an id");
        if (rules[id]) throw new Error("Duplicate field rule: " + id);
        var options: FieldRuleOptions = typeof identityOrOptions === "string" ? { identity: identityOrOptions } : (identityOrOptions || {});
        rules[id] = rule;
        definitions[id] = { identity: options.identity || id, tags: options.tags ? options.tags.slice() : [], lineOfSight: options.lineOfSight !== false, transferable: options.transferable === true };
    }
    export function hasFieldRule(id: string): boolean { return !!rules[id]; }
    export function fieldIdentity(id: string): string | null { return definitions[id] ? definitions[id].identity : null; }
    export function fieldTags(id: string): string[] { return definitions[id] ? definitions[id].tags.slice() : []; }
    export function fieldTransferable(id: string): boolean { return !!definitions[id] && definitions[id].transferable; }
    export function areaTransferable(area: Area): boolean {
        return fieldTransferable(area.rule) && (!rules[area.rule].canTransfer || rules[area.rule].canTransfer!({
            rule: area.rule, position: area.position, radius: area.radius, data: area.data, members: [], id: area.id, remaining: area.remaining
        }));
    }
    /** Explicit producer support; the operation keeps geometry, resource data and remaining clock. */
    export function reassign(world: CombatWorld, id: number, holder: CombatActor): boolean {
        try { return world.operation(id, "world_combat:reassign", JSON.stringify({ holder: String(holder.ref()) })); }
        catch (error) { return false; }
    }

    /** Explicit named additions preserve one owner for the field's base rule. */
    export interface FieldContext { phase: "enter" | "stay" | "leave" | "scan"; world: CombatWorld; field: Field; actor: CombatActor | null; }
    function available(world: CombatWorld, actor: CombatActor | null): boolean {
        return world.observe(world.source()) !== null && (actor === null || world.observe(actor) !== null);
    }
    /** Each contribution receives a currently observable source and, for member phases, recipient. */
    class FieldContributions extends WorldContributions.Registry<FieldContext> {
        private guarded(rule: WorldContributions.Rule<FieldContext>): WorldContributions.Rule<FieldContext> {
            return { id: rule.id, before: rule.before, after: rule.after,
                applies: function (context) { return available(context.world, context.actor) && (!rule.applies || rule.applies(context)); },
                apply: function (context) { if (available(context.world, context.actor)) rule.apply(context); } };
        }
        define(rule: WorldContributions.Rule<FieldContext>): void { super.define(this.guarded(rule)); }
        replace(rule: WorldContributions.Rule<FieldContext>): void { super.replace(this.guarded(rule)); }
    }
    export var fieldRules: WorldContributions.Registry<FieldContext> = new FieldContributions();
    function visit(phase: "enter" | "stay" | "leave", world: CombatWorld, actor: CombatActor, field: Field): void {
        if (!available(world, actor)) return;
        var callback = rules[field.rule][phase]; if (callback) callback(world, actor, field);
        fieldRules.apply({ phase: phase, world: world, actor: actor, field: field });
    }
    function object(json: string): string { return JSON.stringify(JSON.parse(json)); }
    function owned(effect: CombatEffect): void { if (effect.caller().key() !== effect.source().key()) effect.reject("effect-not-owned"); }
    function createField(world: CombatWorld, rule: string, point: CombatPoint, radius: number, data: any, ticks: number, owner?: string): number {
        var definition = definitions[rule];
        var state: any = { rule: rule, identity: definition.identity,
            tags: definition.tags, lineOfSight: definition.lineOfSight, position: WorldAI.coordinates(point),
            radius: radius, data: data, members: [] };
        if (owner) state.owner = owner;
        return world.effect("world_combat:field", world.source(), JSON.stringify(state), ticks);
    }
    export function field(world: CombatWorld, rule: string, point: CombatPoint, radius: number, data: any, ticks: number): number {
        if (!hasFieldRule(rule)) throw new Error("Unknown field rule: " + rule);
        return createField(world, rule, point, radius, data, ticks);
    }
    /**
     * Optional durable field carrier for ground scenarios that must outlive their caster. A self-owned body
     * (no collision, no gravity, invulnerable, invisible) is summoned at `centre`; its brain hosts the same
     * `field` rule and ends the field when the body's lifetime runs out. Only content that explicitly wants
     * the field to detach from the caster should choose this; the ordinary `field` keeps its caster lifetime.
     * Returns the carrier brain's id. Native creation refusal is returned as an error, so the caller can choose its response.
     */
    export const detachedFieldBrain = "world_combat:field/detached";
    export function detachedField(world: CombatWorld, rule: string, centre: CombatPoint, radius: number, data: any, ticks: number): number {
        if (!hasFieldRule(rule)) throw new Error("Unknown field rule: " + rule);
        var lifetime = Math.max(1, Math.min(1200, Math.round(ticks)));
        var state = { rule: rule, centre: WorldAI.coordinates(centre), radius: radius,
            owner: String(world.source().ref()), data: data, field: 0 };
        var carrier = WorldBodies.spawn(world, centre, { size: [0.1, 0.1], health: 8, gravity: false,
                pushable: false, targetable: false, noPhysics: true, invulnerable: true, silent: true, knockbackResistance: 1 },
                detachedFieldBrain, state, lifetime);
        var facts = WorldBodies.info(world, carrier);
        if (facts === null) throw new Error("Detached field carrier unavailable");
        return Number(facts.brain) || 0;
    }
    /** Same-rule update by the field's owner: merge data, change radius and/or refresh the remaining ticks. */
    export interface FieldUpdate { data?: any; radius?: number; ticks?: number; }
    export function update(world: CombatWorld, id: number, change: FieldUpdate): boolean {
        return world.operation(id, "world_combat:update", JSON.stringify(change || {}));
    }
    /** One source-owned carrier contribution per field instance; payload aggregation remains a content decision. */
    export interface MembershipOptions { ticks?: number | ((field: Field) => number); amplifier?: number; }
    export function membership(id: string, mark: string, options: MembershipOptions = {}): void {
        if (!id || !mark) throw new Error("Membership requires a field rule id and a mark effect id");
        StatusContributions.define(mark);
        function duration(field: Field): number {
            if (typeof options.ticks === "function") return options.ticks(field);
            if (typeof options.ticks === "number") return options.ticks;
            return Math.max(1, field.remaining || 1);
        }
        fieldRule(id, {
            enter: function (world, actor, field) { StatusContributions.upsert(world, actor, mark, String(field.id), field.data,
                Math.max(1, Math.round(duration(field))), { amplifier: options.amplifier || 0,
                    owner: { id: field.id!, definition: "world_combat:field", target: String(world.source().ref()) } }); },
            stay: function (world, actor, field) { StatusContributions.upsert(world, actor, mark, String(field.id), field.data,
                Math.max(1, Math.round(duration(field))), { amplifier: options.amplifier || 0,
                    owner: { id: field.id!, definition: "world_combat:field", target: String(world.source().ref()) } }); },
            leave: function (world, actor, field) { StatusContributions.remove(world, actor, mark, String(field.id)); }
        });
    }
    export function apply(world: CombatWorld, target: CombatActor, kind: string, data: any, ticks: number): number {
        var existing = world.effects(target, "world_combat:" + kind);
        for (var i = 0; i < existing.length; i++) if (existing[i].source().key() === world.source().key() &&
            world.operation(existing[i].id(), "world_combat:refresh", JSON.stringify({ ticks: ticks }))) return existing[i].id();
        return world.effect("world_combat:" + kind, target, JSON.stringify(data), ticks);
    }
    function portable(id: string): void {
        WorldCombat.effectHandler(id, "operation:world_combat:refresh", function (effect) { owned(effect); effect.remaining(JSON.parse(effect.input()).ticks); });
        WorldCombat.effectHandler(id, "operation:world_combat:extend", function (effect) {
            owned(effect); var ticks = JSON.parse(effect.input()).ticks;
            if (typeof ticks !== "number" || ticks < 1 || ticks % 1 !== 0) effect.reject("invalid-duration");
            effect.remaining(Math.min(1200, effect.remaining() + ticks));
        });
        WorldCombat.effectHandler(id, "operation:world_combat:dispel", function (effect) { effect.end(); });
        function copy(effect: CombatEffect, transfer: boolean): void {
            owned(effect); var target = effect.world().actor(JSON.parse(effect.input()).target);
            if (target === null || !effect.world().friendly(target)) effect.reject("choose-friend");
            effect.copyTo(target!, target!, effect.state(), effect.remaining());
            if (transfer) effect.end();
        }
        WorldCombat.effectHandler(id, "operation:world_combat:copy", function (effect) { copy(effect, false); });
        WorldCombat.effectHandler(id, "operation:world_combat:transfer", function (effect) { copy(effect, true); });
    }
    /** Creates (or recreates after a reload) the detached field hosted by the carrier body. */
    function detachedCarry(effect: CombatEffect): void {
        var world = effect.world(), state: any = JSON.parse(effect.state());
        state.field = createField(world, String(state.rule), WorldAI.point(state.centre), Number(state.radius),
            state.data, Math.max(1, effect.remaining()), typeof state.owner === "string" ? state.owner : undefined);
        effect.state(JSON.stringify(state));
        effect.schedule("carrier", "carrier", 5, "{}");
    }
    export function install(): void {
        WorldEnvironment.defineWeatherSource("world_combat:fields", function (world, point) {
            return areasWithTag(world, categories.weather, point, point ? 0 : undefined);
        });
        WorldCombat.effect(detachedFieldBrain, 1, 1200, "persistent", object, EffectProtocols.unchanged);
        WorldCombat.effectHandler(detachedFieldBrain, "start", function (effect) { detachedCarry(effect); });
        WorldCombat.effectHandler(detachedFieldBrain, "resume", function (effect) { detachedCarry(effect); });
        WorldCombat.effectHandler(detachedFieldBrain, "carrier", function (effect) {
            var state = JSON.parse(effect.state()), world = effect.world();
            if (!world.effects(effect.target(), "world_combat:field").some(function (view) { return view.id() === state.field; })) { effect.end(); return; }
            effect.schedule("carrier", "carrier", 5, "{}");
        });
        WorldCombat.effectHandler(detachedFieldBrain, "end", function (effect) {
            var state: any = {};
            try { state = JSON.parse(effect.state()); } catch (error) { return; }
            if (typeof state.field === "number" && state.field > 0) effect.world().operation(state.field, "world_combat:dispel", "{}");
        });
        WorldCombat.effect("world_combat:area_reservation", 1, 200, "actor", function (json) {
            var area = JSON.parse(json);
            if (typeof area.rule !== "string" || !Array.isArray(area.position) || area.position.length !== 3 ||
                !area.position.every(function (value: any) { return typeof value === "number" && isFinite(value); }) ||
                !isFinite(area.radius) || area.radius < .5 || area.radius > 16) throw new Error("Invalid area reservation");
            return JSON.stringify(area);
        }, EffectProtocols.unchanged);
        // The native effect clock owns expiry; a reservation intentionally has no visible start action.
        WorldCombat.effectHandler("world_combat:area_reservation", "start", function () { });
        WorldCombat.effectHandler("world_combat:area_reservation", "operation:world_combat:dispel", function (effect) { owned(effect); effect.end(); });
        ["hidden", "wet", "charge", "insulated", "rooted"].forEach(function (kind) {
            var id = "world_combat:" + kind;
            WorldCombat.effect(id, 1, 1200, "actor", object, EffectProtocols.unchanged);
            WorldCombat.effectHandler(id, "start", function (effect) {
                if (kind === "rooted") {
                    var world = effect.world();
                    world.attribute(effect.target(), "minecraft:generic.movement_speed", -1, "add_multiplied_total");
                    world.attribute(effect.target(), "minecraft:generic.flying_speed", -1, "add_multiplied_total");
                    world.stopMovement(effect.target());
                }
            }); portable(id);
        });
        WorldCombat.on("world_combat:roots", "world_combat:navigate", "", function (event) {
            if (event.world().effects(event.actor(), "world_combat:rooted").length) { var data = JSON.parse(event.data()); data.speed = 0; event.data(JSON.stringify(data)); }
        });
        WorldCombat.effect("world_combat:field", 1, 1200, "actor", function (json) {
            var field: Field = JSON.parse(json);
            if (!rules[field.rule] || !Array.isArray(field.position) || field.position.length !== 3 || !Array.isArray(field.members)
                || (field.tags !== undefined && !Array.isArray(field.tags))
                || (field.lineOfSight !== undefined && typeof field.lineOfSight !== "boolean")
                || field.radius < 0.5 || field.radius > 16) throw new Error("Invalid field");
            return JSON.stringify(field);
        }, EffectProtocols.unchanged);
        WorldCombat.effectHandler("world_combat:field", "start", function (effect) { effect.schedule("scan", "scan", 1, "{}"); });
        WorldCombat.effectHandler("world_combat:field", "operation:world_combat:dispel", function (effect) { effect.end(); });
        WorldCombat.effectHandler("world_combat:field", "operation:world_combat:reassign", function (effect) {
            const state: Field & { owner?: string } = JSON.parse(effect.state()), world = effect.world();
            const request = JSON.parse(effect.input()), holder = typeof request.holder === "string" ? world.actor(request.holder) : null;
            if (!fieldTransferable(state.rule) || state.owner || rules[state.rule].canTransfer && !rules[state.rule].canTransfer!(state)) { effect.reject("field-not-transferable"); return; }
            if (!holder || !world.valid(holder) || String(holder.ref()) === String(effect.source().ref())) { effect.reject("invalid-field-holder"); return; }
            const body = world.observe(holder), point = WorldAI.point(state.position);
            if (!body || point.minus(body.position()).length() > fieldLimits.sourceRange || effect.remaining() < 1) { effect.reject("field-holder-too-far"); return; }
            const replacement: Field = JSON.parse(JSON.stringify(state)); replacement.reassignedMembers = (state.reassignedMembers || []).concat(state.members)
                .filter((ref, index, all) => all.indexOf(ref) === index); replacement.members = [];
            delete replacement.id; delete replacement.remaining;
            // Creation is permission-checked and its first scan is scheduled for the next tick. The old end handler
            // still receives every original member, so leave precedes every new-source enter.
            const created = effect.copyTo(holder, holder, JSON.stringify(replacement), effect.remaining());
            if (!(created > 0) || !world.effects(holder, "world_combat:field").some(view => view.id() === created)) {
                effect.reject("field-transfer-refused"); return;
            }
            effect.end();
        });
        // A later callback may merge same-rule state or refresh the field while its members keep their marks.
        WorldCombat.effectHandler("world_combat:field", "operation:world_combat:update", function (effect) {
            var request: FieldUpdate = JSON.parse(effect.input()), state: Field = JSON.parse(effect.state());
            if (request.data !== undefined && request.data !== null && typeof request.data === "object") {
                state.data = state.data || {};
                Object.keys(request.data).forEach(function (key) { state.data[key] = request.data![key]; });
            }
            if (typeof request.radius === "number" && isFinite(request.radius)) state.radius = Math.max(0.5, Math.min(16, request.radius));
            effect.state(JSON.stringify(state));
            if (typeof request.ticks === "number" && isFinite(request.ticks) && request.ticks > 0) effect.remaining(Math.min(1200, Math.round(request.ticks)));
        });
        WorldCombat.effectHandler("world_combat:field", "scan", function (effect) {
            var world = effect.world(), state: Field = JSON.parse(effect.state()), center = WorldAI.point(state.position), rule = rules[state.rule];
            var source = effect.source();
            // Read-only effect facts for every callback; legacy scopes without them keep the last stored values.
            if (typeof effect.id === "function") state.id = effect.id();
            if (typeof effect.remaining === "function") state.remaining = effect.remaining();
            var definition = definitions[state.rule];
            if (definition) {
                if (state.tags === undefined) state.tags = definition.tags.slice();
                if (state.identity === undefined) state.identity = definition.identity;
                if (state.lineOfSight === undefined) state.lineOfSight = definition.lineOfSight;
            }
            var requiresSight = state.lineOfSight !== false;
            function active(): boolean {
                var observation = world.observe(source);
                if (observation === null || center.minus(observation.position()).length() > fieldLimits.sourceRange) { effect.end(); return false; }
                return true;
            }
            if (!active()) return;
            var actors = world.query(center, state.radius, false), members: string[] = [];
            if (!active()) return;
            if (rule.scan) rule.scan(effect, world, state);
            if (!active()) return;
            fieldRules.apply({ phase: "scan", world: world, actor: null, field: state });
            if (!active()) return;
            // Inspect the nearest bodies before each rule applies its own relationship/visibility checks.
            for (var i = 0; i < actors.length; i++) {
                var actor = actors[i], observation = world.observe(actor);
                if (observation === null || (requiresSight && !world.clear(center, observation.position()))) continue;
                var ref = String(actor.ref());
                if (state.members.indexOf(ref) < 0) visit("enter", world, actor, state);
                visit("stay", world, actor, state);
                if (!active()) return;
                if (world.observe(actor) !== null) members.push(ref);
            }
            for (var j = 0; j < state.members.length; j++) {
                var previous = state.members[j], leaving = world.actor(previous);
                if (leaving !== null && members.indexOf(previous) < 0) visit("leave", world, leaving, state);
                if (!active()) return;
            }
            // Later callbacks can remove members that were already visited in this scan.
            state.members = members.filter(function (ref) { var actor = world.actor(ref); return actor !== null && world.observe(actor) !== null; });
            if (!active()) return;
            delete state.reassignedMembers;
            effect.state(JSON.stringify(state)); effect.schedule("scan", "scan", fieldLimits.scanInterval, "{}");
        });
        WorldCombat.effectHandler("world_combat:field", "end", function (effect) {
            var world = effect.world(), state: Field = JSON.parse(effect.state());
            for (var i = 0; i < state.members.length; i++) {
                if (!available(world, null)) return;
                var actor = world.actor(state.members[i]); if (actor !== null) visit("leave", world, actor, state);
            }
        });
        fieldRule("world_combat:mist", { stay: function (world, actor) { apply(world, actor, "hidden", {}, 7); if (available(world, actor)) apply(world, actor, "wet", {}, 40); } }, { tags: [categories.screen] });
        fieldRule("world_combat:snare", { enter: function (world, actor) { if (!world.friendly(actor)) { apply(world, actor, "rooted", {}, 30); if (available(world, actor)) world.deliver(actor, "world_combat:interrupt"); } } });
        fieldRule("world_combat:spring", { stay: function (world, actor, field) {
            if (world.friendly(actor) && world.tick() % 20 < 5) { var observation = world.observe(actor); if (observation !== null && observation.health() < observation.maxHealth()) world.health(actor, 1, "world_combat:spring"); }
        } });
        fieldRule("world_combat:vortex", { stay: function (world, actor, field) {
            if (!world.friendly(actor)) { var observation = world.observe(actor); if (observation === null) return; var delta = WorldAI.point(field.position).minus(observation.position()); if (delta.length() > 0.25) world.displace(actor, delta.unit().scale(0.25)); }
        } });
        WorldCombat.effect("world_combat:decoy", 1, 1200, "actor", object, EffectProtocols.unchanged);
        WorldCombat.effectHandler("world_combat:decoy", "start", function (effect) {
            var world = effect.world(), data = JSON.parse(effect.state()), desired = WorldAI.point(data.point);
            // Reuse the native free-space probe when the host offers it; otherwise keep the requested point.
            var spot = LivingActions.hasFreeSpace(world) ? (LivingActions.freeSpot(world, desired, 0.7, 1.4, 3) || desired) : desired;
            data.ref = world.helper(spot, data.health || 10, JSON.stringify({ purpose: "decoy" }), effect.remaining()).ref();
            effect.state(JSON.stringify(data)); effect.schedule("signal", "signal", 1, "{}");
        });
        WorldCombat.effectHandler("world_combat:decoy", "signal", function (effect) {
            var world = effect.world(), data = JSON.parse(effect.state()), body = world.actor(data.ref);
            if (body === null) { effect.end(); return; }
            world.particle(world.observe(body)!.position());
            world.sound("minecraft:block.note_block.bell", world.observe(body)!.position(), 16, '{"kind":"decoy"}');
            effect.schedule("signal", "signal", 20, "{}");
        });
        WorldCombat.effect("world_combat:redirect", 1, 1200, "actor", function (json) {
            var data = JSON.parse(object(json));
            if (data.linkRange !== undefined && (typeof data.linkRange !== "number" || !isFinite(data.linkRange) || data.linkRange < 0))
                throw new Error("Invalid redirect link range");
            return JSON.stringify(data);
        }, EffectProtocols.unchanged);
        WorldCombat.effectHandler("world_combat:redirect", "operation:world_combat:dispel", function (effect) { effect.end(); });
        WorldCombat.effectHandler("world_combat:redirect", "start", function (effect) { effect.listen("world_combat:incoming", "world_combat:intercept", "intercept"); });
        WorldCombat.effectHandler("world_combat:redirect", "intercept", function (effect) {
            var event = effect.event(); if (event.target().key() !== effect.target().key()) return;
            var data = JSON.parse(event.payload()); if (data.redirected || data.amount <= 0) return;
            var world = effect.world(), state = JSON.parse(effect.state()), recipient = world.actor(state.recipient);
            var range = state.linkRange === undefined ? 8 : state.linkRange;
            if (recipient === null || !redirectConnected(world, effect.target(), recipient, range)) return;
            data.redirected = true;
            // Transfer only to a body in the defending effect's declared ownership. The original attacker remains the damage source.
            var request = JSON.parse(event.payload()); request.redirect = recipient.ref(); request.redirected = true; event.payload(JSON.stringify(request));
        });
        WorldCombat.effect("world_combat:reflect", 1, 1200, "actor", object, EffectProtocols.unchanged);
        WorldCombat.effectHandler("world_combat:reflect", "start", function (effect) { effect.listen("world_combat:incoming", "world_combat:intercept", "intercept"); });
        WorldCombat.effectHandler("world_combat:reflect", "intercept", function (effect) {
            var event = effect.event(), data = JSON.parse(event.payload());
            if (event.target().key() !== effect.target().key() || data.reflected || data.amount <= 0 || event.source().key() === effect.target().key()) return;
            if (effect.world().friendly(event.source())) return;
            effect.world().hurt(event.source(), data.amount * 0.5, '{"reflected":true,"kind":"reflection"}');
            data.amount *= 0.5; data.reflected = true; event.payload(JSON.stringify(data)); effect.end();
        });
    }
}
WorldEffects.install();
