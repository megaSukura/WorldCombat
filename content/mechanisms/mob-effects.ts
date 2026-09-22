/** Common access to Minecraft's real MobEffect instances; stacking, cures and saving stay native.
 *
 * Two native facts matter for authors:
 *  - Re-applying the same id only refreshes its duration; the amplifier is not raised. Use `set` when a counter
 *    carried in the amplifier must go up.
 *  - Minecraft multiplies an effect's attribute modifiers by `amplifier + 1`. A status identity used as a counter
 *    therefore carries no attribute modifier; a visible slow/speed buff lives on its own amplifier-0 effect.
 */
namespace MobEffects {
    export function read(world: CombatWorld, actor: CombatActor, id: string): CombatMobEffect | null {
        return world.mobEffect(actor, id);
    }
    export function all(world: CombatWorld, actor: CombatActor): readonly CombatMobEffect[] {
        return world.valid(actor) ? world.mobEffects(actor) : [];
    }
    /** Effects carrying a registry tag; shared status identity is `StatusVocabulary.tag(name)` (see CombatStatus). */
    export function tagged(world: CombatWorld, actor: CombatActor, tag: string): CombatMobEffect[] {
        return all(world, actor).filter(function (effect) { return effect.tagged(tag); });
    }
    export function hasTag(world: CombatWorld, actor: CombatActor, tag: string): boolean { return tagged(world, actor, tag).length > 0; }
    export function apply(world: CombatWorld, actor: CombatActor, id: string, ticks: number, amplifier = 0): CombatMobEffect | null {
        if (!world.valid(actor)) return null;
        if (ticks !== -1 && (!isFinite(ticks) || ticks < 1 || ticks % 1)) throw new Error("Effect duration must be positive ticks or -1");
        world.marker(actor, id, ticks, amplifier); return read(world, actor, id);
    }
    /** Remove then apply, so a raised amplifier (a counter layer) actually lands instead of only refreshing duration. */
    export function set(world: CombatWorld, actor: CombatActor, id: string, ticks: number, amplifier = 0): CombatMobEffect | null {
        if (!world.valid(actor)) return null;
        consume(world, actor, id);
        return apply(world, actor, id, ticks, amplifier);
    }
    /** Consumers settle only after successfully removing the observed native instance. */
    export function consume(world: CombatWorld, actor: CombatActor, id: string): CombatMobEffect | null {
        const value = read(world, actor, id);
        return value && world.removeMobEffect(actor, id, value.key()) ? value : null;
    }
    /** Consume every effect carrying the tag, whichever unit produced it; returns the removed instances. */
    export function consumeTagged(world: CombatWorld, actor: CombatActor, tag: string): CombatMobEffect[] {
        return tagged(world, actor, tag).filter(function (effect) { return world.removeMobEffect(actor, effect.id(), effect.key()); });
    }
    /** Behavior hooks can react to actual events without creating a second status instance. */
    export function react(id: string, effect: string, topic: string,
        recipient: (event: CombatWorldEvent) => CombatActor | null,
        run: (event: CombatWorldEvent, actor: CombatActor, state: CombatMobEffect) => void, after = ""): void {
        WorldCombat.on(id, topic, after, event => {
            const actor = recipient(event);
            if (!actor || !event.world().valid(actor)) return;
            const state = read(event.world(), actor, effect);
            if (state) run(event, actor, state);
        });
    }
    /** Like `react`, keyed by tag: runs once per event with the first effect carrying the tag. */
    export function reactTagged(id: string, tag: string, topic: string,
        recipient: (event: CombatWorldEvent) => CombatActor | null,
        run: (event: CombatWorldEvent, actor: CombatActor, state: CombatMobEffect) => void, after = ""): void {
        WorldCombat.on(id, topic, after, event => {
            const actor = recipient(event);
            if (!actor || !event.world().valid(actor)) return;
            const states = tagged(event.world(), actor, tag);
            if (states.length) run(event, actor, states[0]);
        });
    }
}
