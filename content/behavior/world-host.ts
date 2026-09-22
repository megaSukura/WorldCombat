/** Minecraft world observations and operations, separate from task selection and content policy. */
namespace WorldBehaviorHost {
    export function coordinates(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }
    export function point(value: number[]): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }
    /** `facts` is what the subject's domain publishes (survey records carry it); a lone observation passes none. */
    export type EnrichObservation = (access: CombatWorld, actor: CombatActor | null, value: WorldMethods.Subject, facts: any) => void;
    export interface EntityType { id: string; tags: string[]; }
    export function entityType(context: WorldBehavior.Context, subject: WorldMethods.Subject): EntityType | null {
        var facts = subject.facts;
        if (facts && typeof facts.entityType === "string" && Array.isArray(facts.entityTags)) return { id: facts.entityType, tags: facts.entityTags };
        return WorldMethods.fact<EntityType>(context, "world:entity-type", subject);
    }
    export function velocity(context: WorldBehavior.Context, subject: WorldMethods.Subject): number[] | null {
        return subject.velocity || WorldMethods.fact<number[]>(context, "world:velocity", subject);
    }
    export type ActorFactProvider = (access: CombatWorld, actor: CombatActor, key: string) => any;
    var actorProviders: { id: string; read: ActorFactProvider }[] = [];
    /** Domain adapters supply facts; undefined lets the next provider or generic observation answer. */
    export function defineActorFacts(id: string, read: ActorFactProvider): void {
        if (actorProviders.some(function (entry) { return entry.id === id; })) throw new Error("Duplicate actor facts: " + id);
        actorProviders.push({ id: id, read: read });
    }
    function supplied(access: CombatWorld, actor: CombatActor, key: string): any {
        for (var i = 0; i < actorProviders.length; i++) { var value = actorProviders[i].read(access, actor, key); if (value !== undefined) return value; }
        return undefined;
    }
    export function statStages(access: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        var external = supplied(access, actor, "stages");
        return external === undefined ? CombatStages.effective(access, actor) : external;
    }
    /** Effective attack/defence/speed for one subject; a value the domain does not publish stays null. */
    export function combatStats(access: CombatWorld, actor: CombatActor): any {
        var external = supplied(access, actor, "stats"); if (external !== undefined) return external;
        var attack = access.attributeValue(actor, "minecraft:generic.attack_damage");
        return { level: null, types: [], healthScale: 1, stats: { atk: attack ? attack.value() : null,
            def: null, spa: attack ? attack.base() * CombatStages.multiplier(CombatStages.stage(access, actor, "spa")) : null,
            spd: null, spe: effectiveSpeed(access, actor) } };
    }
    /** Effective movement speed: a Pokemon's staged native Speed, another body's observed movement speed. */
    export function effectiveSpeed(access: CombatWorld, actor: CombatActor): number | null {
        var external = supplied(access, actor, "speed"); if (external !== undefined) return external;
        var view = access.observe(actor); return view ? view.movementSpeed() : null;
    }
    /** A Pokemon's native weight; other bodies have no native mass and return null. */
    export function mass(access: CombatWorld, actor: CombatActor): number | null {
        var external = supplied(access, actor, "mass"); return external === undefined ? null : external;
    }
    /** Bound identity shared by rooted effects and the partiallytrapped/trapped/leechseed statuses. */
    export function bound(access: CombatWorld, actor: CombatActor): boolean {
        if (access.effects(actor, "world_combat:rooted").length > 0) return true;
        return CombatStatus.has(access, actor, "partiallytrapped") || CombatStatus.has(access, actor, "trapped") || CombatStatus.has(access, actor, "leechseed");
    }
    /** Names of the shared world_combat:status/<name> identities currently on the subject. */
    export function statusNames(access: CombatWorld, actor: CombatActor): string[] {
        var names: string[] = [], seen: { [name: string]: boolean } = {}, prefix = "world_combat:status/";
        access.mobEffects(actor).forEach(function (effect) {
            String(effect.tags()).split(" ").forEach(function (tag) {
                if (tag.indexOf(prefix) !== 0) return;
                var name = tag.substring(prefix.length);
                if (!seen[name]) { seen[name] = true; names.push(name); }
            });
        });
        return names;
    }
    export interface Query {
        intent: string; anchor: CombatPoint; owner: CombatActor | null; focused: CombatActor | null; range: number;
        focusActive: boolean;
    }
    export class Adapter {
        private probes: { [id: string]: (access: CombatWorld, actor: CombatActor, argument: any) => any } = Object.create(null);
        constructor(private enrichObservation?: EnrichObservation, private enrich?: (frame: WorldBehavior.Frame) => void) {
            this.probe("world:marker", function (access, actor, id) { return access.mobEffect(actor, id) !== null; });
            this.probe("world:effect", function (access, actor, id) { return access.effects(actor, id).length > 0; });
            this.probe("world:guard", function (access, actor, id) { return GuardEffects.has(access, actor, id); });
            // Shared status identity (tag world_combat:status/<name>), whichever unit produced the effect.
            this.probe("world:status", function (access, actor, name) { return CombatStatus.has(access, actor, String(name)); });
            this.probe("world:domain", function (_access, actor) { return String(actor.domain()); });
            this.probe("world:velocity", function (access, actor) {
                var view = access.observe(actor); return view && typeof view.velocity === "function" ? coordinates(view.velocity()) : null;
            });
            this.probe("world:entity-type", function (access, actor) {
                var type = access.entityType(actor); return type ? { id: String(type.id()), tags: JSON.parse(String(type.tags())) } : null;
            });
            this.probe("world:stages", function (access, actor, argument) {
                var stages = statStages(access, actor);
                return argument === null || argument === undefined ? stages : (stages[String(argument)] || 0);
            });
            this.probe("world:stats", function (access, actor) { return combatStats(access, actor); });
            this.probe("world:speed", function (access, actor) { return effectiveSpeed(access, actor); });
            this.probe("world:mass", function (access, actor) { return mass(access, actor); });
            this.probe("world:bound", function (access, actor) { return bound(access, actor); });
            this.probe("world:statuses", function (access, actor) { return statusNames(access, actor); });
            this.probe("world:environment", function (access, actor) {
                var view = access.observe(actor); return view ? WorldEnvironment.read(access, view.position()) : null;
            });
        }
        probe(id: string, read: (access: CombatWorld, actor: CombatActor, argument: any) => any): void {
            if (!id || this.probes[id]) throw new Error("Duplicate or unnamed world observation probe"); this.probes[id] = read;
        }
        snapshot(view: CombatObservation, access: CombatWorld): WorldMethods.Subject {
            var actor = view.actor(), opponent = view.visible() && !view.friendly();
            var hidden = access.effects(actor, "world_combat:hidden").length > 0, revealed = !opponent || access.mobEffect(actor, "minecraft:glowing") !== null;
            var value: WorldMethods.Subject = { ref: String(actor.ref()), point: coordinates(view.position()), health: view.health(), maximum: view.maxHealth(),
                friendly: view.friendly(), hostile: view.hostile(), player: view.player(), speed: view.movementSpeed(), visible: view.visible() && !(hidden && !revealed),
                domain: String(actor.domain()), grounded: view.grounded(), wet: view.wet(), width: view.width(), height: view.height(), tags: String(view.tags()),
                sleeping: false, rooted: opponent && access.effects(actor, "world_combat:rooted").length > 0,
                hidden: hidden, revealed: opponent && access.mobEffect(actor, "minecraft:glowing") !== null,
                attacking: view.attacking() ? String(view.attacking()!.ref()) : "", lastAttacker: view.lastAttacker() ? String(view.lastAttacker()!.ref()) : "", hurtAgo: view.hurtAgo() };
            if (typeof view.velocity === "function") value.velocity = coordinates(view.velocity());
            if (this.enrichObservation) this.enrichObservation(access, actor, value, null); return value;
        }
        /** The same subject shape from one surveyed record; the host observed the whole neighbourhood in a single call. */
        private subject(record: any, access: CombatWorld): WorldMethods.Subject {
            var opponent = record.visible && !record.friendly;
            var hidden = record.effects.indexOf("world_combat:hidden") >= 0, revealed = opponent && record.mobEffects.indexOf("minecraft:glowing") >= 0;
            var value: WorldMethods.Subject = { ref: String(record.ref), point: record.point, health: record.health, maximum: record.maximum,
                friendly: record.friendly, hostile: record.hostile, player: record.player, speed: record.speed, visible: record.visible && !(hidden && !revealed),
                grounded: record.grounded, wet: record.wet, width: record.width, height: record.height, tags: record.tags, facts: record.facts,
                sleeping: false, rooted: opponent && record.effects.indexOf("world_combat:rooted") >= 0,
                hidden: hidden, revealed: revealed,
                owned: !!(record.facts && record.facts.wild === false),
                attacking: record.attacking, lastAttacker: record.lastAttacker, hurtAgo: record.hurtAgo };
            if (typeof record.domain === "string") value.domain = record.domain;
            if (Array.isArray(record.velocity)) value.velocity = record.velocity.slice();
            if (this.enrichObservation) this.enrichObservation(access, null, value, record.facts);
            return value;
        }
        capture(access: CombatWorld, query: Query): WorldBehavior.Frame {
            var adapter = this, actor = access.source(), observed = access.observe(actor)!, self = String(actor.ref());
            var own = query.owner ? access.observe(query.owner) : null, nearby: WorldMethods.Subject[] = [];
            var records: any[] = JSON.parse(access.survey(observed.position(), Math.min(32, query.range + 12), true, 49, "world_combat:rooted,world_combat:hidden", "minecraft:glowing"));
            for (var i = 0; i < records.length && nearby.length < 48; i++) {
                if (records[i].ref === self) continue;
                nearby.push(adapter.subject(records[i], access));
            }
            if (own && !nearby.some(function (other) { return other.ref === String(own!.actor().ref()); })) nearby.push(this.snapshot(own, access));
            var focused = query.focused, focusedView = focused ? access.observe(focused) : null, issue = "";
            if (query.focusActive) {
                if (!focused || !access.valid(focused)) issue = "target-left";
                else if (!focusedView || focusedView.position().minus(observed.position()).length() > 64) issue = "out-of-range";
                else if (focusedView.health() <= 0) issue = "target-left";
                else if (focusedView.friendly()) issue = "invalid-target";
                else if (!focusedView.visible()) issue = "target-not-visible";
                else if (!nearby.some(function (other) { return other.ref === String(focused!.ref()); })) nearby.push(this.snapshot(focusedView, access));
            }
            var result: WorldBehavior.Frame = { actor: String(actor.ref()), tick: access.tick(), capabilities: [], traits: {}, policies: [],
                facts: { self: this.snapshot(observed, access), nearby: nearby, owner: own ? this.snapshot(own, access) : null,
                    intent: query.intent, anchor: coordinates(query.anchor), focus: focused ? String(focused.ref()) : "", focusIssue: issue,
                    range: query.range, busy: access.busy(), movementBusy: access.claimed("movement") || access.claimed("aim"), grounded: observed.grounded() }, services: { world: access } };
            result.services.fact = function (probe: string, ref: string, argument: any) {
                var read = adapter.probes[probe]; if (!read) throw new Error("Unknown world observation probe: " + probe);
                var subject = access.actor(ref); return subject ? read(access, subject, argument) : null;
            };
            result.services.actionInstances = function () {
                var instances: number[] = []; access.actions().forEach(state => instances.push(state.instance())); return instances;
            };
            if (this.enrich) this.enrich(result); return result;
        }
        operations(access: CombatWorld, use: (capability: WorldBehavior.Capability, target: WorldMethods.Subject) => WorldMethods.Submission): WorldMethods.Host {
            return { move: function (destination, within, memory) { return WorldAI.navigate(access, point(destination), within, memory); },
                stop: function () { access.stopMovement(); }, face: function (target, yaw, pitch) { access.face(point(target), yaw, pitch); },
                use: use, random: function () { return access.random(); } };
        }
    }
}
