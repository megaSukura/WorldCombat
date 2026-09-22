/**
 * Honey Gather forages while the holder is engaged and shares the sweetness.
 *
 * General path (any combatant): every 10 seconds of an engagement the holder forages. Every
 * friendly body within 4 blocks receives the real beneficial MC MobEffect
 * `world_combat:honeygather_nectar` for 120 ticks (6 s): +10% movement speed and +25 to the
 * registered `world_combat:healing_received` value, so later healing on any of them is stronger.
 * A Pokemon, a player, a vanilla mob and another mod's creature all read the same effect. The
 * forage also ripens one nearby growable plant through the shared cultivation mechanism, so the
 * ability changes the world and not only the fight.
 *
 * Pokemon layer: the holder restores 1 PP to its lowest-PP move each forage. PP is a Pokemon-only
 * resource.
 *
 * Numbers: 10 s is a slow, deliberate cadence, not a spam; 6 s of +10% speed and +25
 * healing-received makes the gather worth protecting but not a constant buff. The shared nectar
 * includes the holder through the friendly query. No roll: the original's "sometimes" becomes the
 * fixed forage cadence, because a random result the player cannot see is worse than a steady one.
 * Source: Cobblemon/Bulbapedia Honey Gather may collect Honey after battle.
 *
 * Presentation: `forage` marks the gather on the holder, `share` marks each ally fed, `growth`
 * marks the ripened plant, `nectar` is kept while the buff holds. Numbers are unchanged.
 */
namespace WorldCombatAbilityHoneyGather {
    var NECTAR = "world_combat:honeygather_nectar";
    var SCENE = "world_combat:ability_honeygather";
    var RADIUS = 4;
    var INTERVAL = 200;
    var NECTAR_TICKS = 120;
    var FEEDBACK_TICKS = 30;
    var TEXT_FORAGE = "world_combat.ability.honeygather.text.forage";
    var TEXT_SHARE = "world_combat.ability.honeygather.text.share";
    var TEXT_GROWTH = "world_combat.ability.honeygather.text.growth";
    var TEXT_PP = "world_combat.ability.honeygather.text.pp";

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

    function forage(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null || !value.engaged) return;
        var now = world.tick();
        if (now - (context.state.flags.honeyAt || -1000) < INTERVAL) return;
        var body = world.observe(holder);
        if (body === null) return;
        context.state.flags.honeyAt = now;
        var origin = body.position();
        WorldFeedback.emit(world, SCENE, 1, origin, { moment: "forage", target: String(holder.ref()) }, 40);
        WorldFeedback.text(world, above(origin), TEXT_FORAGE, [], FEEDBACK_TICKS);
        var actors = world.query(origin, RADIUS, false), shared = 0;
        for (var i = 0; i < actors.length; i++) {
            var actor = actors[i];
            if (!world.friendly(actor)) continue;
            if (MobEffects.apply(world, actor, NECTAR, NECTAR_TICKS, 0) !== null) {
                shared++;
                var view = world.observe(actor);
                if (view !== null) WorldFeedback.emit(world, SCENE, 1, view.position(), { moment: "share", target: String(actor.ref()) }, 34);
            }
        }
        if (shared > 0) WorldFeedback.text(world, above(origin).plus(WorldCombat.point(0, 0.4, 0)), TEXT_SHARE, [shared], FEEDBACK_TICKS);
        // World object: pollinate one nearby plant.
        var sites = WorldCultivation.sites(world, origin, 3);
        for (var j = 0; j < sites.length; j++) {
            if (WorldCultivation.use(world, sites[j]) !== "used") continue;
            var point = WorldCombat.point(sites[j].point[0] + 0.5, sites[j].point[1] + 0.5, sites[j].point[2] + 0.5);
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "growth" }, 40);
            WorldFeedback.text(world, point, TEXT_GROWTH, [], FEEDBACK_TICKS);
            break;
        }
        if (restorePp(world, holder)) {
            WorldFeedback.emit(world, SCENE, 1, origin, { moment: "pp", target: String(holder.ref()) }, 34);
            WorldFeedback.emit(world, "world_combat:feedback", 1, above(origin),
                { kind: "world-text", start: world.tick(), duration: FEEDBACK_TICKS, key: TEXT_PP, args: [], type: "pp" }, FEEDBACK_TICKS);
        }
    }

    function sustain(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== NECTAR) return;
        if (event.world().tick() % 20 !== 0) return;
        var world = event.world(), bearer = event.actor();
        if (!world.valid(bearer)) return;
        var body = world.observe(bearer);
        if (body === null) return;
        WorldFeedback.keep(world, "nectar:" + String(bearer.ref()), SCENE, 1, body.position(),
            { moment: "nectar", target: String(bearer.ref()) }, 40);
    }

    NativeAbilities.define("honeygather", {}, { pulse: forage });
    WorldCombat.on("world_combat:ability_honeygather/tick", "world_combat:mob_effect_tick", "", sustain);
}
