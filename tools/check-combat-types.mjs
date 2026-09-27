import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const definitions = new Map(), handlers = new Map(), noop = () => {};
const context = vm.createContext({ WorldCombat: { on: noop, event: noop, phase: noop,
  effect: (id, _v, _ticks, _life, normalize) => definitions.set(id, normalize),
  effectHandler: (id, topic, handler) => handlers.set(id + '/' + topic, handler) },
  CobblemonCombat: { pokemon: actor => { assert(actor.pokemon, 'Ordinary bodies never need native Pokemon access'); return actor.pokemon; },
    loadout: noop, typeEffectiveness: (attack, defence) => attack === 'grass' && defence === 'water' ? 2 : 1 } });
const files = ['content/protocols/effects.ts', 'content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts',
  'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/traits/composition.ts', 'content/traits/ability-recipes.ts',
  ...['formula', 'combatant-stats', 'combat-stages', 'mob-effects', 'combat-types', 'native-abilities', 'native-items', 'native-semantics',
    'native-modifiers', 'native-effects', 'world-environment', 'native-loadout', 'pokemon-damage', 'native-types'].map(id => 'content/mechanisms/' + id + '.ts')];
const owned = new Set(['content/mechanisms/combat-types.ts', 'content/mechanisms/native-types.ts']);
const program = ts.createProgram(['sdk/core/index.d.ts', 'sdk/core/world.d.ts', 'sdk/cobblemon/index.d.ts', ...files], {
  target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, lib: ['lib.es5.d.ts'], strict: true, noEmit: true
});
const diagnostics = ts.getPreEmitDiagnostics(program).filter(item => item.file && owned.has(item.file.fileName.replaceAll('\\', '/')));
assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
  getCurrentDirectory: () => process.cwd(), getCanonicalFileName: value => value, getNewLine: () => '\n'
}));
vm.runInContext(ts.transpileModule(files.map(file => fs.readFileSync(file, 'utf8')).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None }
}).outputText, context);
const T = context.CombatTypes, N = context.NativeEffects, D = context.PokemonDamage;
const actors = [];
function actor(id, domain = 'minecraft', base = []) {
  const value = { id, base, attack: 8, ability: '', live: true, domain: () => domain, ref: () => id, key: () => id, markers: new Map() };
  if (domain === 'cobblemon') value.pokemon = { level: () => 40, stat: () => 80, healthScale: () => 1,
    projectedArmor: () => 0, projectedToughness: () => 0, ability: () => value.ability, heldItem: () => '',
    typeCount: () => value.base.length, type: i => value.base[i], status: () => '', species: () => 'fixture:body',
    heldTag: () => false, canEvolve: () => false };
  actors.push(value); return value;
}
const source = actor('source', 'cobblemon', ['grass']), second = actor('second'), ordinary = actor('ordinary'),
  modded = actor('modded', 'fixture:boss'), native = actor('native', 'cobblemon', ['fire', 'flying']);
let serial = 0, carrierSerial = 0, records = [], checks = 0;
const view = record => ({ id: () => record.id, data: () => record.data, source: () => record.source,
  target: () => record.target, remaining: () => record.ticks });
