/**
 * Klutz cannot use what it carries. The holder is always a Pokemon, so this self effect works
 * directly with the Pokemon item system instead of a generic "cannot use item" path.
 *
 * Main path (self): while the holder actually holds an item, the individual flag that hides the
 * held item from every native item rule is set, so no held-item effect, restriction or hook can
 * fire for it. That is the native Klutz drawback, expressed through the existing item pipeline.
 *
 * Pokemon layer: because it fights unburdened, the holder keeps the beneficial MC MobEffect
 * world_combat:klutz_unburdened alive (refreshed every pulse): +15% movement speed and +25 to the
 * native world_combat:skill_haste value, i.e. noticeably faster and quicker to act. With no item
 * held there is no drawback, so the flag is cleared and the buff is not applied.
 *
 * Numbers: +15% speed / +25 skill haste is the payoff for losing every held item; the buff is
 * refreshed every 20 ticks with a 40 tick life so it simply tracks the item being held.
 * Source: Cobblemon/Bulbapedia Klutz ignores the holder's held item.
 *
 * Presentation: the pulse edge between carried and empty announces the buff starting (`unburden`)
 * or dropping (`burdened`) with one client scene and one line of text each; the buff itself keeps
 * a sparse foot-level `unburdened` aura. The edge is read from the previous itemsSuppressed value,
 * so the two discrete moments fire once per change instead of every pulse. Numbers and judgement
 * are unchanged.
 */
namespace WorldCombatAbilityKlutz {
    var EFFECT = "world_combat:klutz_unburdened";
    var EFFECT_TICKS = 40;
    var SCENE = "world_combat:ability_klutz";
    var TEXT_UNBURDEN = "world_combat.ability.klutz.text.unburden";
    var TEXT_BURDENED = "world_combat.ability.klutz.text.burdened";
    var FEEDBACK_TICKS = 30;

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function flash(world: CombatWorld, holder: CombatActor, moment: string, key: string, ticks: number): void {
        var body = world.observe(holder);
        if (body === null) return;
        var point = body.position();
        WorldFeedback.emit(world, SCENE, 1, point, { moment: moment }, ticks);
        WorldFeedback.text(world, above(point), key, [], ticks);
    }

    function fumble(context: NativeAbilities.Context, value: any): void {
        var world = context.world, self = context.actor;
        if (world === null || self === null) return;
        // The previous pulse's value is the only record of the buff's edge; read it before overwriting.
        var wasActive = context.state.flags.itemsSuppressed ? true : false;
        if (!String(context.pokemon.heldItem())) {
            context.state.flags.itemsSuppressed = 0;
            if (wasActive) flash(world, self, "burdened", TEXT_BURDENED, FEEDBACK_TICKS);
            return;
        }
        context.state.flags.itemsSuppressed = 1;
        MobEffects.apply(world, self, EFFECT, EFFECT_TICKS, 0);
        var body = world.observe(self);
        if (body === null) return;
        var point = body.position();
        if (!wasActive) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "unburden" }, 40);
            WorldFeedback.text(world, above(point), TEXT_UNBURDEN, [], 40);
        }
        WorldFeedback.keep(world, "klutz_unburdened", SCENE, 1, point, { moment: "unburdened" }, 40);
    }

    NativeAbilities.define("klutz", {}, { pulse: fumble });
}
