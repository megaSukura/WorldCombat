/**
 * Hospitality serves a shared meal when the holder first meets an enemy.
 *
 * Main path (every combatant): the holder puts down a real helper body (a small "meal") next to
 * itself. Up to two friendly bodies that reach it are healed for 25% of their maximum health
 * and receive the beneficial MC MobEffect world_combat:hospitality_well_fed (10 s, +10% movement
 * speed). The meal is a world object: enemies can destroy it, and it expires if nobody comes.
 *
 * Pokemon layer: a friendly Pokemon fed by the meal also restores 1 PP to its lowest-PP move,
 * and the well-fed effect adds +25 to the native world_combat:healing_received value so later
 * healing is stronger. Both use Pokemon-only resources (PP and the healing value).
 *
 * Numbers: 25% is the native switch-in heal carried into real time; two servings keep the
 * payoff for team play without making it a free full-team heal; helper health 4 lets an enemy
 * answer it; the 11 s helper life and 20 s effect cover a normal engagement.
 * Source: Cobblemon/Bulbapedia Hospitality restores an ally's HP on entry.
 *
 * Presentation: the scene `world_combat:ability_hospitality` marks the meal appearing (`offer`),
 * waiting (`meal`, renewed every serve tick), each ally served (`feed`), a Pokemon's PP recovery
 * (`pp`) and the meal leaving (`spoil`). Each event floats one localized line; numbers, rolls and
 * the player-facing description are unchanged.
 */
namespace WorldCombatAbilityHospitality {
    var EFFECT = "world_combat:hospitality_meal";
    var WELL_FED = "world_combat:hospitality_well_fed";
    var RADIUS = 4;
    var HEAL_RATIO = 0.25;
    var WELL_FED_TICKS = 200;
    var SERVINGS = 2;
    var SCENE = "world_combat:ability_hospitality";
    var TEXT_OFFER = "world_combat.ability.hospitality.text.offer";
    var TEXT_FEED = "world_combat.ability.hospitality.text.feed";
    var TEXT_WELL_FED = "world_combat.ability.hospitality.text.well_fed";
    var TEXT_PP = "world_combat.ability.hospitality.text.pp";
    var TEXT_SPOIL = "world_combat.ability.hospitality.text.spoil";

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function restorePp(world: CombatWorld, actor: CombatActor): boolean {
        var pokemon = CobblemonCombat.pokemon(actor), slot = -1, chosen: CombatPokemonMove | null = null;
        for (var i = 0; i < pokemon.moveSlots(); i++) {
            var move = pokemon.move(i);
            if (!move) continue;
            if (chosen === null || move.pp() < chosen.pp()) { chosen = move; slot = i; }
        }
        if (chosen === null || chosen.pp() >= chosen.maxPp()) return false;
        CobblemonCombat.pp(world, actor, slot, String(chosen.key()), chosen.pp(), chosen.pp() + 1);
        return true;
    }

