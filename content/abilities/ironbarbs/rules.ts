/**
 * Iron Barbs answers a close-range hit with a delayed spike volley.
 *
 * General path (any combatant): a melee hit has a 40% chance to start the world process
 * `world_combat:ironbarbs_volley`. The process leaves a temporary helper shard at the
 * holder's spot, waits exactly 1 second, then steps the shard toward the attacker. On
 * contact it deals 1/8 of the attacker's maximum health through the common health path,
 * so any attacker type is treated identically. The roll and the project delay replace the
 * original's guaranteed instant 1/8 counter, which is far too strong once hits are not
 * turn-ordered.
 * Pokemon layer: an attacker that is a Cobblemon individual also loses one Defence stage
 * on impact, because the shards lodge in its guard. Stage changes only exist for Pokemon.
 *
 * Presentation: the proc bristles the holder, the one-second pause gathers a barb above it,
 * the launch and the shard's travel are drawn as a cold steel streak, and the hit plays on the
 * attacker. Each discrete beat floats one localized line. The scene is bound by explicit
 * `data.point` / `data.target`, so the feedback does not depend on the event source. Rolls,
 * damage, range and throttle are unchanged.
 */
namespace WorldCombatAbilityIronBarbs {
    var VOLLEY = "world_combat:ironbarbs_volley";
    var CHANCE = 0.4;
    var FRACTION = 1 / 8;
    var CONTACT_RANGE = 3.5;
    var THROTTLE = 10;
    var PAUSE = 20;
    var STEP = 1;
    var STEP_DISTANCE = 0.8;
    var HIT_RANGE = 1.6;
    var SCENE = "world_combat:ability_ironbarbs";
    var FEEDBACK_TICKS = 30;
    var TEXT_BRISTLE = "world_combat.ability.ironbarbs.text.bristle";
    var TEXT_LAUNCH = "world_combat.ability.ironbarbs.text.launch";
    var TEXT_HIT = "world_combat.ability.ironbarbs.text.hit";
    var TEXT_CRIPPLE = "world_combat.ability.ironbarbs.text.cripple";
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

    function normalize(json: string): string {
        var value = JSON.parse(json);
        if (typeof value.target !== "string" || !value.target) throw new Error("Invalid barbs target");
        if (typeof value.damage !== "number" || !isFinite(value.damage) || value.damage <= 0) throw new Error("Invalid barbs damage");
        if (!Array.isArray(value.point) || value.point.length !== 3 ||
            value.point.some(function (n: any) { return typeof n !== "number" || !isFinite(n); })) throw new Error("Invalid barbs point");
        return JSON.stringify(value);
    }

