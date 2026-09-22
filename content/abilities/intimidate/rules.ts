/**
 * Intimidate cowers every enemy that first closes in on the holder.
 *
 * Main path (every combatant): hostiles within 12 blocks receive the harmful MC MobEffect
 * world_combat:intimidate_mark for 200 ticks (10 s), which lowers the vanilla attack_damage
 * attribute by 30%. That attribute feeds both mob melee and Pokemon physical attack, so the
 * same effect reads on players, vanilla mobs and other modded creatures.
 *
 * Pokemon layer: the same effect also subtracts 40 from the native world_combat:skill_haste
 * value, a Pokemon-only value that stretches skill cooldowns to about 1.67x. A cowed Pokemon
 * therefore hesitates before it can act again, which the player and the AI can see in the
 * cooldown display.
 *
 * Numbers: -30% attack for 10 s is a strong but single-target-per-enemy opener applied once per
 * encounter; it fades on its own and stacks with nothing. The haste cut is deliberately tied to
 * the same window and uses the native permissive range (skill_haste > -100).
 * Source: Cobblemon/Bulbapedia Intimidate lowers the opponent's Attack on entry.
 *
 * Presentation: the once-per-encounter wave and each mark play one-shot scenes; a per-victim
 * "sustain" scene is renewed every 20 ticks while the mark holds. Both discrete moments float a
 * line of text at the holder and at each victim.
 */
namespace WorldCombatAbilityIntimidate {
    var RADIUS = 12;
    var EFFECT_TICKS = 200;
    var EFFECT = "world_combat:intimidate_mark";
    var SCENE = "world_combat:ability_intimidate";

    function threaten(context: NativeAbilities.Context, value: any): void {
        if (!value.engaged) { context.state.flags.intimidateMark = 0; return; }
        if (context.state.flags.intimidateMark) return;
        var world = context.world!, self = context.actor!, body = world.observe(self);
        if (!body) return;
        context.state.flags.intimidateMark = 1;
        var origin = body.position();
        var actors = world.query(origin, RADIUS, false);
        var marked: CombatActor[] = [];
        for (var i = 0; i < actors.length; i++) {
            var actor = actors[i];
            if (String(actor.key()) === String(self.key()) || world.friendly(actor)) continue;
            MobEffects.apply(world, actor, EFFECT, EFFECT_TICKS, 0);
            marked.push(actor);
        }
        if (!marked.length) return;
        WorldFeedback.emit(world, SCENE, 1, origin, { moment: "release" }, 60);
        WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1, 0)),
            "world_combat.ability.intimidate.text.release", [marked.length], 50);
        for (var j = 0; j < marked.length; j++) {
            var victim = marked[j], view = world.observe(victim);
            if (!view) continue;
            var point = view.position();
            WorldFeedback.emit(world, SCENE, 1, point,
                { moment: "mark", target: String(victim.ref()) }, 40);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)),
                "world_combat.ability.intimidate.text.mark", [], 40);
        }
    }

    function sustain(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== EFFECT) return;
        if (event.world().tick() % 20 !== 0) return;
        var world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        var body = world.observe(victim);
        if (!body) return;
        WorldFeedback.keep(world, "world_combat:intimidate_mark/" + String(victim.ref()), SCENE, 1,
            body.position(), { moment: "sustain", target: String(victim.ref()) }, 40);
    }

    NativeAbilities.define("intimidate", {}, { pulse: threaten });
    WorldCombat.on("world_combat:ability_intimidate/sustain", "world_combat:mob_effect_tick", "", sustain);
}
