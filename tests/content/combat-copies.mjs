import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Neutral host contract: production callbacks own transient native modifiers; equipment changes stay external.
function harness() {
    const definitions = new Map(), handlers = new Map(), effects = new Map(), values = new Map(), carriers = new Map();
    let next = 0;
    const actor = { key: () => 'checks:actor' };
    const context = vm.createContext({ EffectProtocols: { unchanged: value => value },
        MobEffects: { validAnchor: value => !!value?.id && !!value?.key,
            matches: (_world, _actor, value) => carriers.get(value.id) === value.key, bind() {} },
        WorldCombat: {
            effect(id, _schema, maximum, _lifetime, normalize) { definitions.set(id, { maximum, normalize }); },
            effectHandler(id, name, callback) { handlers.set(`${id}/${name}`, callback); }
        }
    });
    vm.runInContext(ts.transpileModule(fs.readFileSync('content/mechanisms/combat-copies.ts', 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None }
    }).outputText, context);
    function value(id) {
        const attribute = values.get(id); if (!attribute) return null;
        let result = attribute.base + attribute.equipment;
        for (const effect of effects.values()) for (const modifier of effect.modifiers)
            if (modifier.id === id && modifier.operation === 'add_value') result += modifier.amount;
        for (const effect of effects.values()) for (const modifier of effect.modifiers)
            if (modifier.id === id && modifier.operation === 'add_multiplied_total') result *= 1 + modifier.amount;
        return result;
    }
    const world = owner => ({
        attributeValue: (_actor, id) => values.has(id) ? { value: () => value(id), base: () => values.get(id).base } : null,
        attribute: (_actor, id, amount, operation) => { effects.get(owner).modifiers.push({ id, amount, operation }); return true; },
        effects: (_actor, definition) => [...effects.values()].filter(effect => effect.definition === definition)
            .map(effect => ({ id: () => effect.id, data: () => effect.state })),
        operation: (id, operation) => { invoke(id, `operation:${operation}`); return true; },
        effect(definition, _actor, json, ticks) {
            const registry = definitions.get(definition); assert(ticks >= 1 && ticks <= registry.maximum);
            const id = ++next; effects.set(id, { id, definition, ticks, state: registry.normalize(json), modifiers: [], timers: [] });
            invoke(id, 'start'); return id;
        }
    });
    function invoke(id, name) {
        const effect = effects.get(id); assert(effect);
        handlers.get(`${effect.definition}/${name}`)({ world: () => world(id), target: () => actor,
            state: () => effect.state, end: () => effects.delete(id), listen() {},
            schedule: (_key, handler) => effect.timers.push(handler) });
    }
    return { api: context.CombatCopies, world: world(0), actor, values, carriers, effects, value, invoke };
}

test('copy cleanup preserves subsequent equipment changes and never writes native base', () => {
    const h = harness(), id = 'checks:power'; h.values.set(id, { base: 2, equipment: 0 });
    const layer = h.api.apply(h.world, h.actor, { [id]: 6 }, 20000, 'checks:copy');
    assert.equal(h.effects.get(layer).ticks, 20000);
    assert.equal(h.value(id), 6);
    h.values.get(id).equipment = 1;
    assert.equal(h.value(id), 9);
    h.invoke(layer, 'operation:world_combat:dispel');
    assert.equal(h.value(id), 3);
    assert.equal(h.values.get(id).base, 2);
});

test('cleansing the exact carrier ends only its owned layer', () => {
    const h = harness(), id = 'checks:armour'; h.values.set(id, { base: 2, equipment: 0 });
    h.carriers.set('checks:carrier', 'application-1');
    const layer = h.api.apply(h.world, h.actor, { [id]: 8 }, 100, 'checks:copy', { id: 'checks:carrier', key: 'application-1' });
    h.values.get(id).equipment = 2;
    h.carriers.delete('checks:carrier'); h.invoke(layer, 'carrier');
    assert.equal(h.effects.has(layer), false);
    assert.equal(h.value(id), 4);
});

test('zero and negative native attributes are supported and restoration uses current facts', () => {
    const h = harness(), id = 'checks:signed_property'; h.values.set(id, { base: 0, equipment: 0 });
    const layer = h.api.apply(h.world, h.actor, { [id]: -4 }, 50, 'checks:copy');
    assert.equal(h.value(id), -4);
    h.values.get(id).equipment = 3;
    assert.equal(h.value(id), -1);
    h.invoke(layer, 'operation:world_combat:dispel');
    assert.equal(h.value(id), 3);
    assert.equal(h.values.get(id).base, 0);
});

test('reapplication replaces its prior layer and invalid duration does not destroy the valid one', () => {
    const h = harness(), id = 'checks:power'; h.values.set(id, { base: 2, equipment: 0 });
    const first = h.api.apply(h.world, h.actor, { [id]: 6 }, 50, 'checks:copy');
    const second = h.api.apply(h.world, h.actor, { [id]: 10 }, 80, 'checks:copy');
    assert(!h.effects.has(first)); assert(h.effects.has(second)); assert.equal(h.value(id), 10);
    assert.throws(() => h.api.apply(h.world, h.actor, { [id]: 12 }, 1200001, 'checks:copy'), /duration/);
    assert(h.effects.has(second)); assert.equal(h.value(id), 10);
});
