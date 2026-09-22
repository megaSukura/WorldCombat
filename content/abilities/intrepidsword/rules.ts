/**
 * Intrepid Sword raises the holder's resolve when a fight begins. The holder is always the
 * Pokemon that owns the ability, so this is a self effect and uses Pokemon mechanics directly.
 *
 * Main path (self): on the first engaged tick the holder's native Attack stage is raised by one
 * (x1.5 physical attack). The shared pulse already clears stat stages when the encounter ends,
 * so the boost naturally lasts exactly one fight without an extra timer.
 *
 * Pokemon layer: the holder also receives the beneficial MC MobEffect world_combat:intrepidsword_edge
 * for 200 ticks, subtracting 25 from the native world_combat:skill_haste value so the opening
 * moves come out faster. The stage and the haste cover offense and tempo separately.
 *
 * Numbers: +1 stage is the native Intrepid Sword value, kept because it is a bounded stage and
 * not a flat damage figure. The 10 s haste window is the real-time "draw the sword" opening; the
 * one-fight duration comes from the shared encounter clock, so there is nothing to configure.
 * Source: Cobblemon/Bulbapedia Intrepid Sword raises Attack on entry.
 *
 * Presentation: the opening draw publishes the client scene world_combat:ability_intrepidsword
 * plus one line of text; the fight-long Attack boost and the 10 s haste are kept as two low
 * auras (edge, tempo) from the pulse hook and the effect tick. Numbers and conditions unchanged.
 */
namespace WorldCombatAbilityIntrepidSword {
    var EFFECT = "world_combat:intrepidsword_edge";
    var EFFECT_TICKS = 200;
    var SCENE = "world_combat:ability_intrepidsword";
    var TEXT_ATTACK = "world_combat.ability.intrepidsword.text.attack";

    function arm(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null) return;
        if (!value.engaged) { context.state.flags.intrepidSwordArmed = 0; return; }
        var body = world.observe(holder);
        if (body === null) return;
        // The Attack boost lasts the whole fight; the pulse keeps a quiet low aura from the feet.
        WorldFeedback.keep(world, "world_combat:intrepidsword/edge", SCENE, 1, body.position(), { moment: "edge" }, 40);
        if (context.state.flags.intrepidSwordArmed) return;
        context.state.flags.intrepidSwordArmed = 1;
        context.state.stages["atk"] = Math.min(6, (context.state.stages["atk"] || 0) + 1);
        MobEffects.apply(world, holder, EFFECT, EFFECT_TICKS, 0);
        WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "draw" }, 60);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), TEXT_ATTACK, [], 50);
    }

    // The skill-haste opening lasts 10 s; the effect tick carries the sharper tempo layer.
    function tempo(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== EFFECT) return;
        if (event.world().tick() % 20 !== 0) return;
        var world = event.world(), holder = event.actor();
        if (!world.valid(holder)) return;
        var body = world.observe(holder);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:intrepidsword/tempo", SCENE, 1, body.position(), { moment: "tempo" }, 40);
    }

    NativeAbilities.define("intrepidsword", {}, { pulse: arm });
    WorldCombat.on("world_combat:ability_intrepidsword/tempo", "world_combat:mob_effect_tick", "", tempo);
}
