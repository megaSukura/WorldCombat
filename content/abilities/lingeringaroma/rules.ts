/**
 * Lingering Aroma sticks to whoever strikes the holder at close range.
 *
 * General path (any combatant): every melee hit coats the attacker in the real effect
 * `world_combat:lingering_aroma` for 30 seconds. The declared effect lowers the
 * `minecraft:generic.attack_damage` attribute by 15%, so any attacker that keeps swinging
 * hits softer, and a short scent sound marks the contact. While the aroma is present its
 * server clock refreshes a 3-second Glowing every 2 seconds, so the smelly target keeps
 * being trackable instead of turning into a walking lamp.
 * Pokemon layer: a Cobblemon attacker also loses one Evasion stage, because the reek gives
 * it away. Evasion is a Pokemon-only stage.
 * Why not a permanent Glowing: a reveal alone changes no decision. The attack penalty and
 * the evasion drop are the mechanics; the pulsed Glowing is their visible side effect.
 *
 * Presentation: an `aura` moment is kept on the holder while engaged; the close-range hit plays
 * `cling` on the holder and the attacker plus one line of text; a Pokemon evasion drop adds
 * `expose` and a second line; the 2-second glow refresh keeps `sustain` on the bearer and plays
 * `pulse`. The rolls, timings and visible description are unchanged.
 */
namespace WorldCombatAbilityLingeringAroma {
    var EFFECT = "world_combat:lingering_aroma";
    var SCENE = "world_combat:ability_lingeringaroma";
    var AROMA_TICKS = 600;
    var PULSE = 40;
    var GLOW_TICKS = 60;
    var CONTACT_RANGE = 3.5;
    var THROTTLE = 10;
    var FEEDBACK_TICKS = 30;
    var TEXT_CLING = "world_combat.ability.lingeringaroma.text.cling";
    var TEXT_EXPOSE = "world_combat.ability.lingeringaroma.text.expose";
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

    function stain(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event;
        if (!melee(world, event)) return;
        var holder = event.target()!, now = world.tick();
        if (now - (recent[String(holder.ref())] || -1000) < THROTTLE) return;
        recent[String(holder.ref())] = now;
        var attacker = event.actor(), body = world.observe(attacker);
        MobEffects.apply(world, attacker, "minecraft:glowing", GLOW_TICKS, 0);
        MobEffects.apply(world, attacker, EFFECT, AROMA_TICKS, 0);
        if (body) world.sound("minecraft:entity.bee.loop", body.position(), 8, '{"kind":"lingering_aroma"}');
        // The evasion drop is presentation-visible only when the stage actually moved.
        var exposed = false;
        if (String(attacker.domain()) === "cobblemon") {
            var before = NativeEffects.stage(NativeEffects.read(world, attacker), "evasion");
            NativeEffects.boost(world, attacker, "evasion", -1);
            exposed = NativeEffects.stage(NativeEffects.read(world, attacker), "evasion") < before;
        }
        // Presentation only; the event source is the attacker, so `source` coats the attacker and
        // `target` carries the holder the reek sprays off.
        var at = world.observe(holder), from = world.observe(attacker);
        if (at === null) return;
        WorldFeedback.emit(world, SCENE, 1, at.position(), { moment: "cling", target: String(holder.ref()) }, 45);
        if (from !== null) {
            WorldFeedback.text(world, above(from.position()), TEXT_CLING, [], FEEDBACK_TICKS);
            if (exposed) {
                WorldFeedback.emit(world, SCENE, 1, from.position(), { moment: "expose", target: String(holder.ref()) }, 35);
                WorldFeedback.text(world, above(from.position()).plus(WorldCombat.point(0, 0.5, 0)), TEXT_EXPOSE, [], FEEDBACK_TICKS);
            }
        }
    }

    function drift(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== EFFECT) return;
        var world = event.world();
        if (world.tick() % PULSE !== 0) return;
        var bearer = event.actor();
        MobEffects.apply(world, bearer, "minecraft:glowing", GLOW_TICKS, 0);
        var body = world.observe(bearer);
        if (body) world.sound("minecraft:entity.bee.loop", body.position(), 8, '{"kind":"lingering_aroma"}');
        if (!world.valid(bearer) || body === null) return;
        // The bearer carries the coating, so the state veil and the glow pulse bind `target`.
        var bearerRef = String(bearer.ref()), point = body.position();
        WorldFeedback.keep(world, "aroma:" + bearerRef, SCENE, 1, point, { moment: "sustain", target: bearerRef }, 40);
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "pulse", target: bearerRef }, 24);
    }

    function aura(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null || !value.engaged) return;
        var body = world.observe(holder);
        if (body === null) return;
        WorldFeedback.keep(world, "aura", SCENE, 1, body.position(), { moment: "aura" }, 40);
    }

    NativeAbilityRecipes.on("lingeringaroma", "stain", stain);
    NativeAbilityRecipes.on("lingeringaroma", "pulse", aura);
    NativeAbilities.bind("world_combat:ability_lingeringaroma", "world_combat:damage_incoming", "stain",
        "world_combat:effects_incoming", function (event) { return event.target(); });
    WorldCombat.on("world_combat:ability_lingeringaroma/tick", "world_combat:mob_effect_tick", "", drift);
}
