import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const owned = 'content/mechanisms/combat-copies.ts';
const program = ts.createProgram(['sdk/core/index.d.ts', 'sdk/core/world.d.ts', 'content/protocols/effects.ts',
    'content/mechanisms/mob-effects.ts', owned], { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None,
    lib: ['lib.es5.d.ts'], strict: true, noEmit: true });
const diagnostics = ts.getPreEmitDiagnostics(program).filter(row => row.file && row.file.fileName.replaceAll('\\', '/') === owned);
assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: value => value, getNewLine: () => '\n'
}));

// Neutral host contract: production callbacks own transient native modifiers; equipment changes stay external.
function harness() {
    const definitions = new Map(), handlers = new Map(), effects = new Map(), values = new Map(), carriers = new Map();
    let next = 0, rejectCas = false;
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
    function arithmetic(id, excluding) {
        const attribute = values.get(id); if (!attribute) return null;
        let result = attribute.base + attribute.equipment, slope = attribute.slope ?? 1;
        for (const effect of effects.values()) for (const modifier of effect.modifiers)
            if (effect.id !== excluding && modifier.id === id && modifier.operation === 'add_value') result += modifier.amount;
        for (const effect of effects.values()) for (const modifier of effect.modifiers)
            if (effect.id !== excluding && modifier.id === id && modifier.operation === 'add_multiplied_total') { result *= 1 + modifier.amount; slope *= 1 + modifier.amount; }
        const raw = result * (attribute.slope ?? 1);
        return { raw, slope, value: Math.max(attribute.min ?? -Infinity, Math.min(attribute.max ?? Infinity, raw)) };
    }
    const value = id => arithmetic(id)?.value;
    const world = owner => ({
        attributeValue(_actor, id, excluding) { const row = arithmetic(id, excluding ? owner : undefined); return row ? { value: () => row.value, base: () => values.get(id).base,
            unclampedValue: () => row.raw, additionMultiplier: () => row.slope } : null; },
        attribute: (_actor, id, amount, operation) => { if (!values.has(id)) return false; const effect = effects.get(owner);
            effect.modifiers = effect.modifiers.filter(value => value.id !== id); effect.modifiers.push({ id, amount, operation }); return true; },
        effects: (_actor, definition) => [...effects.values()].filter(effect => effect.definition === definition)
            .map(effect => ({ id: () => effect.id, data: () => effect.state, remaining: () => effect.ticks })),
        operation: (id, operation) => { if (!effects.has(id)) return false; invoke(id, `operation:${operation}`); return true; },
        compareEffectStates(json) { const rows = JSON.parse(json).updates;
            if (rejectCas || rows.some(row => effects.get(row.id)?.state !== row.expected)) return false;
            const pending = rows.map(row => ({ effect: effects.get(row.id), data: definitions.get(effects.get(row.id).definition).normalize(row.data) }));
            pending.forEach(row => row.effect.state = row.data); return true; },
        effect(definition, _actor, json, ticks) {
            const registry = definitions.get(definition); assert(ticks >= 1 && ticks <= registry.maximum);
            const id = ++next; effects.set(id, { id, definition, ticks, state: registry.normalize(json), modifiers: [], timers: [] });
            invoke(id, 'start'); return id;
        }
    });
    function invoke(id, name) {
        const effect = effects.get(id); assert(effect);
        handlers.get(`${effect.definition}/${name}`)({ id: () => id, world: () => world(id), target: () => actor,
            state(data) { if (data !== undefined) effect.state = definitions.get(effect.definition).normalize(data); return effect.state; },
            remaining(ticks) { if (ticks !== undefined) effect.ticks = ticks; return effect.ticks; }, end: () => effects.delete(id), listen() {},
            schedule: (_key, handler) => effect.timers.push(handler) });
    }
    return { api: context.CombatCopies, world: world(0), actor, values, carriers, effects, value, invoke, rejectCas: value => rejectCas = value };
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

test('additive equalization compensates native multipliers including zero starting values', () => {
    const h = harness(), id = 'checks:armour'; h.values.set(id, { base: 0, equipment: 0, slope: 2 });
    const layer = h.api.equalize(h.world, h.actor, { [id]: 8 }, 100, 'checks:share');
    assert(layer > 0); assert.equal(h.value(id), 8);
    h.values.get(id).equipment = 3; assert.equal(h.value(id), 14, 'Later equipment retains its native contribution');
    h.invoke(layer, 'operation:world_combat:dispel'); assert.equal(h.value(id), 6);
});

test('the ordinary copy route also compensates a zero starting value with external multipliers', () => {
    const h = harness(), id = 'checks:armour'; h.values.set(id, { base: 0, equipment: 0, slope: 2 });
    const layer = h.api.apply(h.world, h.actor, { [id]: 8 }, 100, 'checks:copy');
    assert.equal(h.value(id), 8); h.values.get(id).equipment = 3; assert.equal(h.value(id), 14);
    h.invoke(layer, 'operation:world_combat:dispel'); assert.equal(h.value(id), 6);
});

test('a native zero multiplier refuses the complete equalization instead of reporting partial success', () => {
    const h = harness(); h.values.set('checks:first', { base: 2, equipment: 0 });
    h.values.set('checks:closed', { base: 4, equipment: 0, slope: 0 });
    const layer = h.api.equalize(h.world, h.actor, { 'checks:first': 10, 'checks:closed': 8 }, 100, 'checks:share');
    assert.equal(layer, -1); assert.equal(h.value('checks:first'), 2); assert.equal(h.value('checks:closed'), 0);
});

test('prepared replacement preserves the old owner during native gates and excludes only its contribution', () => {
    const h=harness(), id='checks:armor';h.values.set(id,{base:2,equipment:0});
    const old=h.api.apply(h.world,h.actor,{[id]:8},60,'checks:copy');
    const foreign=h.api.apply(h.world,h.actor,{[id]:16},80,'checks:other');
    h.values.get(id).equipment=1;
    const before=h.effects.get(old).state, plan=h.api.prepare(h.world,h.actor,{[id]:10},120,'checks:copy');
    assert(plan);assert.equal(h.value(id),24);assert.equal(h.effects.get(old).state,before);assert.equal(h.effects.get(old).ticks,60);
    h.values.get(id).equipment=2;
    h.carriers.set('checks:new_carrier','new-application');
    assert.equal(h.api.replace(h.world,plan,{id:'checks:new_carrier',key:'new-application'}),old);
    assert.equal(h.value(id),10);assert(h.effects.has(foreign));assert.equal(h.effects.get(old).ticks,120);
    h.invoke(old,'operation:world_combat:dispel');assert.equal(h.value(id),8,'Foreign multiplier and equipment survive');
});
test('missing attributes, zero slopes and native clamps leave old state and contributions intact', () => {
    const h=harness(),id='checks:armor';h.values.set(id,{base:2,equipment:0,max:10});
    const old=h.api.equalize(h.world,h.actor,{[id]:6},90,'checks:copy'),state=h.effects.get(old).state;
    assert.equal(h.api.prepare(h.world,h.actor,{[id]:20},100,'checks:copy'),null);
    assert.equal(h.api.prepare(h.world,h.actor,{[id]:8,'checks:absent':1},100,'checks:copy'),null);
    assert.equal(h.value(id),6);assert.equal(h.effects.get(old).state,state);
    h.values.get(id).slope=0;
    assert.equal(h.api.prepare(h.world,h.actor,{[id]:8},100,'checks:copy'),null);
    assert.equal(h.effects.get(old).state,state);assert.equal(h.effects.get(old).ticks,90);
});
test('CAS or carrier refusal restores exact old coefficients and never clears the old layer', () => {
    const h=harness(),id='checks:armor';h.values.set(id,{base:2,equipment:0});
    const old=h.api.apply(h.world,h.actor,{[id]:8},90,'checks:copy'),state=h.effects.get(old).state;
    const plan=h.api.prepare(h.world,h.actor,{[id]:12},120,'checks:copy');h.rejectCas(true);
    assert.equal(h.api.replace(h.world,plan),-1);assert.equal(h.value(id),8);assert.equal(h.effects.get(old).state,state);
    h.rejectCas(false);assert.equal(h.api.replace(h.world,plan,{id:'checks:missing',key:'missing'}),-1);
    assert.equal(h.value(id),8);assert.equal(h.effects.get(old).ticks,90);
});
test('fresh preparation contributes zero, unused plans end, and stale plans cannot overwrite a later replacement', () => {
    const h=harness(),id='checks:armor';h.values.set(id,{base:0,equipment:0,slope:2});
    const fresh=h.api.prepare(h.world,h.actor,{[id]:6},100,'checks:copy');assert(fresh);assert.equal(h.value(id),0);
    h.api.discard(h.world,fresh);assert.equal(h.effects.size,0);
    const first=h.api.prepare(h.world,h.actor,{[id]:6},100,'checks:copy');assert(h.api.replace(h.world,first)>0);
    const earlier=h.api.prepare(h.world,h.actor,{[id]:8},100,'checks:copy');
    const later=h.api.prepare(h.world,h.actor,{[id]:10},100,'checks:copy');assert(h.api.replace(h.world,later)>0);
    assert.equal(h.api.replace(h.world,earlier),-1);assert.equal(h.value(id),10);
    const unused=h.api.prepare(h.world,h.actor,{[id]:4},100,'checks:unused');h.invoke(unused.id,'carrier');
    assert.equal(h.api.replace(h.world,unused),-1);assert.equal(h.value(id),10);
});
