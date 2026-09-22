/**
 * Mummy wraps whoever strikes the holder at close range in grave bandages.
 *
 * General path (any combatant): every melee hit applies the real effect
 * `world_combat:mummy_wrap` for 10 seconds. The declared effect lowers attack damage by
 * 20% and healing received by 50, so any attacker strikes softer and recovers worse. That
 * is the general "you touched a mummy" tax and it works on Pokemon and non-Pokemon alike.
 * Pokemon layer: a Cobblemon attacker also has its ability suppressed for the same 10
 * seconds through the shared native modifier system, which is how this project expresses
 * temporary ability replacement. Suppression only exists for Pokemon, so it is the layer
 * that carries the original Mummy identity.
 * Why not a flat Wither like the first draft: a repeating damage-over-time on every touch
 * ignores who the attacker is and overwhelms the melee trade; the two attribute penalties
 * plus the ability seal make the attacker worse at its job without a hidden kill clock.
 *
 * Presentation: each valid contact publishes the client scene `world_combat:ability_mummy`
 * (`wrap` on the holder and attacker) plus one localized line at the attacker; the Pokemon-only
 * ability seal adds a `seal` beat and its own line. The active wrap is kept as a low `wrap_state`
 * from the effect tick. Numbers, rolls and the 10-tick throttle are unchanged.
 */
namespace WorldCombatAbilityMummy {
    var WRAP = "world_combat:mummy_wrap";
    var WRAP_TICKS = 200;
    var CONTACT_RANGE = 3.5;
    var THROTTLE = 10;
    var SCENE = "world_combat:ability_mummy";
    var FEEDBACK_TICKS = 30;
    var TEXT_WRAP = "world_combat.ability.mummy.text.wrap";
    var TEXT_SEAL = "world_combat.ability.mummy.text.seal";
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

    function curse(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event;
        if (!melee(world, event)) return;
        var holder = event.target()!, now = world.tick();
        if (now - (recent[String(holder.ref())] || -1000) < THROTTLE) return;
        recent[String(holder.ref())] = now;
        var attacker = event.actor();
        var wrapped = MobEffects.apply(world, attacker, WRAP, WRAP_TICKS, 0) !== null;
        var sealed = false;
        if (String(attacker.domain()) === "cobblemon") {
            NativeModifiers.apply(world, attacker, { suppressAbility: true }, WRAP_TICKS);
            sealed = true;
        }
        // Presentation only. The event source is the attacker, so `source` layers bind the
        // attacker; `target` carries the holder for the bandages that leave the mummy.
        var at = world.observe(holder), from = world.observe(attacker);
        if (at === null) return;
        if (wrapped) {
            WorldFeedback.emit(world, SCENE, 1, at.position(), { moment: "wrap", target: String(holder.ref()) }, 40);
            if (from !== null) WorldFeedback.text(world, above(from.position()), TEXT_WRAP, [], FEEDBACK_TICKS);
        }
        if (sealed && from !== null) {
            WorldFeedback.emit(world, SCENE, 1, from.position(), { moment: "seal" }, 36);
            WorldFeedback.text(world, above(from.position()), TEXT_SEAL, [], FEEDBACK_TICKS);
        }
    }

    // The 10 s wrap is carried by the attacker; renew one low-state instance every 20 ticks.
    function sustain(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== WRAP) return;
        var world = event.world();
        if (world.tick() % 20 !== 0) return;
        var bearer = event.actor();
        if (!world.valid(bearer)) return;
        var body = world.observe(bearer);
        if (body === null) return;
        var ref = String(bearer.ref());
        WorldFeedback.keep(world, "wrap:" + ref, SCENE, 1, body.position(),
            { moment: "wrap_state", target: ref }, 40);
    }

    NativeAbilityRecipes.on("mummy", "curse", curse);
    NativeAbilities.bind("world_combat:ability_mummy", "world_combat:damage_incoming", "curse",
        "world_combat:effects_incoming", function (event) { return event.target(); });
    WorldCombat.on("world_combat:ability_mummy/tick", "world_combat:mob_effect_tick", "", sustain);
}
