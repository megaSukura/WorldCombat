/**
 * Gooey clings to whoever strikes the holder at close range.
 *
 * General path (any combatant): every melee hit applies vanilla Slowness for 6 seconds.
 * This reads and writes the same movement path for Pokemon, vanilla mobs, other mods'
 * mobs and players, so the sticky web "just works" on any attacker.
 * Pokemon layer: a Cobblemon attacker also receives the real effect
 * `world_combat:gooey_cling` for 8 seconds. The declared effect lowers the registered
 * `world_combat:skill_haste` attribute by 40, and skill cooling reads that attribute, so
 * the attacker's skill cooldowns recover about 1.67x slower. No other combatant reads
 * skill haste, so this layer only exists for Pokemon.
 * No roll: the original Gooey has none. The cost is that both effects are short, so the
 * holder must keep trading contact hits to keep the attacker slow and off-tempo.
 *
 * Presentation: each throttled hit publishes the client scene `world_combat:ability_gooey`
 * plus one localized line at the attacker. A Pokemon attacker additionally gets the `coat`
 * accent and the `coated` state, which is renewed while the real cling effect holds. The
 * holder carries a sparse `sheen` while engaged, kept from the pulse hook. Numbers, rolls and
 * the player-visible description are unchanged from the accepted mechanic.
 */
namespace WorldCombatAbilityGooey {
    var EFFECT = "world_combat:gooey_cling";
    var SCENE = "world_combat:ability_gooey";
    var SLOW_TICKS = 120;
    var CLING_TICKS = 160;
    var CONTACT_RANGE = 3.5;
    var THROTTLE = 10;
    var FEEDBACK_TICKS = 30;
    var TEXT_CLING = "world_combat.ability.gooey.text.cling";
    var TEXT_COAT = "world_combat.ability.gooey.text.coat";
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

    function cling(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event;
        if (!melee(world, event)) return;
        var holder = event.target()!, now = world.tick();
        if (now - (recent[String(holder.ref())] || -1000) < THROTTLE) return;
        recent[String(holder.ref())] = now;
        var attacker = event.actor();
        MobEffects.apply(world, attacker, "minecraft:slowness", SLOW_TICKS, 0);
        // Keep the original order; the return value only tells presentation what actually took.
        var coated = String(attacker.domain()) === "cobblemon"
            && MobEffects.apply(world, attacker, EFFECT, CLING_TICKS, 0) !== null;
        // Presentation only. The event source is the attacker, so `source` binds the attacker
        // and `target` carries the holder the goo came from.
        var from = world.observe(attacker);
        if (from === null) return;
        var attackerPoint = from.position(), holderRef = String(holder.ref());
        WorldFeedback.emit(world, SCENE, 1, attackerPoint, { moment: "splat", target: holderRef }, 35);
        if (coated) {
            WorldFeedback.emit(world, SCENE, 1, attackerPoint, { moment: "coat", target: holderRef }, 45);
            WorldFeedback.text(world, above(attackerPoint), TEXT_COAT, [], FEEDBACK_TICKS);
        } else {
            WorldFeedback.text(world, above(attackerPoint), TEXT_CLING, [], FEEDBACK_TICKS);
        }
    }

    // The cling is carried by the attacker, so this keeps one `coated` instance per bearer.
    function coatTick(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== EFFECT) return;
        if (event.world().tick() % 20 !== 0) return;
        var world = event.world(), bearer = event.actor();
        if (!world.valid(bearer)) return;
        var body = world.observe(bearer);
        if (body === null) return;
        var bearerRef = String(bearer.ref());
        WorldFeedback.keep(world, "coat:" + bearerRef, SCENE, 1, body.position(), { moment: "coated", target: bearerRef }, 40);
    }

    // Sparse reminder that this body is sticky; pulse runs every 20 ticks (see NativeEffects).
    function sheen(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null || !value.engaged) return;
        var body = world.observe(holder);
        if (body === null) return;
        WorldFeedback.keep(world, "sheen", SCENE, 1, body.position(), { moment: "sheen" }, 40);
    }

    NativeAbilityRecipes.on("gooey", "cling", cling);
    NativeAbilityRecipes.on("gooey", "pulse", sheen);
    NativeAbilities.bind("world_combat:ability_gooey", "world_combat:damage_incoming", "cling",
        "world_combat:effects_incoming", function (event) { return event.target(); });
    WorldCombat.on("world_combat:ability_gooey/tick", "world_combat:mob_effect_tick", "", coatTick);
}