    function clear(world: CombatWorld, state: any): void {
        if (!state.shard) return;
        var shard = world.actor(state.shard);
        if (shard !== null) world.removeHelper(shard);
        state.shard = "";
    }

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    // The single landing point. It reports the damage actually dealt, and it reads the Defence
    // stage before and after the boost so the Pokemon-only beat only plays when the guard broke.
    function impact(world: CombatWorld, target: CombatActor, state: any): void {
        var body = world.observe(target);
        var point = body !== null ? body.position()
            : WorldCombat.point(state.point[0], state.point[1], state.point[2]);
        var targetRef = String(target.ref());
        var dealt = -world.health(target, -state.damage, "world_combat:ironbarbs");
        if (!(dealt > 0)) dealt = 0;
        var dropped = false;
        if (world.valid(target) && String(target.domain()) === "cobblemon") {
            var before = NativeEffects.read(world, target).stages["def"] || 0;
            NativeEffects.boost(world, target, "def", -1);
            var after = NativeEffects.read(world, target).stages["def"] || 0;
            dropped = after < before;
        }
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "impact", point: [point.x(), point.y(), point.z()] }, 40);
        WorldFeedback.text(world, above(point), TEXT_HIT, [Math.round(dealt * 10) / 10], 40);
        if (dropped) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "cripple", target: targetRef }, 34);
            WorldFeedback.text(world, above(point).plus(WorldCombat.point(0, 0.35, 0)), TEXT_CRIPPLE, [], 40);
        }
    }

    function prick(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event;
        if (!melee(world, event)) return;
        var holder = event.target()!, now = world.tick();
        if (now - (recent[String(holder.ref())] || -1000) < THROTTLE) return;
        recent[String(holder.ref())] = now;
        if (world.random() >= CHANCE) return;
        var attacker = event.actor(), body = world.observe(attacker), at = world.observe(holder);
        if (!body || !at) return;
        world.effect(VOLLEY, holder, JSON.stringify({ target: String(attacker.ref()),
            damage: body.maxHealth() * FRACTION, point: [at.position().x(), at.position().y(), at.position().z()] }), 120);
        // The proc beat reads on the holder; the event source is the attacker, so name the holder.
        var holderRef = String(holder.ref()), holderPoint = at.position();
        WorldFeedback.emit(world, SCENE, 1, holderPoint, { moment: "bristle", target: holderRef }, 30);
        WorldFeedback.text(world, above(holderPoint), TEXT_BRISTLE, [], FEEDBACK_TICKS);
    }

    WorldCombat.effect(VOLLEY, 1, 200, "actor", normalize, EffectProtocols.unchanged);
    WorldCombat.effectHandler(VOLLEY, "start", function (effect) {
        effect.schedule("launch", "launch", PAUSE, "{}");
        // The one-second pause gathers the barb above the holder at the captured spot.
        var world = effect.world(), state = JSON.parse(effect.state());
        WorldFeedback.keep(world, "gather:" + effect.id(), SCENE, 1,
            WorldCombat.point(state.point[0], state.point[1], state.point[2]),
            { moment: "gather", point: state.point }, 40);
    });
    WorldCombat.effectHandler(VOLLEY, "launch", function (effect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var target = world.actor(state.target);
        if (target === null || !world.valid(target)) { effect.end(); return; }
        var origin = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
        WorldFeedback.emit(world, SCENE, 1, origin, { moment: "launch", point: state.point }, 26);
        WorldFeedback.text(world, above(origin).plus(WorldCombat.point(0, 1.6, 0)), TEXT_LAUNCH, [], FEEDBACK_TICKS);
        var shard: CombatActor | null = null;
        // Spawn above the holder so the temporary body does not collide with it.
        try {
            shard = world.helper(WorldCombat.point(state.point[0], state.point[1] + 2.2, state.point[2]), 1,
                '{"kind":"ironbarbs_shard"}', 80);
        } catch (error) { shard = null; }
        if (shard === null) {
            impact(world, target, state);
            effect.end(); return;
        }
        state.shard = String(shard.ref());
        effect.state(JSON.stringify(state));
        effect.schedule("fly", "fly", STEP, "{}");
    });
    WorldCombat.effectHandler(VOLLEY, "fly", function (effect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        var target = world.actor(state.target), shard = state.shard ? world.actor(state.shard) : null;
        if (target === null || shard === null) { clear(world, state); effect.state(JSON.stringify(state)); effect.end(); return; }
        var at = world.observe(target), from = world.observe(shard);
        if (!at || !from) { clear(world, state); effect.state(JSON.stringify(state)); effect.end(); return; }
        var delta = at.position().minus(from.position()), distance = delta.length();
        if (distance <= HIT_RANGE) {
            impact(world, target, state);
            clear(world, state); effect.state(JSON.stringify(state)); effect.end(); return;
        }
        var to = from.position().plus(delta.unit().scale(Math.min(STEP_DISTANCE, distance)));
        // A blocked final step means the shard reached the body; settle there instead of stalling.
        if (!world.teleport(shard, to)) {
            impact(world, target, state);
            clear(world, state); effect.state(JSON.stringify(state)); effect.end(); return;
        }
        // Renew the trail at the shard each travel tick; it drains 8 ticks after the last step.
        WorldFeedback.keep(world, "flight:" + effect.id(), SCENE, 1, to,
            { moment: "flight", point: [to.x(), to.y(), to.z()] }, 8);
        effect.schedule("fly", "fly", STEP, "{}");
    });
    WorldCombat.effectHandler(VOLLEY, "end", function (effect) {
        var world = effect.world(), state = JSON.parse(effect.state());
        clear(world, state);
    });
    NativeAbilityRecipes.on("ironbarbs", "prick", prick);
    NativeAbilities.bind("world_combat:ability_ironbarbs", "world_combat:damage_incoming", "prick",
        "world_combat:effects_incoming", function (event) { return event.target(); });
}
