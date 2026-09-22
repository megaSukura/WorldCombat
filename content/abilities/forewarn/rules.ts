/**
 * Forewarn reads the strongest enemy as a fight begins.
 *
 * Main path (every combatant): the chosen enemy is slowed by 15% movement speed and revealed
 * for 200 ticks (10 s). The slow is a real MC MobEffect (world_combat:forewarn_mark) so it stacks,
 * saves and can be cured like any other status; the reveal is the vanilla glowing effect.
 *
 * Pokemon layer: if the target is a Pokemon, the highest-power move it currently carries is
 * "read" and sealed for the same 10 s through the shared temporary-modifier mechanism, so both
 * the player and the AI must pick another move. This carries the native "reads one move" idea
 * into the real-time fight without copying the fixed 1/8 style values.
 *
 * Numbers: radius 16 covers a typical engagement; 200 ticks is a single-target opener applied
 * once per encounter (a state flag makes it once-only and resets when combat ends). The slow is
 * -15% and the move seal lasts 10 s so the debuff is worth reacting to but never a lock-out.
 * Source: Cobblemon/Bulbapedia Forewarn reveals one opponent move with the highest power.
 *
 * Presentation: the read, the mark and (for Pokemon) the move seal each play one-shot scenes and
 * float one localized line; a per-victim "sustain" scene is renewed every 20 ticks while the mark
 * holds. Numbers, rolls and player-visible description are unchanged.
 */
namespace WorldCombatAbilityForewarn {
    var RADIUS = 16;
    var MARK_TICKS = 200;
    var EFFECT = "world_combat:forewarn_mark";
    var GLOWING = "minecraft:glowing";
    var SCENE = "world_combat:ability_forewarn";
    var TEXT_TICKS = 50;
    var TEXT_READ = "world_combat.ability.forewarn.text.read";
    var TEXT_MARK = "world_combat.ability.forewarn.text.mark";
    var TEXT_SEAL = "world_combat.ability.forewarn.text.seal";

    function threat(world: CombatWorld, self: CombatActor, body: CombatObservation): CombatActor | null {
        var actors = world.query(body.position(), RADIUS, false);
        var best: CombatActor | null = null, bestPower = -1, bestRange = RADIUS + 1;
        for (var i = 0; i < actors.length; i++) {
            var actor = actors[i];
            if (String(actor.key()) === String(self.key()) || world.friendly(actor)) continue;
            var view = world.observe(actor);
            if (!view) continue;
            // Shared damage facts: native stats for Pokemon, the native attack attribute otherwise.
            var stats = PokemonDamage.combatants.read(world, actor).stats;
            var power = Math.max(stats.atk || 0, stats.spa || 0);
            var range = view.position().minus(body.position()).length();
            if (power > bestPower || (power === bestPower && range < bestRange)) { best = actor; bestPower = power; bestRange = range; }
        }
        return best;
    }

    function strongestMove(pokemon: CombatPokemon): CombatPokemonMove | null {
        var best: CombatPokemonMove | null = null, bestPower = 0;
        for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
            var move = pokemon.move(slot);
            if (move && move.power() > bestPower) { best = move; bestPower = move.power(); }
        }
        return best;
    }

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function sense(context: NativeAbilities.Context, value: any): void {
        if (!value.engaged) { context.state.flags.forewarnMark = 0; return; }
        if (context.state.flags.forewarnMark) return;
        var world = context.world!, self = context.actor!, body = world.observe(self);
        if (!body) return;
        context.state.flags.forewarnMark = 1;
        var target = threat(world, self, body);
        if (target === null) return;
        MobEffects.apply(world, target, EFFECT, MARK_TICKS, 0);
        MobEffects.apply(world, target, GLOWING, MARK_TICKS, 0);
        // The move seal is the Pokemon layer; the slow and the reveal above apply to every combatant.
        var sealed = false;
        if (String(target.domain()) === "cobblemon") {
            var move = strongestMove(CobblemonCombat.pokemon(target));
            if (move !== null && /^[a-z0-9]{1,64}$/.test(String(move.id()))) {
                NativeModifiers.apply(world, target, { forbidden: [String(move.id())] }, MARK_TICKS);
                sealed = true;
            }
        }
        // Presentation only; the state above is the accepted mechanic. The holder is the pulse
        // source, so `source` binds the reader and `target` carries the chosen foe.
        var origin = body.position();
        WorldFeedback.emit(world, SCENE, 1, origin, { moment: "sense" }, 60);
        WorldFeedback.text(world, above(origin), TEXT_READ, [], TEXT_TICKS);
        var view = world.observe(target);
        if (view === null) return;
        var point = view.position(), ref = String(target.ref());
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "mark", target: ref }, 45);
        WorldFeedback.text(world, above(point), TEXT_MARK, [], TEXT_TICKS);
        if (!sealed) return;
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "seal", target: ref }, 40);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.5, 0)), TEXT_SEAL, [], TEXT_TICKS);
    }

    // The mark is carried by the chosen foe, so the event actor is the victim and `target` binds it.
    function sustain(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== EFFECT) return;
        if (event.world().tick() % 20 !== 0) return;
        var world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        var body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:forewarn_mark/" + String(victim.ref()), SCENE, 1,
            body.position(), { moment: "sustain", target: String(victim.ref()) }, 40);
    }

    NativeAbilities.define("forewarn", {}, { pulse: sense });
    WorldCombat.on("world_combat:ability_forewarn/sustain", "world_combat:mob_effect_tick", "", sustain);
}
