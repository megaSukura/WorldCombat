/**
 * Dancer answers a dance with a dance, and the field moves with it.
 *
 * General path (any combatant): when a dance move is performed by the holder or lands on the
 * holder, a rhythm ripples out 5 blocks. Every friendly body in range receives the beneficial MC
 * MobEffect `world_combat:dancer_rhythm` for 100 ticks (5 s): +20% movement speed and +10% attack
 * damage. Every hostile body receives `world_combat:dancer_mesmer` for the same time: -20% attack
 * damage. Both effects touch the vanilla movement/attack attributes, so a Pokemon, a player, a
 * vanilla mob and another mod's creature are all caught by the same sweep. The holder is included
 * in the friendly sweep.
 *
 * Pokemon layer: a Cobblemon holder also raises its native Speed stage by one, which the player
 * and the AI can see in the stat readout. Speed stages only exist for Pokemon.
 *
 * Numbers: 5 blocks is a normal engagement radius; 5 s keeps the beat relevant without making the
 * ability a permanent team buff; +/-20% is a real but reversible swing. A 20-tick throttle stops a
 * double dance (own move plus an incoming dance) from overwriting itself instantly.
 * Source: Cobblemon/Bulbapedia Dancer copies a dance move when anyone uses one. Instant combat has
 * no safe way to inject an arbitrary native move from an ability hook, so the copy is read as
 * "answer with the same performance" (see the unit report's rule feedback).
 *
 * Presentation: `dance` marks the performance on the holder, `rhythm` marks the friendly sweep,
 * `mesmer` marks each distracted foe, `step` marks the native Speed stage. Numbers unchanged.
 */
namespace WorldCombatAbilityDancer {
    var RHYTHM = "world_combat:dancer_rhythm";
    var MESMER = "world_combat:dancer_mesmer";
    var SCENE = "world_combat:ability_dancer";
    var RADIUS = 5;
    var ECHO_TICKS = 100;
    var THROTTLE = 20;
    var FEEDBACK_TICKS = 30;
    var TEXT_DANCE = "world_combat.ability.dancer.text.dance";
    var TEXT_RHYTHM = "world_combat.ability.dancer.text.rhythm";
    var TEXT_MESMER = "world_combat.ability.dancer.text.mesmer";
    var TEXT_STEP = "world_combat.ability.dancer.text.step";
    var DANCE = ["aquastep", "clangoroussoul", "dragondance", "featherdance", "fierydance",
        "lunardance", "petaldance", "quiverdance", "revelationdance", "swordsdance", "teeterdance", "victorydance"];
    var recent: { [ref: string]: number } = {};

    function isDance(id: string): boolean {
        return DANCE.indexOf(id) >= 0;
    }

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    // Shared response: one performance, one sweep, one Pokemon stage.
    function echo(world: CombatWorld, holder: CombatActor): void {
        var now = world.tick(), ref = String(holder.ref());
        if (now - (recent[ref] || -1000) < THROTTLE) return;
        recent[ref] = now;
        var body = world.observe(holder);
        if (body === null) return;
        var origin = body.position();
        WorldFeedback.emit(world, SCENE, 1, origin, { moment: "dance", target: ref }, 45);
        WorldFeedback.text(world, above(origin), TEXT_DANCE, [], FEEDBACK_TICKS);
        // `friendly` is relative to the current event source (the holder when the holder dances,
        // the attacker when a dance lands). Comparing each body to the holder's own relation
        // keeps the same classification on both paths.
        var holderFriendly = body.friendly();
        var actors = world.query(origin, RADIUS, false), friends = 0;
        for (var i = 0; i < actors.length; i++) {
            var actor = actors[i], view = world.observe(actor);
            if (view === null) continue;
            if (view.friendly() === holderFriendly) { if (MobEffects.apply(world, actor, RHYTHM, ECHO_TICKS, 0) !== null) friends++; }
            else MobEffects.apply(world, actor, MESMER, ECHO_TICKS, 0);
        }
        if (friends > 0) {
            WorldFeedback.emit(world, SCENE, 1, origin, { moment: "rhythm", target: ref }, 40);
            WorldFeedback.text(world, above(origin).plus(WorldCombat.point(0, 0.4, 0)), TEXT_RHYTHM, [friends], FEEDBACK_TICKS);
        }
        for (var j = 0; j < actors.length && j < 8; j++) {
            var foe = actors[j], foeView = world.observe(foe);
            if (foeView === null || foeView.friendly() === holderFriendly) continue;
            WorldFeedback.emit(world, SCENE, 1, foeView.position(), { moment: "mesmer", target: String(foe.ref()) }, 34);
            WorldFeedback.text(world, above(foeView.position()), TEXT_MESMER, [], FEEDBACK_TICKS);
        }
        // Pokemon layer: the copied dance raises the holder's Speed stage.
        if (String(holder.domain()) === "cobblemon" && world.valid(holder)) {
            var before = NativeEffects.stage(NativeEffects.read(world, holder), "spe");
            NativeEffects.boost(world, holder, "spe", 1);
            var after = NativeEffects.stage(NativeEffects.read(world, holder), "spe");
            if (after > before) {
                WorldFeedback.emit(world, SCENE, 1, origin, { moment: "step", target: ref }, 34);
                WorldFeedback.text(world, above(origin).plus(WorldCombat.point(0, 0.8, 0)), TEXT_STEP, [], FEEDBACK_TICKS);
            }
        }
    }

    // The holder leads a dance itself.
    function perform(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor, move = value.move;
        if (world === null || holder === null || !move) return;
        if (!isDance(String(move.id()))) return;
        echo(world, holder);
    }

    // Someone dances onto the holder; the holder answers.
    function answer(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event, holder = event.target();
        if (holder === null) return;
        var data = JSON.parse(String(event.data()));
        if (data.kind !== "move" || !isDance(String(data.move || ""))) return;
        echo(world, holder);
    }

    NativeAbilities.define("dancer", {}, { committed: perform, received: answer });
    NativeAbilities.bind("world_combat:ability_dancer", "world_combat:damage_applied", "received",
        "", function (event) { return event.target(); });
}
