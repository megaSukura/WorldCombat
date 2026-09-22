import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Load only the shipped library profile. No family, presentation recipe or species is available.
const actions = new Map(), channels = new Map();
const noop = () => {};
const context = vm.createContext({
  WorldCombat: new Proxy({}, { get: () => noop }),
  CobblemonCombat: new Proxy({
    registerAction: (id, ...definition) => actions.set(id, definition),
    channel: (id, callback) => channels.set(id, callback),
    pokemon: actor => actor.pokemon,
    moveTemplate: () => ({ maxPp: () => 20 }),
  }, { get: (target, key) => target[key] || noop }),
});
vm.runInContext(fs.readFileSync('build/content/profiles/base/p1_demo.js', 'utf8'), context);
assert.equal(context.PokemonSkills, undefined);
assert.equal(actions.size, 0);

// Completely non-native traits can introduce a new work protocol, combine contributions and change at runtime.
const traits = new context.WorldTraits.Registry();
traits.define({ id: 'factory:coolant', data: { capacity: 12 }, order: 1,
  hooks: { 'factory:route': (actor, route) => { route.maximum += actor.pressure; route.steps.push('cool'); } } });
traits.define({ id: 'factory:quiet-hours', applies: actor => actor.quiet,
  hooks: { 'factory:route': (_actor, route) => { route.steps.push('silent'); } } });
traits.provide('factory:equipment', actor => actor.equipment);
const machine = { pressure: 3, quiet: true, equipment: ['factory:coolant', 'factory:quiet-hours'] };
const route = traits.dispatch('factory:route', machine, { maximum: 2, steps: [] });
assert.equal(route.maximum, 5); assert.deepEqual(route.steps, ['silent', 'cool']);
machine.quiet = false;
assert.deepEqual(traits.dispatch('factory:route', machine, { maximum: 0, steps: [] }).steps, ['cool']);
const data = traits.data('factory:coolant'); data.capacity = 100;
assert.equal(traits.data('factory:coolant').capacity, 12);
assert.throws(() => traits.define({ id: 'factory:coolant' }), /duplicate/);
assert.equal(new context.WorldTraits.Registry().has('factory:coolant'), false);
traits.extend('factory:coolant', { hooks: { 'factory:route': (_actor, value) => { value.maximum += 2; } } });
assert.equal(traits.dispatch('factory:route', machine, { maximum: 0, steps: [] }).maximum, 5);
traits.replace({ id: 'factory:coolant', hooks: { 'factory:route': (_actor, value) => { value.maximum = 20; } } });
assert.equal(traits.dispatch('factory:route', machine, { maximum: 0, steps: [] }).maximum, 20);
assert(traits.remove('factory:coolant'));
assert.equal(traits.dispatch('factory:route', machine, { maximum: 0, steps: [] }).maximum, 0);

// An unrelated native ability contributes both world work and AI policy through open events.
context.NativeAbilities.define('workshop:resonance', { label: 'Resonance' }, {
  'workshop:operate': (_actor, job) => { job.power *= 2; job.output.push('resonance'); },
  behavior: (_actor, data) => { data.frame.traits = { resonant: true }; data.frame.policies = [{ id: 'workshop:quiet-work' }]; },
});
const native = { pokemon: { ability: () => new String('workshop:resonance') } };
const state = context.NativeEffects.empty();
const job = context.NativeAbilities.apply({}, native, 'workshop:operate', { power: 4, output: [] }, state);
assert.equal(job.power, 8); assert.deepEqual(job.output, ['resonance']);
const behavior = { frame: {} }; context.NativeAbilities.apply({}, native, 'behavior', behavior, state);
assert.equal(behavior.frame.traits.resonant, true);
assert.equal(behavior.frame.policies[0].id, 'workshop:quiet-work');
state.flags.suppressed = 1;
assert.equal(context.NativeAbilities.apply({}, native, 'workshop:operate', { power: 4 }, state).power, 4);
// Contributed traits receive their own identity, independent of the actor's primary native ability.
const nativeState = context.NativeEffects.empty();
const observer = { domain: () => 'cobblemon', pokemon: { ability: () => 'overgrow', stat: () => 20, attribute: () => ({base:()=>0,value:()=>0,modifiers:()=> '[]'}) } };
const opponent = { domain: () => 'cobblemon', pokemon: { stat: id => id === 'def' ? 10 : 20 } };
const observations = { valid: () => true, observe: () => ({ position: () => ({}) }), query: () => [opponent], friendly: () => false,
  effects: (_actor, id) => id === 'cobblemon_world_combat:individual' ? [{ id: () => 1, data: () => JSON.stringify(nativeState) }] : [],
  operation: (_id, _op, data) => Object.assign(nativeState, JSON.parse(data)),
};
// The learned trait under test is declared here as a fixture; shipped ability units are not part of this mechanism check.
context.NativeAbilities.define('download', {}, {
  encounter: (hook, _value, trait) => {
    if (trait !== 'download') return;
    let defence = 0, special = 0;
    hook.world.query(hook.world.observe(hook.actor).position(), 12, true).forEach(actor => {
      if (String(actor.domain()) !== 'cobblemon' || hook.world.friendly(actor)) return;
      const other = context.CobblemonCombat.pokemon(actor);
      defence += other.stat('def'); special += other.stat('spd');
    });
    const stat = defence < special ? 'atk' : 'spa';
    hook.state.stages[stat] = Math.max(-6, Math.min(6, (hook.state.stages[stat] || 0) + 1));
  },
});
context.NativeAbilities.registry.provide('workshop:learned-trait', value => value.actor === observer ? ['download'] : []);
context.NativeAbilities.apply(observations, observer, 'encounter', {}, nativeState);
assert.equal(nativeState.stages.atk, 1);
let healthChange;
const recovered = context.NativeEffects.heal({ health: (_actor, delta) => (healthChange = delta) }, observer, { healthScale: () => 1 }, 180, 'item');
assert.equal(healthChange, 180); assert.equal(recovered, 180);

