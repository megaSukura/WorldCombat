/**
 * Battle Armor turns heavy blows aside and forbids native critical hits.
 *
 * General path (any combatant): a blow that would remove at least 20% of the holder's maximum
 * health is blunted by 25% before it lands, and the holder receives the beneficial MC MobEffect
 * `world_combat:battlearmor_brace` for 40 ticks, which adds +3 armor and +2 armor toughness.
 * This runs in the shared incoming-damage pipeline, so a Pokemon move, a player's axe, an
 * arrow or another mod's weapon is reduced by the same rule.
 *
 * Pokemon layer: the trait declares `criticalImmune`, read by the shared damage composition
 * (`PokemonDamage.resolve`) so a Cobblemon attacker can never land a critical hit. Criticals are
 * a Pokemon move concept, so this half has no non-Pokemon equivalent.
 *
 * Numbers: the original is full critical immunity. In instant combat a fixed 25% cut on big hits
 * gives non-Pokemon attackers an observable answer while leaving chip damage untouched; the 20%
 * threshold makes the shell react to real swings, not to every scratch. The 40-tick brace is the
 * visible shield; the 20-tick feedback throttle keeps a combo from stacking banners.
 * Source: Cobblemon/Bulbapedia Battle Armor is critical-hit immunity.
 *
 * Presentation: `brace` fires whenever a heavy hit is blunted and floats the mitigated amount;
 * `shell` is a low engaged aura. The critical immunity has no separate beat because it leaves no
 * event of its own; the mitigated damage number is the visible proof.
 */
namespace WorldCombatAbilityBattleArmor {
    var BRACE = "world_combat:battlearmor_brace";
    var SCENE = "world_combat:ability_battlearmor";
    var THRESHOLD = 0.2;
    var BLUNT = 0.25;
    var BRACE_TICKS = 40;
    var THROTTLE = 20;
    var FEEDBACK_TICKS = 30;
    var TEXT_BRACE = "world_combat.ability.battlearmor.text.brace";
    var recent: { [ref: string]: number } = {};

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function plate(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event, holder = event.target();
        if (holder === null || String(holder.domain()) !== "cobblemon") return;
        if (String(event.actor().key()) === String(holder.key())) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.amount > 0) || data.bypassesInvulnerability) return;
        var body = world.observe(holder);
        if (body === null || data.amount < body.maxHealth() * THRESHOLD) return;
        var before = data.amount;
        data.amount = Math.max(0, data.amount * (1 - BLUNT));
        event.data(JSON.stringify(data));
        var now = world.tick(), ref = String(holder.ref());
        if (now - (recent[ref] || -1000) < THROTTLE) return;
        recent[ref] = now;
        if (MobEffects.apply(world, holder, BRACE, BRACE_TICKS, 0) === null) return;
        var point = body.position();
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "brace", target: ref }, 40);
        WorldFeedback.text(world, above(point), TEXT_BRACE, [Math.round((before - data.amount) * 10) / 10], FEEDBACK_TICKS);
    }

    function shell(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null || !value.engaged) return;
        var body = world.observe(holder);
        if (body === null) return;
        WorldFeedback.keep(world, "shell", SCENE, 1, body.position(), { moment: "shell" }, 40);
    }

    NativeAbilities.define("battlearmor", { criticalImmune: true }, { incoming: plate, pulse: shell });
    NativeAbilities.bind("world_combat:ability_battlearmor", "world_combat:damage_incoming", "incoming",
        "world_combat:effects_incoming", function (event) { return event.target(); });
}