    function feed(world: CombatWorld, actor: CombatActor): void {
        var body = world.observe(actor);
        if (!body) return;
        var healed = 0;
        if (body.health() < body.maxHealth())
            healed = world.health(actor, Math.min(body.maxHealth() - body.health(), body.maxHealth() * HEAL_RATIO), "world_combat:hospitality");
        MobEffects.apply(world, actor, WELL_FED, WELL_FED_TICKS, 0);
        var point = body.position(), ref = String(actor.ref());
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "feed", target: ref }, 40);
        if (healed > 0)
            WorldFeedback.text(world, above(point), TEXT_FEED, [Math.round(healed * 10) / 10], 40);
        else
            WorldFeedback.text(world, above(point), TEXT_WELL_FED, [], 40);
        if (String(actor.domain()) === "cobblemon" && restorePp(world, actor)) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "pp", target: ref }, 40);
            // A distinct `type` keeps this line from merging into the feed line on the same tick.
            WorldFeedback.emit(world, "world_combat:feedback", 1, above(point),
                { kind: "world-text", start: world.tick(), duration: 40, key: TEXT_PP, args: [], type: "pp" }, 40);
        }
    }

    function spoil(world: CombatWorld, state: any): void {
        if (!state.point) return;
        var point = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "spoil" }, 30);
        WorldFeedback.text(world, above(point), TEXT_SPOIL, [], 30);
    }

    function place(world: CombatWorld, point: CombatPoint): CombatActor | null {
        var offsets = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 0, 1], [-1, 0, -1]];
        for (var i = 0; i < offsets.length; i++) {
            try {
                var helper = world.helper(point.plus(WorldCombat.point(offsets[i][0], offsets[i][1], offsets[i][2])), 4,
                    '{"purpose":"meal","item":"minecraft:cake","scale":1.0}', 220);
                if (helper) return helper;
            } catch (error) { }
        }
        return null;
    }

    function fallback(effect: CombatEffect): void {
        var world = effect.world(), holder = effect.target(), body = world.observe(holder);
        if (!body) { effect.end(); return; }
        var actors = world.query(body.position(), RADIUS, false), served = 0;
        for (var i = 0; i < actors.length && served < SERVINGS; i++) {
            var actor = actors[i];
            if (String(actor.ref()) === String(holder.ref()) || !world.friendly(actor)) continue;
            feed(world, actor); served++;
        }
        effect.end();
    }

    function start(effect: CombatEffect): void {
        var world = effect.world(), holder = effect.target(), body = world.observe(holder);
        if (!body) { effect.end(); return; }
        var helper = place(world, body.position());
        if (helper === null) { fallback(effect); return; }
        var spot = world.observe(helper);
        var position = spot === null ? body.position() : spot.position();
        effect.state(JSON.stringify({ ref: String(helper.ref()), served: [],
            point: [position.x(), position.y(), position.z()] }));
        WorldFeedback.emit(world, SCENE, 1, position, { moment: "offer" }, 40);
        WorldFeedback.text(world, above(body.position()), TEXT_OFFER, [], 40);
        effect.schedule("serve", "serve", 10, "{}");
    }

    function serve(effect: CombatEffect): void {
        var world = effect.world(), state = JSON.parse(effect.state()), holder = effect.target();
        if (!state.ref) { effect.end(); return; }
        var helper = world.actor(state.ref), body = helper === null ? null : world.observe(helper);
        if (!helper || !body) {
            if (state.served.length < SERVINGS) spoil(world, state);
            effect.end(); return;
        }
        WorldFeedback.keep(world, "meal", SCENE, 1, body.position(), { moment: "meal" }, 40);
        var actors = world.query(body.position(), RADIUS, false);
        for (var i = 0; i < actors.length && state.served.length < SERVINGS; i++) {
            var actor = actors[i];
            if (String(actor.ref()) === state.ref || String(actor.ref()) === String(holder.ref())) continue;
            if (state.served.indexOf(String(actor.ref())) >= 0 || !world.friendly(actor)) continue;
            feed(world, actor); state.served.push(String(actor.ref()));
        }
        effect.state(JSON.stringify(state));
        if (state.served.length >= SERVINGS) { effect.end(); return; }
        effect.schedule("serve", "serve", 10, "{}");
    }

    function offer(context: NativeAbilities.Context, value: any): void {
        if (!value.engaged) { context.state.flags.hospitalityServed = 0; return; }
        if (context.state.flags.hospitalityServed) return;
        var world = context.world!, self = context.actor!;
        if (world.effects(self, EFFECT).length) return;
        context.state.flags.hospitalityServed = 1;
        world.effect(EFFECT, self, "{}", 400);
    }

    WorldCombat.effect(EFFECT, 1, 400, "actor", function (json: string): string { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(EFFECT, "start", start);
    WorldCombat.effectHandler(EFFECT, "serve", serve);
    WorldCombat.effectHandler(EFFECT, "operation:world_combat:dispel", function (effect: CombatEffect): void { effect.end(); });

    NativeAbilities.define("hospitality", {}, { pulse: offer });
}
