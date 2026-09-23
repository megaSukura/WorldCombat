/** Common access to Minecraft's real MobEffect instances; stacking, cures and saving stay native.
 *
 * Two native facts matter for authors:
 *  - Applying an existing id follows native strength/duration stacking, including hidden weaker effects.
 *    Use `set` for an exact replacement, such as lowering a counter or discarding its previous native stack.
 *  - Minecraft multiplies an effect's attribute modifiers by `amplifier + 1`. A status identity used as a counter
 *    therefore carries no attribute modifier; a visible slow/speed buff lives on its own amplifier-0 effect.
 */
namespace MobEffects {
    /** One observed native application. A refresh/replacement is a new owner, even when its id stays the same. */
    export interface Anchor { id: string; key: string; }
    export function anchor(value: CombatMobEffect): Anchor { return { id: String(value.id()), key: String(value.key()) }; }
    export function matches(world: CombatWorld, actor: CombatActor, value: Anchor): boolean {
        const current = read(world, actor, value.id);
        return current !== null && String(current.key()) === value.key;
    }
    export function validAnchor(value: Anchor): boolean {
        return !!value && typeof value.id === "string" && /^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(value.id)
            && typeof value.key === "string" && !!value.key;
    }
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
    /** Opt in to this action/effect's resource cleanup after applying a carrier. Tokens are transient JSON-safe numbers.
     * Rebinding takes ownership from the previous token; native refresh/replacement also makes an old token inactive. */
    export function bind(world: CombatWorld, actor: CombatActor, id: string, observed?: CombatMobEffect | null): number {
        const value = observed === undefined ? read(world, actor, id) : observed;
        return value === null ? 0 : world.leaseMobEffect(actor, id, value.key());
    }
    export function present(world: CombatWorld, token: number): boolean {
        return typeof token === "number" && token > 0 && world.mobEffectLeasePresent(token);
    }
    export function release(world: CombatWorld, token: number): boolean {
        return typeof token === "number" && token > 0 && world.releaseMobEffectLease(token);
    }
    /** Replace the native stack with this exact application, including when its amplifier is lower. */
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
