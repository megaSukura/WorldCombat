/**
 * Flame Body sears whoever strikes the holder at close range.
 *
 * General path (any combatant): a melee hit has a 30% chance to apply the real Minecraft effect
 * `world_combat:flamebody_sear` for 6 seconds. The declared effect ticks on the server clock and
 * removes 1 health unit every 20 ticks, so the sear works on Pokemon, vanilla mobs, other mods'
 * mobs and players through the same mutation.
 * The effect carries the shared identity `world_combat:status/burn` plus `identity_only`: consumers
 * asking `CombatStatus.has(world, actor, "burn")` see it whichever unit applied it, while the chip
 * stays this unit's own. Identity alone does not mirror onto a Pokemon, and this unit does not
 * expect it to.
 * Pokemon layer: when the attacker is a Cobblemon individual, an independent 15% roll applies the
 * shared default burn, `CombatStatus.inflict(world, attacker, "burn")`. That is the status every
 * combatant shares, so the shared library mirrors it onto the Pokemon's native status and never
 * needs a native-only call; type and ability immunity still apply. The deeper burn is rarer because
 * a native burn is far stronger in instant combat than the per-contact chip the original game
 * priced. The roll stays Pokemon-only: the extra burn is this ability's Pokemon-specific payoff,
 * and on other combatants the shared default burn is the same plain status any other source gives.
 * A 10-tick throttle per holder keeps multi-hit moves from stacking the sear.
 *
 * Presentation: the close-range hit, the ignition, the searing state and the native burn each
 * publish the client scene `world_combat:ability_flamebody` plus one localized line. The aura
 * moment is kept from the pulse hook while the holder is engaged; the searing state is kept from
 * the effect tick. Numbers and rolls are unchanged from the accepted mechanic.
 */
namespace WorldCombatAbilityFlameBody {
    var EFFECT = "world_combat:flamebody_sear";
    var SCENE = "world_combat:ability_flamebody";
    var SEAR_CHANCE = 0.3;
    var BURN_CHANCE = 0.15;
    var SEAR_TICKS = 120;
    var CONTACT_RANGE = 3.5;
    var THROTTLE = 10;
    var FEEDBACK_TICKS = 30;
    var TEXT_SEAR = "world_combat.ability.flamebody.text.sear";
    var TEXT_BURN = "world_combat.ability.flamebody.text.burn";
    var TEXT_CONTACT = "world_combat.ability.flamebody.text.contact";
    var TEXT_TICK = "world_combat.ability.flamebody.text.tick";
    var recent: { [ref: string]: number } = {};
    var PROJECTILE_CAUSES = ["arrow", "trident", "mob_projectile", "thrown", "fireball", "snowball",
        "wither_skull", "spit", "wind_charge", "shulker_bullet", "llama_spit", "sonic_boom", "fireworks",
        "potion", "egg", "ender_pearl", "experience_bottle"];

    function melee(world: CombatWorld, event: CombatWorldEvent): boolean {
        var attacker = event.actor(), holder = event.target();
        if (holder === null || !world.valid(attacker)) return false;
        if (String(attacker.key()) === String(holder.key())) return false;
        var data = JSON.parse(String(event.data()));
        if (!(data.amount > 0)) return false;
        var cause = String(data.cause || "");
        if (cause.indexOf("world_combat") === 0) return false;
        for (var i = 0; i < PROJECTILE_CAUSES.length; i++) if (cause.indexOf(PROJECTILE_CAUSES[i]) >= 0) return false;
        var from = world.observe(attacker), at = world.observe(holder);
        return !!from && !!at && from.position().minus(at.position()).length() <= CONTACT_RANGE;
    }

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function sear(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event;
        if (!melee(world, event)) return;
        var holder = event.target()!, now = world.tick();
        if (now - (recent[String(holder.ref())] || -1000) < THROTTLE) return;
        recent[String(holder.ref())] = now;
        var attacker = event.actor();
        // General route: the sear carries the shared burn identity only, so its chip stays this
        // unit's. Pokemon layer: an independent roll applies the shared default burn, which the
        // shared library mirrors onto the native status. Keep the original roll order; the return
        // values only tell presentation what actually took.
        var seared = world.random() < SEAR_CHANCE && MobEffects.apply(world, attacker, EFFECT, SEAR_TICKS, 0) !== null;
        var burned = String(attacker.domain()) === "cobblemon" && world.random() < BURN_CHANCE
            && CombatStatus.inflict(world, attacker, "burn");
        // Presentation only; the rolls above are the accepted mechanic. The event source is the
        // attacker, so `source` binds the attacker and `target` carries the holder.
        var at = world.observe(holder), from = world.observe(attacker);
        if (at === null) return;
        var holderRef = String(holder.ref()), holderPoint = at.position();
        if (seared) {
            WorldFeedback.emit(world, SCENE, 1, holderPoint, { moment: "sear", target: holderRef }, 45);
            if (from !== null) WorldFeedback.text(world, above(from.position()), TEXT_SEAR, [], FEEDBACK_TICKS);
        } else {
            WorldFeedback.emit(world, SCENE, 1, holderPoint, { moment: "contact", target: holderRef }, 30);
            WorldFeedback.text(world, above(holderPoint), TEXT_CONTACT, [], FEEDBACK_TICKS);
        }
        if (burned && from !== null) {
            WorldFeedback.emit(world, SCENE, 1, from.position(), { moment: "burn", target: holderRef }, 40);
            WorldFeedback.text(world, above(from.position()), TEXT_BURN, [], FEEDBACK_TICKS);
        }
    }

    function burn(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== EFFECT) return;
        var world = event.world();
        if (world.tick() % 20 !== 0) return;
        var bearer = event.actor();
        world.health(bearer, -1, "world_combat:flamebody_sear");
        // The state is carried by whoever is seared, so key it by that ref and bind `target`.
        if (!world.valid(bearer)) return;
        var body = world.observe(bearer);
        if (body === null) return;
        var bearerRef = String(bearer.ref()), point = body.position();
        WorldFeedback.keep(world, "sear:" + bearerRef, SCENE, 1, point, { moment: "sear_state", target: bearerRef }, 40);
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "sear_tick", target: bearerRef }, 24);
        WorldFeedback.text(world, above(point), TEXT_TICK, [1], FEEDBACK_TICKS);
    }

    function aura(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null || !value.engaged) return;
        var body = world.observe(holder);
        if (body === null) return;
        WorldFeedback.keep(world, "aura", SCENE, 1, body.position(), { moment: "aura" }, 40);
    }

    NativeAbilityRecipes.on("flamebody", "sear", sear);
    NativeAbilityRecipes.on("flamebody", "pulse", aura);
    NativeAbilities.bind("world_combat:ability_flamebody", "world_combat:damage_incoming", "sear",
        "world_combat:effects_incoming", function (event) { return event.target(); });
    WorldCombat.on("world_combat:ability_flamebody/tick", "world_combat:mob_effect_tick", "", burn);
}
