/**
 * Ball Fetch catches thrown objects and returns them to the sender.
 *
 * General path (any combatant): when a ranged hit lands on the holder, the holder catches the
 * projectile and hurls it back. The attacker receives the real harmful MC MobEffect
 * `world_combat:ballfetch_trip` for 80 ticks (4 s), which lowers the vanilla movement speed
 * attribute by 20%. The same path covers arrows, tridents, thrown potions and every other
 * projectile cause, so a skeleton, a Pillager, a player or another modded mob is treated alike.
 * A per-holder 20-tick throttle keeps a volley of shots from keeping one foe permanently slowed.
 *
 * Pokemon layer: if the holder has no held item, it keeps one fetched object and restores 1 PP
 * to its lowest-PP move. That is the native "picks up the ball when it has none" rule expressed
 * with Pokemon resources; PP and held-item state do not exist for non-Pokemon. The PP restore
 * has its own 200-tick (10 s) gate so a stream of arrows is not a PP fountain.
 *
 * Numbers: 80 ticks (4 s) and -20% movement is a small tempo tax for interrupting the holder;
 * the 20-tick throttle is one return per second at most. 1 PP per 10 s is a slow trickle.
 * Source: Cobblemon/Bulbapedia Ball Fetch picks up a failed Poké Ball when the holder has no
 * held item. The instant fight has no failed-ball callback, so the ability is read as "fetch the
 * thrown thing and send it back" (see the unit report's rule feedback).
 *
 * Presentation: `catch` marks the retrieval on the holder, `trip` marks the returned object
 * landing on the attacker, `hold` marks the PP the holder keeps. The trip state is renewed every
 * 20 ticks from the native effect clock. Numbers and rolls never move.
 */
namespace WorldCombatAbilityBallFetch {
    var TRIP = "world_combat:ballfetch_trip";
    var SCENE = "world_combat:ability_ballfetch";
    var TRIP_TICKS = 80;
    var THROTTLE = 20;
    var PP_INTERVAL = 200;
    var FEEDBACK_TICKS = 30;
    var TEXT_CATCH = "world_combat.ability.ballfetch.text.catch";
    var TEXT_TRIP = "world_combat.ability.ballfetch.text.trip";
    var TEXT_HOLD = "world_combat.ability.ballfetch.text.hold";
    var recent: { [ref: string]: number } = {};
    var recentPp: { [ref: string]: number } = {};
    var PROJECTILE_CAUSES = ["arrow", "trident", "mob_projectile", "thrown", "fireball", "snowball",
        "wither_skull", "spit", "wind_charge", "shulker_bullet", "llama_spit", "sonic_boom", "fireworks",
        "potion", "egg", "ender_pearl", "experience_bottle"];

    function ranged(data: any): boolean {
        var cause = String(data.cause || "");
        if (cause.indexOf("world_combat") === 0) return false;
        for (var i = 0; i < PROJECTILE_CAUSES.length; i++) if (cause.indexOf(PROJECTILE_CAUSES[i]) >= 0) return true;
        return false;
    }

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function restorePp(world: CombatWorld, holder: CombatActor): boolean {
        var pokemon = CobblemonCombat.pokemon(holder), slot = -1, chosen: CombatPokemonMove | null = null;
        for (var i = 0; i < pokemon.moveSlots(); i++) {
            var move = pokemon.move(i);
            if (move && (chosen === null || move.pp() < chosen.pp())) { chosen = move; slot = i; }
        }
        if (chosen === null || chosen.pp() >= chosen.maxPp()) return false;
        return CobblemonCombat.pp(world, holder, slot, String(chosen.key()), chosen.pp(), chosen.pp() + 1);
    }

    function fetch(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event;
        var holder = event.target(), attacker = event.actor();
        if (holder === null || !world.valid(attacker)) return;
        if (String(attacker.key()) === String(holder.key()) || world.friendly(holder)) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0) || !ranged(data)) return;
        var now = world.tick(), holderRef = String(holder.ref());
        if (now - (recent[holderRef] || -1000) < THROTTLE) return;
        recent[holderRef] = now;
        var holderBody = world.observe(holder), attackerBody = world.observe(attacker);
        if (holderBody === null || attackerBody === null) return;
        var tripped = MobEffects.apply(world, attacker, TRIP, TRIP_TICKS, 0) !== null;
        // Pokemon layer: no held item means the fetched object is kept as PP.
        var held = false;
        if (String(holder.domain()) === "cobblemon" && NativeEffects.item(context.pokemon, context.state) === ""
            && now - (recentPp[holderRef] || -1000) >= PP_INTERVAL && restorePp(world, holder)) {
            recentPp[holderRef] = now;
            held = true;
        }
        // Presentation only; the event source is the attacker, so name the holder explicitly.
        var point = holderBody.position();
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "catch", target: holderRef }, 35);
        WorldFeedback.text(world, above(point), TEXT_CATCH, [], FEEDBACK_TICKS);
        if (tripped) {
            var at = attackerBody.position();
            WorldFeedback.emit(world, SCENE, 1, at, { moment: "trip", point: [at.x(), at.y(), at.z()] }, 40);
            WorldFeedback.text(world, above(at), TEXT_TRIP, [], FEEDBACK_TICKS);
        }
        if (held) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "hold", target: holderRef }, 40);
            WorldFeedback.emit(world, "world_combat:feedback", 1, above(point),
                { kind: "world-text", start: now, duration: FEEDBACK_TICKS, key: TEXT_HOLD, args: [], type: "hold" }, FEEDBACK_TICKS);
        }
    }

    // The trip is carried by the attacker; keep one low state instance per bearer.
    function sustain(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== TRIP) return;
        if (event.world().tick() % 20 !== 0) return;
        var world = event.world(), bearer = event.actor();
        if (!world.valid(bearer)) return;
        var body = world.observe(bearer);
        if (body === null) return;
        var ref = String(bearer.ref());
        WorldFeedback.keep(world, TRIP + ":" + ref, SCENE, 1, body.position(), { moment: "trip_state", target: ref }, 40);
    }

    NativeAbilities.define("ballfetch", {}, { fetch: fetch });
    NativeAbilities.bind("world_combat:ability_ballfetch", "world_combat:damage_applied", "fetch",
        "", function (event) { return event.target(); });
    WorldCombat.on("world_combat:ability_ballfetch/tick", "world_combat:mob_effect_tick", "", sustain);
}