// Independent catalogues share registration, storage, custom fields, CAS and inspection without copied controllers.
const a = context.NativeRepertoire.create({ namespace: 'harbor', request: (request, input) => {
  if (input.op !== 'dock') return false; request.reply('{"docked":true}'); return true;
} });
const b = context.NativeRepertoire.create({ namespace: 'workshop' });
function skill(id) { return { id, name: id, description: 'Independent reusable service', uses: ['work'], kind: 'self',
  range: 6, prepare: 2, active: 4, recover: 2, cooldown: 10, style: 'custom',
  defaults: { route: [1, 2] }, fields: [{ path: ['route'], label: 'Route', kind: 'waypoints',
    validate: value => Array.isArray(value) && value.length > 0 && value.every(Number.isFinite) }],
  execute: noop, inspect: (_pokemon, detail) => ({ ...detail, worksite: 'dock' }),
}; }
a.define(skill('swift')); b.define(skill('recover')); a.installChannel(); b.installChannel();
assert(actions.has('harbor:swift') && actions.has('workshop:recover'));
assert.equal(a.skills.recover, undefined);
const storage = new Map();
function request(channel, pokemonId, input) {
  let reply;
  const pokemon = { id: () => pokemonId, canAccessMove: () => true, moveSlots: () => 0, species: () => 'custom:any', level: () => 10 };
  channels.get(channel)({ pokemon: () => pokemon, input: () => JSON.stringify(input),
    data: key => storage.get(`${pokemonId}/${key}`) ?? null,
    compareData(key, expected, value) {
      const id = `${pokemonId}/${key}`;
      if ((storage.get(id) ?? null) !== expected) return false;
      value === null ? storage.delete(id) : storage.set(id, value); return true;
    }, reply: text => { reply = JSON.parse(text); },
  }); return reply;
}
const first = request('harbor:skills', 'one', { op: 'inspect', move: 'swift' });
assert.equal(first.requested.worksite, 'dock');
const saved = request('harbor:skills', 'one', { op: 'configure', move: 'swift', patch: { route: [3, 4, 5] } });
assert.deepEqual(saved.requested.values.route, [3, 4, 5]);
assert.deepEqual(request('harbor:skills', 'two', { op: 'inspect', move: 'swift' }).requested.values.route, [1, 2]);
assert.equal(request('harbor:skills', 'one', { op: 'configure', move: 'swift', patch: { route: [6] } }).error, 'settings-changed');
assert.equal(request('harbor:skills', 'one', { op: 'dock' }).docked, true);
assert.throws(() => request('harbor:skills', 'two', { op: 'configure', move: 'swift', patch: { route: [] } }), /invalid-preference/);
console.log('PASS independent libraries: non-native trait composition, new ability work/AI hooks, suppression, independent catalogues, custom field validation, CAS and request extensions; no family loaded');