function create(from, target, definition, data, ticks) {
  const record = { id: ++serial, source: from, target, definition, data: definitions.get(definition)(data), ticks, live: true };
  const effect = { id: () => record.id, source: () => from, target: () => target, world: () => world(from), schedule: noop,
    state(value) { if (value !== undefined) record.data = definitions.get(definition)(value); return record.data; },
    remaining(value) { if (value !== undefined) record.ticks = value; return record.ticks; }, end: () => { record.live = false; } };
  record.effect = effect; records.push(record); handlers.get(definition + '/start')?.(effect); return record.id;
}
function marker(target, id, ticks = 120) {
  const key = String(++carrierSerial), value = { id: () => id, key: () => key, duration: () => ticks, amplifier: () => 0 };
  target.markers.set(id, value); return value;
}
function world(from = source) {
  return { source: () => from, valid: target => !!target?.live, tick: () => 1, random: () => 1,
    effects: (target, definition) => records.filter(r => r.live && r.target === target && r.definition === definition).map(view),
    effect: (definition, target, data, ticks) => create(from, target, definition, data, ticks),
    mobEffect: (target, id) => target.markers.get(id) || null,
    matchesMobEffect(target, id, key) { const value = this.valid(target) && this.mobEffect(target, id); return !!value && String(value.key()) === key; },
    marker: (target, id, ticks) => marker(target, id, ticks),
    removeMobEffect: (target, id, key) => target.markers.get(id)?.key() === key && target.markers.delete(id),
    attributeValue: (target, id) => id === 'minecraft:generic.attack_damage' ? { base: () => target.attack, value: () => target.attack } : null,
    observe: target => target.live ? { health: () => 100, maxHealth: () => 100, position: () => point(0, 0, 0) } : null,
    friendly: target => target === from, clear: () => true, sound: noop,
    operation(id, operation) { const record = records.find(r => r.id === id && r.live); if (!record) return false;
      const handler = handlers.get(record.definition + '/operation:' + operation); if (!handler) return false; handler(record.effect); return true; }
  };
}
function expire(id) { records.find(r => r.id === id).live = false; }
function reset() { records = []; actors.forEach(a => { a.markers.clear(); a.live = true; a.ability = ''; }); }
const types = target => Array.from(D.combatants.read(world(), target).types);
const nativeTypes = () => Array.from(N.types(native.pokemon, N.read(world(), native)));
function layer(target, operation, types, id = 'fixture:carrier', from = source) { return T.apply(world(from), target, { operation, types }, marker(target, id)); }
function check(name, run) { reset(); run(); checks++; console.log('PASS ' + name); }
const move = { id: () => 'fixture', type: () => 'grass', category: () => 'physical', power: () => 40, accuracy: () => 100, priority: () => 0, critRatio: () => 1 };
const damage = target => D.resolve(world(), source, target, move, { critical: false, damageType: 'minecraft:arrow', contact: false });

check('ordinary and modded targets gain live matchup types without native stat or damage-kind rewriting', () => {
  for (const target of [ordinary, modded]) {
    const before = damage(target); layer(target, 'replace', ['water']); const after = damage(target);
    assert.equal(after.amount, before.amount * 2); assert.deepEqual(types(target), ['water']);
    assert.equal(JSON.parse(after.metadata).damageType, 'minecraft:arrow'); assert.equal(JSON.parse(after.metadata).category, 'physical');
    assert.equal(JSON.parse(after.metadata).contact, false); assert.equal(target.attack, 8); assert.deepEqual(target.base, []);
  }
});
check('add and remove track current provider facts and independent expiration', () => {
  let supplied = ['fire']; D.combatants.provide('fixture:types', ({ actor }, facts) => { if (actor === ordinary) facts.types = supplied.slice(); });
  const add = layer(ordinary, 'add', ['grass'], 'fixture:add'), remove = layer(ordinary, 'remove', ['fire'], 'fixture:remove', second);
  assert.deepEqual(types(ordinary), ['grass']); supplied = ['water', 'fire']; assert.deepEqual(types(ordinary), ['water', 'grass']);
  expire(add); assert.deepEqual(types(ordinary), ['water']); expire(remove); assert.deepEqual(types(ordinary), ['water', 'fire']);
  D.combatants.remove('fixture:types');
});
check('two sources compose in creation order and ending either layer preserves the other', () => {
  const first = layer(ordinary, 'replace', ['water'], 'fixture:first'), later = layer(ordinary, 'add', ['grass'], 'fixture:later', second);
  assert.deepEqual(types(ordinary), ['water', 'grass']); expire(first); assert.deepEqual(types(ordinary), ['grass']);
  expire(later); assert.deepEqual(types(ordinary), []);
  layer(ordinary, 'add', ['fire'], 'fixture:first'); layer(ordinary, 'replace', [], 'fixture:later', second);
  assert.deepEqual(types(ordinary), [], 'An empty replacement is a valid typeless layer');
});
check('new and legacy native layers interleave by effect id in every native consumer', () => {
  const first = create(source, native, 'cobblemon_world_combat:modifier', '{"types":["water"]}', 120);
  const add = layer(native, 'add', ['grass'], 'fixture:add', second);
  assert.deepEqual(nativeTypes(), ['water', 'grass']); assert.deepEqual(types(native), nativeTypes());
  const later = create(second, native, 'cobblemon_world_combat:modifier', '{"types":["psychic"]}', 100);
  layer(native, 'remove', ['psychic'], 'fixture:remove'); assert.deepEqual(nativeTypes(), []);
  expire(later); assert.deepEqual(nativeTypes(), ['water', 'grass']); expire(add); assert.deepEqual(nativeTypes(), ['water']);
  expire(first); assert.deepEqual(nativeTypes(), ['fire', 'flying']); assert.deepEqual(native.base, ['fire', 'flying']);
});
check('cure and carrier replacement invalidate layers before the next watcher, without deleting a replacement', () => {
  const first = layer(ordinary, 'replace', ['water']); ordinary.markers.delete('fixture:carrier'); assert.deepEqual(types(ordinary), []);
  handlers.get(T.definition + '/carrier')(records.find(r => r.id === first).effect); assert(!records.find(r => r.id === first).live);
  const old = layer(ordinary, 'replace', ['water']); const replacement = marker(ordinary, 'fixture:carrier');
  T.apply(world(second), ordinary, { operation: 'add', types: ['grass'] }, replacement); assert.deepEqual(types(ordinary), ['grass']);
  handlers.get(T.definition + '/carrier')(records.find(r => r.id === old).effect); assert.equal(ordinary.markers.get('fixture:carrier'), replacement);
});
check('stale carrier, invalid operation and native type locks do not create layers', () => {
  const stale = marker(ordinary, 'fixture:carrier'); marker(ordinary, 'fixture:carrier');
  assert.equal(T.apply(world(), ordinary, { operation: 'replace', types: ['water'] }, stale), 0);
  assert.throws(() => layer(ordinary, 'replace', ['unknown']), /Invalid/);
  assert.throws(() => layer(ordinary, 'add', ['water', 'water']), /Invalid/);
  context.NativeAbilities.define('fixturelock', { typeLock: true }); native.ability = 'fixturelock';
  assert.equal(layer(native, 'replace', ['water']), 0); assert.deepEqual(nativeTypes(), ['fire', 'flying']);
});
check('carrier time owns layers and a layer ending does not consume a shared carrier', () => {
  const carrier = marker(ordinary, 'fixture:carrier', -1);
  const first = T.apply(world(), ordinary, { operation: 'replace', types: ['water'] }, carrier);
  const secondLayer = T.apply(world(second), ordinary, { operation: 'add', types: ['grass'] }, carrier);
  assert.equal(records.find(r => r.id === first).ticks, 1200000); expire(first);
  assert.equal(ordinary.markers.get('fixture:carrier'), carrier); assert.deepEqual(types(ordinary), ['grass']);
  ordinary.live = false; handlers.get(T.definition + '/carrier')(records.find(r => r.id === secondLayer).effect);
  assert(!records.find(r => r.id === secondLayer).live);
});

