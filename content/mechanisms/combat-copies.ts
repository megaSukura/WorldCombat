/** Temporary copies of observed native attributes. Each layer owns only its modifiers; native base values stay intact. */
namespace CombatCopies {
    export type Values = { [attribute: string]: number };
    export const attack = "minecraft:generic.attack_damage", speed = "minecraft:generic.movement_speed";
    export const defence = ["minecraft:generic.armor", "minecraft:generic.armor_toughness", "minecraft:generic.knockback_resistance"];
    export const attributes = [attack, speed].concat(defence);
    const definition = "world_combat:attribute_copy", resistance = "world_combat:damage_type_resistance";
    // EffectRegistry's public lifetime limit. Requests outside the host contract fail rather than being shortened.
    const maximumTicks = 1200000;
    function duration(ticks: number): number {
        if (!isFinite(ticks) || ticks < 1 || ticks % 1 || ticks > maximumTicks) throw new Error("Invalid combat copy duration");
        return ticks;
    }
    function validValues(values: Values): void {
        Object.keys(values).forEach(id => {
            if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id) || typeof values[id] !== "number" || !isFinite(values[id])) throw new Error("Invalid copied attribute");
        });
    }
    export function read(world: CombatWorld, actor: CombatActor, selected: string[] = attributes): Values {
        const values: Values = {};
        selected.forEach(id => { const attribute = world.attributeValue(actor, id); if (attribute) values[id] = attribute.value(); });
        return values;
    }
    export function differs(world: CombatWorld, actor: CombatActor, values: Values): boolean {
        return Object.keys(values).some(id => { const own = world.attributeValue(actor, id); return own !== null && Math.abs(own.value() - values[id]) > 0.0001; });
    }
    export function clear(world: CombatWorld, actor: CombatActor, source: string): void {
        world.effects(actor, definition).forEach(view => { if (JSON.parse(String(view.data())).source === source) world.operation(view.id(), "world_combat:dispel", "{}"); });
    }
    /** Ratios/deltas are fixed at application; later equipment and effects keep contributing and removal reveals current native values. */
    export function apply(world: CombatWorld, actor: CombatActor, values: Values, ticks: number, source: string, carrier?: MobEffects.Anchor): number {
        duration(ticks); validValues(values);
        clear(world, actor, source);
        return world.effect(definition, actor, JSON.stringify({ values, source, carrier }), ticks);
    }
    WorldCombat.effect(definition, 1, maximumTicks, "actor", function (json) {
        const value = JSON.parse(json), values = value.values || {};
        if (typeof value.source !== "string" || value.carrier && !MobEffects.validAnchor(value.carrier)) throw new Error("Invalid attribute copy owner");
        validValues(values);
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function watch(effect: CombatEffect): void {
        const state = JSON.parse(effect.state());
        if (state.carrier && !MobEffects.matches(effect.world(), effect.target(), state.carrier)) { effect.end(); return; }
        if (state.carrier) effect.schedule("carrier", "carrier", 1, "{}");
    }
    WorldCombat.effectHandler(definition, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        Object.keys(state.values).forEach(id => {
            const current = world.attributeValue(actor, id); if (!current) return;
            if (current.value() > 0) world.attribute(actor, id, state.values[id] / current.value() - 1, "add_multiplied_total");
            else if (state.values[id] !== current.value()) world.attribute(actor, id, state.values[id] - current.value(), "add_value");
        });
        if (state.carrier) MobEffects.bind(world, actor, state.carrier.id);
        watch(effect);
    });
    WorldCombat.effectHandler(definition, "carrier", watch);
    WorldCombat.effectHandler(definition, "operation:world_combat:dispel", effect => effect.end());

    /** Content supplies exact native damage ids and the multiplier; unrelated incoming damage stays unchanged. */
    export function resist(world: CombatWorld, actor: CombatActor, types: string[], fraction: number, ticks: number, source: string): number {
        duration(ticks);
        world.effects(actor, resistance).forEach(view => { if (JSON.parse(String(view.data())).source === source) world.operation(view.id(), "world_combat:dispel", "{}"); });
        return world.effect(resistance, actor, JSON.stringify({ types, fraction, source }), ticks);
    }
    WorldCombat.effect(resistance, 1, maximumTicks, "actor", function (json) {
        const value = JSON.parse(json);
        if (!Array.isArray(value.types) || value.types.some((id: any) => typeof id !== "string" || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id))
            || !isFinite(value.fraction) || value.fraction < 0 || value.fraction > 1 || typeof value.source !== "string") throw new Error("Invalid damage resistance");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(resistance, "start", effect => effect.listen("world_combat:incoming", "world_combat:intercept", "hit"));
    WorldCombat.effectHandler(resistance, "hit", function (effect) {
        const event = effect.event(); if (event.target().key() !== effect.target().key()) return;
        const damage = JSON.parse(event.payload()), state = JSON.parse(effect.state());
        if (damage.scripted === true || damage.kind || state.types.indexOf(String(damage.damageType)) < 0 || !(damage.amount > 0)) return;
        damage.amount *= state.fraction; event.payload(JSON.stringify(damage));
    });
    WorldCombat.effectHandler(resistance, "operation:world_combat:dispel", effect => effect.end());
}
