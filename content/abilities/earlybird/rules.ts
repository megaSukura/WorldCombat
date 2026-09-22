/**
 * Early Bird shakes off anything that holds it down, and wakes from sleep twice as fast.
 *
 * General path (any combatant): while the holder carries a real MC hindrance effect
 * (slowness, weakness, mining fatigue, blindness, darkness, nausea, hunger, levitation, poison
 * or wither), that effect's remaining duration is cut by 20 ticks every 20 ticks, so it runs out
 * at twice the normal speed. The check runs on the native effect clock through `MobEffects`, so the
 * same rule applies no matter whether the effect came from a Pokemon move, a player's potion or
 * the world.
 *
 * Sleep layer: sleep is read and written through the shared route, so one rule covers a Cobblemon's
 * native sleep and any unit's tagged sleep. `CombatStatus.has(world, holder, "sleep")` sees a native
 * sleep because the shared library mirrors it into the default effect `world_combat:sleep`. The moment
 * sleep is seen, its remaining clock is halved once, and on waking the holder receives vanilla Speed
 * for 80 ticks (4 s). The shorter clock is re-applied with `CombatStatus.inflict`, the shared default
 * route, so the shared library writes it onto the Pokemon's native status slot in the same tick; that
 * native refresh is this unit's Pokemon layer, and no native store is touched directly.
 *
 * Variant sleep: Early Bird is the sleeper's body clearing sleep, not a reaction to a source, so every
 * sleep the holder carries is halved -- another unit's tagged variant included. The result is the
 * shared default sleep, which mirrors for a Pokemon either way.
 *
 * Numbers: "twice as fast" is the original, expressed as a 1-second cut per second. The effect
 * list is exactly the movement/awareness hindrances; it never touches damage-over-time beyond
 * poison/wither, so the ability is recovery, not immunity. The 4-second wake speed is a small
 * reward for the cheap sleep, not a combat swing.
 * Source: Cobblemon/Bulbapedia Early Bird halves sleep duration.
 *
 * Presentation: `shrug` fires when one or more hindrances are cut, `stir` when sleep is halved,
 * `wake` when the holder comes to, and `alert` is a low engaged aura. Numbers unchanged.
 */
namespace WorldCombatAbilityEarlyBird {
    var SCENE = "world_combat:ability_earlybird";
    var CUT = 20;
    var SPEED_TICKS = 80;
    var FEEDBACK_TICKS = 30;
    var TEXT_SHRUG = "world_combat.ability.earlybird.text.shrug";
    var TEXT_STIR = "world_combat.ability.earlybird.text.stir";
    var TEXT_WAKE = "world_combat.ability.earlybird.text.wake";
    var IMPAIR = ["minecraft:slowness", "minecraft:weakness", "minecraft:mining_fatigue",
        "minecraft:blindness", "minecraft:darkness", "minecraft:nausea", "minecraft:hunger",
        "minecraft:levitation", "minecraft:poison", "minecraft:wither"];

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    // Runs from the holder's pulse (every 20 ticks), so only Early Bird holders pay for the scan.
    function shrug(world: CombatWorld, holder: CombatActor): void {
        var cut = 0;
        for (var i = 0; i < IMPAIR.length; i++) {
            var effect = world.mobEffect(holder, IMPAIR[i]);
            if (effect === null || effect.duration() <= CUT) continue;
            // Vanilla addEffect keeps the longer instance, so the removal is required before the
            // shorter re-application; only our exact instance is consumed.
            if (MobEffects.consume(world, holder, IMPAIR[i]) === null) continue;
            if (MobEffects.apply(world, holder, IMPAIR[i], effect.duration() - CUT, effect.amplifier()) !== null) cut++;
        }
        if (cut === 0) return;
        var body = world.observe(holder);
        if (body === null) return;
        WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "shrug", target: String(holder.ref()) }, 30);
        WorldFeedback.text(world, above(body.position()), TEXT_SHRUG, [cut], FEEDBACK_TICKS);
    }

    /**
     * Halve each sleep the holder carries, once, through the shared route. Every effect tagged with the
     * sleep identity is seen -- the shared default, or another unit's variant -- and the shorter clock
     * is re-applied as the shared default, whose mirror updates a Cobblemon's native status slot.
     */
    function stir(world: CombatWorld, holder: CombatActor): void {
        var sleeps = CombatStatus.tagged(world, holder, "sleep");
        for (var i = 0; i < sleeps.length; i++) {
            var sleep = sleeps[i];
            var ticks = sleep.duration() < 0 ? -1 : Math.max(1, Math.ceil(sleep.duration() / 2));
            if (world.removeMobEffect(holder, sleep.id(), sleep.key()))
                CombatStatus.inflict(world, holder, "sleep", ticks, sleep.amplifier());
        }
    }

    function alert(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null) return;
        var body = world.observe(holder);
        if (body === null) return;
        shrug(world, holder);
        if (value.engaged) WorldFeedback.keep(world, "alert", SCENE, 1, body.position(), { moment: "alert" }, 40);
        if (CombatStatus.has(world, holder, "sleep")) {
            // Flags hold numbers; one flag marks that the current sleep has already been shortened.
            if (context.state.flags.earlybirdStirred) return;
            context.state.flags.earlybirdStirred = 1;
            stir(world, holder);
            WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "stir", target: String(holder.ref()) }, 40);
            WorldFeedback.text(world, above(body.position()), TEXT_STIR, [], FEEDBACK_TICKS);
            return;
        }
        if (!context.state.flags.earlybirdStirred) return;
        context.state.flags.earlybirdStirred = 0;
        MobEffects.apply(world, holder, "minecraft:speed", SPEED_TICKS, 0);
        WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "wake", target: String(holder.ref()) }, 40);
        WorldFeedback.text(world, above(body.position()), TEXT_WAKE, [], FEEDBACK_TICKS);
    }

    NativeAbilities.define("earlybird", {}, { pulse: alert });
}
