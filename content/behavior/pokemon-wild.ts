/** Native wild ownership, clock and control handover; encounter policy is supplied by a composition. */
namespace PokemonBehaviorHost {
    export interface Resident {
        pokemon: string; ref: string; seen: number; decided: number; resting: number;
        position: number[]; anchor: number[]; managed: boolean; memory: WorldBehavior.Bag;
        stage: string; reason: string; data: WorldBehavior.Bag;
    }
    export interface WildBrain {
        supports(pokemon: CombatPokemon, world: CombatWorld): boolean;
        frame: Adapter["frame"];
        run(frame: WorldBehavior.Frame, memory: WorldBehavior.Bag): WorldBehavior.Report;
        stop(frame: WorldBehavior.Frame, reason: string): void;
        forget(ref: string): void;
        enrich?(frame: WorldBehavior.Frame, resident: Resident): void;
        used?(move: string, frame: WorldBehavior.Frame, resident: Resident): void;
    }
    export class Wild {
        private residents: { [ref: string]: Resident } = Object.create(null);
        private individuals: { [pokemon: string]: string } = Object.create(null);
        private lastPrune = -1;
        private installed = false;
        constructor(private id: string, private brain: WildBrain, private range: number = 16) { }
        private forget(ref: string): void {
            var previous = this.residents[ref];
            if (previous && this.individuals[previous.pokemon] === ref) delete this.individuals[previous.pokemon];
            delete this.residents[ref]; this.brain.forget(ref);
        }
        private prune(now: number): void {
            if (this.lastPrune >= 0 && now >= this.lastPrune && now - this.lastPrune < 200) return;
            this.lastPrune = now; var controller = this;
            Object.keys(this.residents).forEach(function (ref) {
                if (controller.residents[ref].seen > now || now - controller.residents[ref].seen > 200) controller.forget(ref);
            });
        }
        private resident(access: CombatWorld, actor: CombatActor, pokemon: CombatPokemon): Resident {
            var id = String(pokemon.id()), ref = String(actor.ref()), now = access.tick(), current = this.residents[ref], previous = this.individuals[id];
            if (previous && previous !== ref) this.forget(previous);
            if (!current || current.seen > now) {
                if (current) this.forget(ref);
                var origin = WorldBehaviorHost.coordinates(access.observe(actor)!.position());
                current = this.residents[ref] = { pokemon: id, ref: ref, seen: now, decided: now - 4, resting: now,
                    position: origin, anchor: origin.slice(), managed: false, memory: {}, stage: "idle", reason: "", data: {} };
            }
            this.individuals[id] = ref; current.seen = now; return current;
        }
        bound(event: CombatWorldEvent): void {
            var actor = event.actor(); if (String(actor.domain()) !== "cobblemon") return;
            var pokemon = CobblemonCombat.pokemon(actor), previous = this.individuals[String(pokemon.id())];
            if (previous && previous !== String(actor.ref())) this.forget(previous);
            if (pokemon.wild() && pokemon.aiEnabled() && this.brain.supports(pokemon, event.world())) { this.resident(event.world(), actor, pokemon); this.clock(event.world(), actor); }
        }
        /** The Pokemon's own facts moved (ownership, moves, ...): join or leave the wild roster accordingly. */
        changed(event: CombatWorldEvent): void {
            var actor = event.actor(); if (String(actor.domain()) !== "cobblemon") return;
            var access = event.world(), pokemon = CobblemonCombat.pokemon(actor), ref = String(actor.ref());
            if (!pokemon.wild()) {
                var old = this.individuals[String(pokemon.id())];
                if (old) { if (old === ref && this.residents[old].managed) access.controlled(false); this.forget(old); }
                return;
            }
            if (!this.residents[ref] && pokemon.aiEnabled() && this.brain.supports(pokemon, access)) { this.resident(access, actor, pokemon); this.clock(access, actor); }
        }
        /** Each resident carries a clock effect whose timer drives the decision loop; it ends when the resident leaves the roster. */
        private clock(access: CombatWorld, actor: CombatActor): void {
            if (access.effects(actor, this.id + "/clock").length === 0) access.effect(this.id + "/clock", actor, "{}", 1200000);
        }
        decide(effect: CombatEffect): void {
            var access = effect.world(), now = access.tick(), actor = effect.target(), ref = String(actor.ref()); this.prune(now);
            var pokemon = CobblemonCombat.pokemon(actor), id = String(pokemon.id()), brain = this.brain, existing = this.residents[ref];
            if (!pokemon.wild()) { var old = this.individuals[id]; if (old) { if (old === ref && existing && existing.managed) access.controlled(false); this.forget(old); } effect.end(); return; }
            if (!pokemon.aiEnabled()) {
                if (existing) {
                    var stopping = brain.frame(access, pokemon, "wild", WorldBehaviorHost.point(existing.anchor), null, null, null, this.range, "", function () { return false; }, function () { });
                    brain.stop(stopping, "native-ai-disabled"); if (existing.managed) access.controlled(false); this.forget(ref);
                }
                effect.end(); return;
            }
            if (!existing && !brain.supports(pokemon, access)) { effect.end(); return; }
            // A quick fallback beat covers early returns below; the decision at the end sets the real rhythm.
            effect.schedule("decide", "decide", 4, "{}"); effect.remaining(1200000);
            var state = this.resident(access, actor, pokemon);
            state.decided = now;
            var observed = access.observe(actor); if (!observed) return;
            var position = WorldBehaviorHost.coordinates(observed.position());
            if (WorldMethods.distance(position, state.position) > 0.12) state.resting = now;
            state.position = position; if (!state.managed) state.anchor = position.slice();
            var t0 = WorldCombat.clock();
            var input = brain.frame(access, pokemon, "wild", WorldBehaviorHost.point(state.anchor), null, null, null, this.range, "",
                function (slot, target, point, direction) {
                    var move = pokemon.move(slot), selected = move ? NativeLoadout.selection(access, slot, move) : null;
                    var instance = Number(CobblemonCombat.skill(access, slot).submit(target, point, direction));
                    if (instance > 0 && selected && brain.used) brain.used(selected.id, input, state);
                    return instance;
                }, function (stage, reason) { state.stage = String(stage); state.reason = String(reason); });
            WorldCombat.measured("wild frame", t0);
            input.facts.wild = true; input.facts.managed = state.managed; input.facts.restFor = now - state.resting;
            if (brain.enrich) brain.enrich(input, state);
            input.services.claim = function () { if (!state.managed) { access.controlled(true); state.managed = true; } input.facts.managed = true; };
            if (!brain.supports(pokemon, access)) {
                brain.stop(input, "loadout-changed"); if (state.managed) access.controlled(false); this.forget(ref); effect.end(); return;
            }
            var t1 = WorldCombat.clock();
            var report = brain.run(input, state.memory);
            WorldCombat.measured("wild run", t1);
            if (report.state !== "running" && !access.claimed("movement") && !access.claimed("aim") && state.managed) { access.controlled(false); state.managed = false; }
            var events = state.memory.events || {};
            Object.keys(events).forEach(function (key) { if (now - events[key] > 1200) delete events[key]; });
            // Rhythm follows the situation: anyone worth reacting to nearby, or an action under way, keeps the quick beat;
            // a quiet neighbourhood thinks once a second, and taking damage wakes it at once.
            var self = ref, alert = state.managed || report.state === "running" || (input.facts.nearby as WorldMethods.Subject[]).some(function (other) {
                return other.player || other.hostile || other.owned || other.attacking === self || other.lastAttacker === self || typeof other.hurtAgo === "number" && other.hurtAgo < 40;
            });
            effect.schedule("decide", "decide", alert ? 4 : 20, "{}");
        }
        /** Something happened to a resident: decide on the next tick instead of waiting out the current beat. */
        wake(event: CombatWorldEvent): void {
            var actor = event.target() || event.actor(); if (!this.residents[String(actor.ref())]) return;
            var clocks = event.world().effects(actor, this.id + "/clock");
            if (clocks.length) event.world().operation(clocks[0].id(), this.id + "/wake", "{}");
        }
        install(): void {
            if (this.installed) return; this.installed = true; var controller = this;
            WorldBehavior.profile = { clock: function () { return WorldCombat.clock(); }, measured: function (key, started) { WorldCombat.measured(key, started); } };
            WorldCombat.effect(this.id + "/clock", 1, 1200000, "actor", function (json) { return "{}"; }, EffectProtocols.unchanged);
            WorldCombat.effectHandler(this.id + "/clock", "start", function (effect) { effect.schedule("decide", "decide", 4, "{}"); });
            WorldCombat.effectHandler(this.id + "/clock", "decide", function (effect) { controller.decide(effect); });
            WorldCombat.effectHandler(this.id + "/clock", "operation:" + this.id + "/wake", function (effect) { effect.schedule("decide", "decide", 1, "{}"); });
            WorldCombat.on(this.id + "-bound", "world_combat:actor_bound", "", function (event) { controller.bound(event); });
            WorldCombat.on(this.id + "-changed", "world_combat:actor_changed", "", function (event) { controller.changed(event); });
            WorldCombat.on(this.id + "-hurt", "world_combat:damage_applied", "", function (event) { controller.wake(event); });
        }
    }
}
