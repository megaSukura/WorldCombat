/**
 * Levitate floats the holder off the ground.
 *
 * General path (any combatant): the holder cannot be reached by ground-level hazards. A fall,
 * cactus, sweet-berry-bush or elytra wall hit is negated outright, and a melee or contact hit
 * from a grounded attacker within 3.5 blocks is reduced by 15% because the holder has drifted out
 * of the swing. Both run in the shared incoming-damage pipeline, so a Pokemon move, a player's
 * sword, a zombie's arm and another mod's attack are all reduced the same way. While engaged the
 * holder also carries the beneficial MC MobEffect `world_combat:levitate_hover` for 60 ticks,
 * renewed every 20 ticks: +10% movement speed.
 *
 * Pokemon layer: Ground-type move damage is negated entirely, the original Levitate rule, unless
 * the holder holds an Iron Ball (the native grounding item) or the move bypasses abilities. Types
 * and held items are Pokemon concepts.
 *
 * Numbers: the original is full Ground immunity; the general path gives every other attacker a
 * real, smaller penalty so they are not simply ignored. 15% keeps a grounded bruiser able to trade
 * while still rewarding the float. The 3.5-block reach matches the project's contact range.
 * Source: Cobblemon/Bulbapedia Levitate grants immunity to Ground moves.
 *
 * Presentation: `hover` is the engaged aura, `negate` marks a fully negated hazard or Ground move,
 * `drift` marks the reduced melee. Numbers unchanged.
 */
namespace WorldCombatAbilityLevitate {
    var HOVER = "world_combat:levitate_hover";
    var SCENE = "world_combat:ability_levitate";
    var HOVER_TICKS = 60;
    var CONTACT_RANGE = 3.5;
    var GROUND_REDUCTION = 0.15;
    var FEEDBACK_TICKS = 30;
    var TEXT_NEGATE = "world_combat.ability.levitate.text.negate";
    var TEXT_DRIFT = "world_combat.ability.levitate.text.drift";
    var HAZARDS = ["fall", "cactus", "sweetBerryBush", "flyIntoWall"];

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function floats(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event, holder = event.target();
        if (holder === null || String(holder.domain()) !== "cobblemon") return;
        var data = JSON.parse(String(event.data()));
        if (!(data.amount > 0) || data.bypassesInvulnerability) return;
        var body = world.observe(holder);
        if (body === null) return;
        var point = body.position(), ref = String(holder.ref());
        var cause = String(data.cause || "");
        for (var i = 0; i < HAZARDS.length; i++) if (cause === HAZARDS[i]) {
            data.amount = 0; event.data(JSON.stringify(data));
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "negate", target: ref }, 34);
            WorldFeedback.text(world, above(point), TEXT_NEGATE, [], FEEDBACK_TICKS);
            return;
        }
        // Pokemon layer: full Ground immunity unless the native grounding item is held.
        if (!data.ignoreAbility && data.type === "ground"
            && NativeEffects.item(context.pokemon, context.state) !== "iron_ball") {
            data.amount = 0; event.data(JSON.stringify(data));
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "negate", target: ref }, 40);
            WorldFeedback.text(world, above(point), TEXT_NEGATE, [], FEEDBACK_TICKS);
            return;
        }
        // General: a grounded attacker at contact range has trouble reaching the floater.
        // `world.source()` is the attacker here, so friendliness is read against the holder.
        var attacker = event.actor();
        if (String(attacker.key()) === String(holder.key()) || world.friendly(holder)) return;
        var from = world.observe(attacker);
        if (from === null || !from.grounded() || from.position().minus(point).length() > CONTACT_RANGE) return;
        data.amount *= (1 - GROUND_REDUCTION);
        event.data(JSON.stringify(data));
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "drift", target: ref }, 26);
        WorldFeedback.text(world, above(point), TEXT_DRIFT, [], FEEDBACK_TICKS);
    }

    function drift(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null || !value.engaged) return;
        var body = world.observe(holder);
        if (body === null) return;
        MobEffects.apply(world, holder, HOVER, HOVER_TICKS, 0);
        WorldFeedback.keep(world, "hover", SCENE, 1, body.position(), { moment: "hover" }, 40);
    }

    NativeAbilities.define("levitate", {}, { incoming: floats, pulse: drift });
    NativeAbilities.bind("world_combat:ability_levitate", "world_combat:damage_incoming", "incoming",
        "world_combat:effects_incoming", function (event) { return event.target(); });
}
