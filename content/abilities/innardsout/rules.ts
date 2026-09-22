/**
 * Innards Out bursts when the holder falls, throwing the health it still had at the killer.
 *
 * General path (any combatant): while the holder is hit, the health it had before each hit
 * and its position are remembered. On the hit that drops it to zero, the fatal attacker
 * receives a delayed world process (`world_combat:innards_out_burst`). That process leaves
 * a short-lived helper body at the fall spot, waits 12 ticks, then returns the remembered
 * health as native damage through the common health path. The killer can still survive it,
 * but a huge finishing blow can be punished.
 * Pokemon layer: if the killer is a Cobblemon individual, one point of PP is drained from
 * its first move that still has PP. That uses the Pokemon-only PP resource through the
 * native compare-and-write, so an unlucky killer loses part of its next move.
 * Balance: the returned amount is the remembered health, which is at most the fatal blow's
 * damage. No arbitrary fraction is added; the 12-tick delay and the single burst are the
 * levers that replace the original turn-order reflex.
 *
 * Presentation: the process publishes the client scene `world_combat:ability_innardsout`.
 * `fall` plays at the fall spot when the gout leaves the body, `burst` plays on the killer when
 * the delayed damage lands, and `drain` plays on a Pokemon killer whose PP is eaten. Each of the
 * three floats one localized line; the numbers and rolls are unchanged.
 */
namespace WorldCombatAbilityInnardsOut {
    var BURST = "world_combat:innards_out_burst";
    var DELAY = 12;
    var SCENE = "world_combat:ability_innardsout";
    var TEXT_FALL = "world_combat.ability.innardsout.text.fall";
    var TEXT_BURST = "world_combat.ability.innardsout.text.burst";
    var TEXT_DRAIN = "world_combat.ability.innardsout.text.drain";
    interface Pending { attacker: string; health: number; point: number[]; }
    var pending: { [ref: string]: Pending } = {};

    function mark(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event, holder = event.target();
        if (holder === null || !world.valid(event.actor())) return;
        if (String(event.actor().key()) === String(holder.key())) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.amount > 0)) return;
        var body = world.observe(holder);
        if (!body || body.health() <= 0) return;
        pending[String(holder.ref())] = { attacker: String(event.actor().ref()), health: body.health(),
            point: [body.position().x(), body.position().y(), body.position().z()] };
    }

    function normalize(json: string): string {
        var value = JSON.parse(json);
        if (typeof value.damage !== "number" || !isFinite(value.damage) || value.damage < 0) throw new Error("Invalid innards damage");
        if (!Array.isArray(value.point) || value.point.length !== 3 ||
            value.point.some(function (n: any) { return typeof n !== "number" || !isFinite(n); })) throw new Error("Invalid innards point");
        return JSON.stringify(value);
    }

    // Returns whether a point of PP was actually spent, so presentation can report the drain.
    function drain(world: CombatWorld, attacker: CombatActor): boolean {
        if (String(attacker.domain()) !== "cobblemon") return false;
        var pokemon = CobblemonCombat.pokemon(attacker);
        for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
            var move = pokemon.move(slot);
            if (move === null || move.pp() <= 0) continue;
            CobblemonCombat.pp(world, attacker, slot, String(move.key()), move.pp(), move.pp() - 1);
            return true;
        }
        return false;
    }

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function burst(event: CombatWorldEvent): void {
        var holder = event.target();
        if (holder === null) return;
        var key = String(holder.ref()), entry = pending[key];
        if (!entry) return;
        delete pending[key];
        var data = JSON.parse(String(event.data()));
        if (!(data.after <= 0)) return;
        var world = event.world(), attacker = world.actor(entry.attacker);
        if (attacker === null || !world.valid(attacker) || entry.health <= 0) return;
        world.effect(BURST, attacker, JSON.stringify({ damage: entry.health, point: entry.point }), 60);
    }

    WorldCombat.effect(BURST, 1, 120, "actor", normalize, EffectProtocols.unchanged);
    WorldCombat.effectHandler(BURST, "start", function (effect) {
        var world = effect.world(), state = JSON.parse(effect.state()), shard: CombatActor | null = null;
        // The helper is the visible gout; if the spot is occupied the burst still settles.
        try {
            shard = world.helper(WorldCombat.point(state.point[0], state.point[1] + 1.2, state.point[2]), 1,
                '{"kind":"innards_out"}', 40);
        } catch (error) { shard = null; }
        state.shard = shard === null ? "" : String(shard.ref());
        effect.state(JSON.stringify(state));
        effect.schedule("burst", "burst", DELAY, "{}");
        // The gout leaves the body at the fall spot; the process source is the killer, so bind point.
        try {
            if (world.valid(effect.source())) {
                var fall = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
                WorldFeedback.emit(world, SCENE, 1, fall, { moment: "fall" }, 50);
                WorldFeedback.text(world, above(fall), TEXT_FALL, [], 45);
            }
        } catch (error) { /* presentation only; the scheduled burst must still settle */ }
    });
    WorldCombat.effectHandler(BURST, "burst", function (effect) {
        var world = effect.world(), state = JSON.parse(effect.state()), target = effect.target();
        try {
            if (world.valid(target) && state.damage > 0) {
                var killer = String(target.ref()), body = world.observe(target);
                // A killer that falls to the recoil has no anchor left; its own death is the feedback.
                var point = body === null ? null : body.position();
                var returned = world.health(target, -state.damage, "world_combat:innardsout");
                var drained = world.valid(target) && drain(world, target);
                if (point !== null && world.valid(target)) {
                    WorldFeedback.emit(world, SCENE, 1, point, { moment: "burst", target: killer }, 40);
                    WorldFeedback.text(world, above(point), TEXT_BURST,
                        [Math.round((returned < 0 ? -returned : returned) * 10) / 10], 40);
                }
                if (drained && point !== null) {
                    WorldFeedback.emit(world, SCENE, 1, point, { moment: "drain", target: killer }, 30);
                    WorldFeedback.text(world, above(point), TEXT_DRAIN, [], 40);
                }
            }
        } finally {
            if (state.shard) {
                var shard = world.actor(state.shard);
                if (shard !== null) world.removeHelper(shard);
            }
            effect.end();
        }
    });
    NativeAbilityRecipes.on("innardsout", "mark", mark);
    NativeAbilities.bind("world_combat:ability_innardsout", "world_combat:damage_incoming", "mark",
        "world_combat:effects_incoming", function (event) { return event.target(); });
    WorldCombat.on("world_combat:ability_innardsout_burst", "world_combat:damage_applied", "", burst);
}
