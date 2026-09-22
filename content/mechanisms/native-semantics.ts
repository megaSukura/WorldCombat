/** Shared world-combat design values. Each clock belongs to its mechanism, never to a synthetic turn. */
namespace NativeSemantics {
    /** Native attribute modifiers already include MC effects and compatible equipment/Mod bonuses. */
    export function physicalMultiplier(world: CombatWorld, actor: CombatActor): number {
        var damage = world.attributeValue(actor, "minecraft:generic.attack_damage");
        return damage === null || damage.base() <= 0 ? 1 : Math.max(0, damage.value() / damage.base());
    }
    export var navigationMultiplier = 0.4;
    export var encounterIdle = 600;
    export var burnInterval = 100;
    export var poisonInterval = 80;
    export var toxicInterval = 100;
    export var recoveryInterval = 100;
    export var accelerationInterval = 120;
    export var timingReferenceSpeed = 80;
    export function windup(action: CombatAction, move: CombatPokemonMove, baseline: number): number {
        var pokemon = CobblemonCombat.pokemon(action.actor()), state = NativeEffects.read(action.sense(), action.actor());
        var speed = NativeEffects.stat(pokemon, state, "spe") * NativeEffects.multiplier(NativeEffects.stage(state, "spe"));
        var scale = Math.max(0.75, Math.min(1.25, Math.sqrt(timingReferenceSpeed / Math.max(1, speed))));
        if (String(pokemon.status()) === "cobblemon:paralysis") scale *= 1.5;
        // Priority buys a shorter visible preparation window; it never reorders already committed hits.
        return Math.max(2, Math.round(baseline * scale / (1 + Math.max(0, move.priority()) * 0.25)));
    }
    /**
     * A move's own base accuracy shapes the authored trajectory before it is shown and launched; collision stays
     * authoritative. The accuracy/evasion *stages* are deliberately not folded in here: the shared hit resolution
     * (NativeEffects.hitChance, fed by NativeEffects.precision/evasion) charges them once, for native and script
     * damage alike, so a moved trajectory and a stage miss never punish the same hit twice.
     */
    export function aim(action: CombatAction, move: CombatPokemonMove, direction: CombatPoint, degreesPerDeficit: number): CombatPoint {
        var world = action.sense(), pokemon = CobblemonCombat.pokemon(action.actor()), state = NativeEffects.read(world, action.actor());
        var ability = NativeEffects.ability(pokemon, state), item = NativeEffects.item(pokemon, state);
        var precision = move.accuracy() <= 0 ? 100 : move.accuracy();
        if (item === "wide_lens") precision *= 1.1;
        var aiming = { precision: precision, category: String(move.category()), move: move };
        NativeAbilities.apply(world, action.actor(), "aim", aiming, state);
        var spread = Math.max(0, 100 - aiming.precision) * degreesPerDeficit * Math.PI / 180;
        if (spread === 0) return direction.unit();
        var angle = world.random() * Math.PI * 2, radius = Math.tan(Math.min(0.35, spread)) * Math.sqrt(world.random());
        var horizontal = WorldCombat.point(-direction.z(), 0, direction.x());
        if (horizontal.length() < 0.01) horizontal = WorldCombat.point(1, 0, 0);
        return direction.unit().plus(horizontal.unit().scale(Math.cos(angle) * radius)).plus(WorldCombat.point(0, Math.sin(angle) * radius, 0)).unit();
    }
}
