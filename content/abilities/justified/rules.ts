/**
 * Justified kindles strength when the holder is struck hard or by a dark move.
 *
 * General path (any combatant): a hit that removes at least 25% of the holder's maximum
 * health grants vanilla Strength for 8 seconds. The 25% threshold and a 5-second internal
 * cooldown keep a fast multi-hit rush from keeping the buff permanently refreshed.
 * Pokemon layer: any damage whose native move type is `dark` also raises the holder's
 * Attack by one stage through the shared stage system. Type data only exists for move
 * damage, so this layer exists for Pokemon attackers; it stacks with the general path on a
 * heavy dark hit.
 * Why not the original's raw "Dark raises Attack" only: non-Pokemon attackers carry no
 * type, so the heavy-hit path gives them a real, observable rule while the stage boost
 * carries the original identity for Pokemon.
 *
 * Presentation: the heavy hit plays `kindle`, the dark-move boost plays `temper`, and each
 * floating line states which one landed. While the granted Strength holds and the holder is
 * engaged, the pulse hook keeps the `ward` aura. Only calls that actually applied are shown;
 * no number, roll or threshold changed.
 */
namespace WorldCombatAbilityJustified {
    var HEAVY_FRACTION = 0.25;
    var STRENGTH_TICKS = 160;
    var THROTTLE = 100;
    var SCENE = "world_combat:ability_justified";
    var STRENGTH = "minecraft:strength";
    var FEEDBACK_TICKS = 30;
    var TEXT_KINDLE = "world_combat.ability.justified.text.kindle";
    var TEXT_TEMPER = "world_combat.ability.justified.text.temper";
    var recent: { [ref: string]: number } = {};

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function provoke(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event, holder = event.target();
        if (holder === null || !world.valid(holder)) return;
        if (String(event.actor().key()) === String(holder.key())) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var body = world.observe(holder);
        if (!body) return;
        var holderRef = String(holder.ref()), point = body.position();
        if (data.actual >= body.maxHealth() * HEAVY_FRACTION) {
            var now = world.tick();
            if (now - (recent[holderRef] || -1000) >= THROTTLE) {
                recent[holderRef] = now;
                // Presentation follows the actual application; the roll and threshold are unchanged.
                if (MobEffects.apply(world, holder, STRENGTH, STRENGTH_TICKS, 0) !== null) {
                    WorldFeedback.emit(world, SCENE, 1, point, { moment: "kindle", target: holderRef }, 45);
                    WorldFeedback.text(world, above(point), TEXT_KINDLE, [], FEEDBACK_TICKS);
                }
            }
        }
        if (data.kind === "move" && String(data.type || "") === "dark") {
            var before = NativeEffects.read(world, holder).stages.atk || 0;
            NativeEffects.boost(world, holder, "atk", 1);
            var after = NativeEffects.read(world, holder).stages.atk || 0;
            // At +6 the boost is a no-op; report the layer only when a stage was actually gained.
            if (after > before) {
                WorldFeedback.emit(world, SCENE, 1, point, { moment: "temper", target: holderRef }, 40);
                WorldFeedback.text(world, above(point).plus(WorldCombat.point(0, 0.4, 0)), TEXT_TEMPER, [], FEEDBACK_TICKS);
            }
        }
    }

    // The Strength the heavy hit grants is a real MobEffect; while it holds and the holder is
    // engaged, the pulse keeps a low ward. Keyed by source, so each holder owns one instance.
    function ward(context: NativeAbilities.Context, value: any): void {
        if (!value.engaged) return;
        var world = context.world, holder = context.actor;
        if (world === null || holder === null) return;
        if (!MobEffects.read(world, holder, STRENGTH)) return;
        var body = world.observe(holder);
        if (body === null) return;
        WorldFeedback.keep(world, "justified_strength", SCENE, 1, body.position(), { moment: "ward" }, 40);
    }

    NativeAbilityRecipes.on("justified", "provoke", provoke);
    NativeAbilityRecipes.on("justified", "pulse", ward);
    NativeAbilities.bind("world_combat:ability_justified", "world_combat:damage_applied", "provoke",
        "", function (event) { return event.target(); });
}
