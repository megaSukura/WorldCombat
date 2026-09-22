/**
 * Perish Body marks a heavy hitter with a death sentence.
 *
 * General path (any combatant): when one enemy blow removes at least 25% of the holder's
 * maximum health, that attacker receives the real effect `world_combat:perish_body` for 12
 * seconds. When the effect runs out, the bearer is dropped to zero through the common
 * health path. The holder is not marked. The ability fires at most once per engagement
 * (the gate clears when the holder disengages), which is the "只给一次" the review asked
 * for and stops a bulky holder from handing out death sentences every hit.
 * Pokemon layer: a Cobblemon attacker also loses one Special Attack stage when sentenced.
 * The curse clears itself if the bearer is a Pokemon that disengages, mirroring the
 * original's "switching out removes it". A milk bucket also removes it, so the victim has
 * a real reaction window.
 * Balance: 12 seconds is long enough to react and short enough that the sentence is not a
 * free win; the trigger needs a 25% hit, so the holder is already losing the trade.
 *
 * Presentation: the client scene `world_combat:ability_perishbody` is emitted on the sentence,
 * the Pokemon-only stage drop, the expiry drop and the early clear, and kept as an engaged aura
 * on the holder and a countdown mark on the bearer. Numbers and windows are unchanged.
 */
namespace WorldCombatAbilityPerishBody {
    var DOOM = "world_combat:perish_body";
    var DOOM_TICKS = 240;
    var THRESHOLD = 0.25;
    var SCENE = "world_combat:ability_perishbody";
    var TEXT_BLOW = "world_combat.ability.perishbody.text.blow";
    var TEXT_SENTENCE = "world_combat.ability.perishbody.text.sentence";
    var TEXT_WEAKEN = "world_combat.ability.perishbody.text.weaken";
    var TEXT_DOOM = "world_combat.ability.perishbody.text.doom";
    var TEXT_LIFT = "world_combat.ability.perishbody.text.lift";
    var spent: { [ref: string]: boolean } = {};

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function sentence(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event, holder = event.target();
        if (holder === null || !world.valid(holder)) return;
        if (spent[String(holder.ref())]) return;
        if (String(event.actor().key()) === String(holder.key())) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var body = world.observe(holder);
        if (!body || data.actual < body.maxHealth() * THRESHOLD) return;
        var attacker = event.actor();
        if (!world.valid(attacker) || world.friendly(attacker)) return;
        spent[String(holder.ref())] = true;
        var cursed = MobEffects.apply(world, attacker, DOOM, DOOM_TICKS, 0) !== null;
        // The omen saps a Pokemon attacker's special offence; stage changes only exist for Pokemon.
        var weakened = false;
        if (String(attacker.domain()) === "cobblemon") {
            var before = NativeEffects.stage(NativeEffects.read(world, attacker), "spa");
            NativeEffects.boost(world, attacker, "spa", -1);
            weakened = NativeEffects.stage(NativeEffects.read(world, attacker), "spa") < before;
        }
        // Presentation only. The event source is the attacker, so `source` carries the attacker and
        // `target` carries the holder; the blow reaction reads on the holder, the seal on the attacker.
        var from = world.observe(attacker), holderPoint = body.position();
        if (from === null) return;
        var point = from.position();
        if (cursed) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "sentence", target: String(holder.ref()) }, 55);
            WorldFeedback.text(world, above(holderPoint), TEXT_BLOW, [], 40);
            WorldFeedback.text(world, above(point), TEXT_SENTENCE, [], 40);
        }
        if (weakened) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "weaken" }, 40);
            WorldFeedback.text(world, above(point).plus(WorldCombat.point(0, 0.4, 0)), TEXT_WEAKEN, [], 40);
        }
    }

    function release(context: NativeAbilities.Context, value: any): void {
        if (value.engaged) {
            var world = context.world, holder = context.actor;
            if (world === null || holder === null) return;
            var seen = world.observe(holder);
            if (seen !== null) WorldFeedback.keep(world, "aura", SCENE, 1, seen.position(), { moment: "aura" }, 40);
            return;
        }
        if (context.actor === null) return;
        delete spent[String(context.actor.ref())];
    }

    function expire(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== DOOM) return;
        var world = event.world(), bearer = event.actor();
        var effect = world.mobEffect(bearer, DOOM);
        if (effect === null) return;
        if (String(bearer.domain()) === "cobblemon") {
            var state = NativeEffects.read(world, bearer);
            if (state.lastHit >= 0 && world.tick() - state.lastHit > NativeSemantics.encounterIdle) {
                world.removeMobEffect(bearer, DOOM, effect.key());
                var freed = world.observe(bearer);
                if (freed !== null) {
                    WorldFeedback.emit(world, SCENE, 1, freed.position(), { moment: "lift", target: String(bearer.ref()) }, 40);
                    WorldFeedback.text(world, above(freed.position()), TEXT_LIFT, [], 40);
                }
                return;
            }
        }
        var body = world.observe(bearer);
        if (body === null) return;
        var bearerRef = String(bearer.ref()), point = body.position();
        if (effect.duration() <= 5) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "doom" }, 55);
            WorldFeedback.text(world, above(point), TEXT_DOOM, [], 45);
            if (body.health() > 0) world.health(bearer, -body.health(), "world_combat:perishbody");
            return;
        }
        // The countdown mark is renewed every 20 ticks; the last 3 s switch to the urgent read.
        if (world.tick() % 20 === 0) {
            WorldFeedback.keep(world, "curse:" + bearerRef, SCENE, 1, point,
                { moment: effect.duration() <= 60 ? "imminent" : "curse", target: bearerRef }, 40);
        }
    }

    NativeAbilities.define("perishbody", {}, { pulse: release });
    NativeAbilityRecipes.on("perishbody", "sentence", sentence);
    NativeAbilities.bind("world_combat:ability_perishbody", "world_combat:damage_applied", "sentence",
        "", function (event) { return event.target(); });
    WorldCombat.on("world_combat:ability_perishbody/tick", "world_combat:mob_effect_tick", "", expire);
}