function point(x, y, z) { return { x: () => x, y: () => y, z: () => z, plus: v => point(x + v.x(), y + v.y(), z + v.z()),
  minus: v => point(x - v.x(), y - v.y(), z - v.z()), length: () => Math.hypot(x, y, z) }; }
let soak, filmOwner = 0;
context.WorldCombat.point = point;
context.WorldFeedback = { actionScenes: () => ({ show: noop, finish: (action, done) => done(action) }), emit: noop, text: noop,
  onEffect: (_world, id) => { filmOwner = id; } };
context.WorldGeometry = { ring: noop, select: noop };
context.PokemonSkills = { define: definition => { soak = definition; }, p: (_id, key) => ({ hold: 120, splash: 2, streaks: 12, ripples: 8, reach: 8 }[key] || 1), sound: noop };
Object.assign(context, context.PokemonSkills);
vm.runInContext(ts.transpileModule(fs.readFileSync('content/moves/soak/skill.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText, context);
check('Soak accepts an ordinary target and attaches type and film to one exact drench lifecycle', () => {
  const access = world(), action = { world: () => access, sense: () => access, actor: () => source, target: () => ordinary,
    targetPosition: () => point(0, 0, 0), origin: () => point(0, 0, 0), range: () => 8 };
  assert.equal(soak.ready(action, {}), ''); let done = false; soak.execute(action, {}, {}, () => { done = true; });
  assert(done); assert.deepEqual(types(ordinary), ['water']);
  assert.equal(records.find(r => r.id === filmOwner).definition, T.definition);
  assert.equal(soak.ready(action, {}), 'already-water'); ordinary.markers.delete('world_combat:soaked_through'); assert.deepEqual(types(ordinary), []);
});
console.log(`PASS temporary combat types: ${checks} neutral scenarios; no game or artifact build`);
