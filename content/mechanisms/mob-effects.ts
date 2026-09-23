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
    /** Native effects whose behavior is carried by the MobEffect itself. Identity-only script markers are excluded. */
    export function native(world: CombatWorld, actor: CombatActor, category?: string): CombatMobEffect[] {
        return all(world, actor).filter(effect => !effect.tagged("world_combat:status/identity_only")
            && (!category || String(effect.category()) === category));
    }
    /** A native level I counts once. Count each effect separately; callers choose the gameplay budget. */
    export function levels(world: CombatWorld, actor: CombatActor, category: string): number {
        return native(world, actor, category).reduce((total, effect) => total + Math.max(1, effect.amplifier() + 1), 0);
    }
    /** Remove observed native applications, settling only successful comparisons. */
    export function clear(world: CombatWorld, actor: CombatActor, category?: string): number {
        return native(world, actor, category).reduce((total, effect) =>
            total + (world.removeMobEffect(actor, effect.id(), effect.key()) ? Math.max(1, effect.amplifier() + 1) : 0), 0);
    }
    /** Reduce native strength within a level budget; an exact replacement discards that application's hidden stack. */
    export function reduce(world: CombatWorld, actor: CombatActor, category: string, budget: number): number {
        let removed = 0;
        native(world, actor, category).forEach(effect => {
            const take = Math.min(Math.max(0, Math.floor(budget - removed)), effect.amplifier() + 1);
            if (!take || !world.removeMobEffect(actor, effect.id(), effect.key())) return;
            if (take <= effect.amplifier()) apply(world, actor, effect.id(), effect.duration(), effect.amplifier() - take);
            removed += take;
        });
        return removed;
    }
    /** Copy live native behavior with its remaining clock. Existing stronger/longer native stacks remain authoritative. */
    export function copy(world: CombatWorld, from: CombatActor, to: CombatActor, category?: string, maximumTicks = 1200): number {
        if (!world.valid(to)) return 0;
        let changed = 0;
        native(world, from, category).forEach(effect => {
            const ticks = effect.duration() < 0 ? maximumTicks : Math.min(maximumTicks, effect.duration());
            const current = read(world, to, effect.id());
            if (current && (current.amplifier() > effect.amplifier() || current.amplifier() === effect.amplifier()
                && (current.duration() < 0 || current.duration() >= ticks))) return;
            const applied = apply(world, to, effect.id(), ticks, effect.amplifier());
            if (applied && applied.amplifier() >= effect.amplifier()) changed++;
        });
        return changed;
    }
    /** Move whole native applications within a level budget. The source is removed only after the recipient accepts it. */
    export function transferOne(world: CombatWorld, from: CombatActor, to: CombatActor, effect: CombatMobEffect): boolean {
        if (!world.valid(from) || !world.valid(to) || String(from.key()) === String(to.key())) return false;
        const observed = read(world, from, effect.id());
        if (!observed || String(observed.key()) !== String(effect.key()) || effect.tagged("world_combat:status/identity_only")) return false;
        const before = read(world, to, effect.id()), ticks = effect.duration();
        if (before && (before.amplifier() > effect.amplifier() || before.amplifier() === effect.amplifier()
            && (before.duration() < 0 || ticks >= 0 && before.duration() >= ticks))) return false;
        const applied = apply(world, to, effect.id(), ticks, effect.amplifier());
        return !!applied && applied.amplifier() >= effect.amplifier() && world.removeMobEffect(from, effect.id(), effect.key());
    }
    /** Transfer complete native effects in snapshot order until the content's budget is used. */
    export function transfer(world: CombatWorld, from: CombatActor, to: CombatActor, budget: number, category = "beneficial"): number {
        let moved = 0;
        native(world, from, category).forEach(effect => {
            const cost = Math.max(1, effect.amplifier() + 1);
            if (cost > budget - moved) return;
            if (transferOne(world, from, to, effect)) moved += cost;
        });
        return moved;
    }
    /** Explicit inverse pairs, extendable by content. Unknown effects keep their own meaning. */
    export const inverses: { [id: string]: string } = {
        "minecraft:speed": "minecraft:slowness", "minecraft:slowness": "minecraft:speed",
        "minecraft:strength": "minecraft:weakness", "minecraft:weakness": "minecraft:strength",
        "minecraft:haste": "minecraft:mining_fatigue", "minecraft:mining_fatigue": "minecraft:haste",
        "minecraft:luck": "minecraft:unluck", "minecraft:unluck": "minecraft:luck"
    };
    export function invertible(world: CombatWorld, actor: CombatActor, category?: string): CombatMobEffect[] {
        return native(world, actor, category).filter(effect => !!inverses[String(effect.id())]);
    }
    export function invert(world: CombatWorld, actor: CombatActor, onlyGains: boolean): number {
        const removed = invertible(world, actor, onlyGains ? "beneficial" : undefined)
            .filter(effect => world.removeMobEffect(actor, effect.id(), effect.key()));
        // Remove the snapshot first so simultaneous opposite effects do not consume each other's replacement.
        removed.forEach(effect => apply(world, actor, inverses[String(effect.id())], effect.duration(), effect.amplifier()));
        return removed.length;
    }
    export interface FixedAttribute { id: string; amount: number; operation: "add_value" | "add_multiplied_base" | "add_multiplied_total"; }
    /** Project fixed modifiers while the observed carrier exists; amplifier remains available for another payload. */
    export function fixedAttributes(definition: string, carrier: string, attributes: FixedAttribute[]): void {
        const maximum = 1200000;
        WorldCombat.effect(definition, 1, maximum, "actor", json => {
            const value = JSON.parse(json);
            if (!validAnchor(value) || value.id !== carrier) throw new Error("Invalid fixed attribute carrier");
            return JSON.stringify(value);
        }, () => { throw new Error("Fixed attribute windows cannot migrate"); });
        function alive(effect: CombatEffect): boolean {
            const world = effect.world(), target = effect.target();
            if (!world.valid(target) || !matches(world, target, JSON.parse(String(effect.state())))) { effect.end(); return false; }
            const current = read(world, target, carrier)!;
            effect.remaining(current.duration() < 0 ? maximum : Math.max(1, Math.min(maximum, current.duration())));
            return true;
        }
        WorldCombat.effectHandler(definition, "start", effect => {
            if (!alive(effect)) return;
            attributes.forEach(attribute => effect.world().attribute(effect.target(), attribute.id, attribute.amount, attribute.operation));
            effect.schedule("watch", "watch", 1, "{}");
        });
        WorldCombat.effectHandler(definition, "watch", effect => {
            if (alive(effect)) effect.schedule("watch", "watch", 1, "{}");
        });
        WorldCombat.effectHandler(definition, "operation:world_combat:dispel", effect => effect.end());
        function synchronize(event: CombatWorldEvent): void {
            const world = event.world(), actor = event.actor();
            if (!world.valid(actor)) return;
            const current = read(world, actor, carrier), views = world.effects(actor, definition);
            if (current && views.some(view => matches(world, actor, JSON.parse(String(view.data()))))) return;
            views.forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
            if (current) world.effect(definition, actor, JSON.stringify(anchor(current)),
                current.duration() < 0 ? maximum : Math.max(1, Math.min(maximum, current.duration())));
        }
        WorldCombat.on(definition + "/bind", "world_combat:actor_bound", "", synchronize);
        ["added", "removed"].forEach(edge => WorldCombat.on(definition + "/" + edge, "world_combat:mob_effect_" + edge, "", event => {
            if (String(JSON.parse(String(event.data())).id) === carrier) synchronize(event);
        }));
    }
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
