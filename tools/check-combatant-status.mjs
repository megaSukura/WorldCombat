import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Shared statuses over a fake world: one Minecraft effect per status for every domain, the native slot as mirror.
const definitions = new Map(), handlers = new Map(), listeners = new Map();
let sequence = 0, now = 0;
const tags = { 'minecraft:poison': ['world_combat:status/poison'], 'world_combat:burn': ['world_combat:status/burn'], 'world_combat:paralysis': ['world_combat:status/paralysis'],
  'world_combat:sleep': ['world_combat:status/sleep'], 'world_combat:frozen': ['world_combat:status/frozen'], 'world_combat:confusion': ['world_combat:status/confusion'],
  'fixture:deep_sleep': ['world_combat:status/sleep', 'world_combat:status/identity_only'] };
let randomRoll = .5;
const context = vm.createContext({ WorldCombat: {
  event() {}, phase() {},
  effect: (id, _schema, _duration, _lifetime, normalize) => definitions.set(id, normalize),
  effectHandler: (id, event, handler) => handlers.set(`${id}/${event}`, handler),
  on: (id, topic, _after, handler) => listeners.set(id, { topic, handler }),
}, CobblemonCombat: {
  pokemon(actor) { assert(actor.pokemon); return actor.pokemon; },
  typeEffectiveness: () => 1,
  data: (_world, actor, key) => actor.data.get(key) ?? null,
  compareData(_world, actor, key, expected, value) {
    if ((actor.data.get(key) ?? null) !== expected) return false;
    value === null ? actor.data.delete(key) : actor.data.set(key, value); return true;
  },
  status(_world, actor, id, seconds, expected) {
    if (actor.statusKey !== expected) return false;
    actor.status = id; actor.seconds = seconds; actor.statusKey = id ? `status-${++sequence}` : ''; return true;
  },
  statusSeconds(_world, actor, seconds, expected) {
    if (actor.statusKey !== expected) return false;
    actor.seconds = seconds; if (!seconds) { actor.status = ''; actor.statusKey = ''; } return true;
  },
} });
const sources = ['content/protocols/effects.ts', 'content/behavior/contributions.ts', 'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/traits/composition.ts',
  ...['combatant-stats', 'native-abilities', 'native-items', 'native-semantics', 'native-modifiers', 'native-effects', 'world-environment', 'pokemon-damage',
    'native-minecraft-status'].map(id => `content/mechanisms/${id}.ts`)];
vm.runInContext(ts.transpileModule(sources.map(path => fs.readFileSync(path, 'utf8')).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
}).outputText, context);
// Ability policies under test are declared as fixtures here; shipped ability units are not part of this mechanism check.
context.NativeAbilities.define('insomnia', { statusImmunities: ['sleep'] });
function body(id, native) {
  const actor = { id, native, data: new Map(), markers: new Map(), status: '', statusKey: '', seconds: 0, types: [], ability: '', health: 100,
    domain: () => new String(native ? 'cobblemon' : 'minecraft'), ref: () => id, key: () => id };
  if (native) actor.pokemon = {
    level: () => 40, stat: () => 80, healthScale: () => 1, projectedArmor: () => 0, projectedToughness: () => 0,
    species: () => 'cobblemon:blissey', ability: () => actor.ability, heldTag: () => false, heldItem: () => '', status: () => actor.status, statusKey: () => actor.statusKey,
    statusSeconds: () => actor.seconds, wild: () => true, typeCount: () => actor.types.length, type: i => actor.types[i], health: () => actor.health, maxHealth: () => 100,
  };
  return actor;
}
const native = body('native', true), ordinary = body('ordinary', false), attacker = body('attacker', false);
function view(actor, id) {
  const marker = actor.markers.get(id); if (!marker || marker.expires <= now) return null;
  return { id: () => id, duration: () => marker.expires - now, amplifier: () => marker.amplifier, key: () => JSON.stringify({ id, duration: marker.expires, amplifier: marker.amplifier }),
    tags: () => (tags[id] || []).join(' '), tagged: tag => (tags[id] || []).includes(tag) };
}
const world = { source: () => attacker, tick: () => now, random: () => randomRoll, valid: () => true, friendly: () => false,
  attributeValue: () => null, observe: actor => ({ health: () => actor.health, maxHealth: () => 100 }), query: () => [],
  effects: (actor) => actor.native ? [{ id: () => 1, data: () => JSON.stringify(actor.individual || (actor.individual = context.NativeEffects.empty())) }] : [],
  operation: () => true, health(actor, delta) { actor.health += delta; return delta; },
  marker(actor, id, ticks, amplifier) { actor.markers.set(id, { expires: ticks === -1 ? Infinity : now + ticks, amplifier }); },
  mobEffect(actor, id) { return view(actor, id); },
  mobEffects(actor) { return [...actor.markers.keys()].map(id => view(actor, id)).filter(Boolean); },
  removeMobEffect(actor, id, expected) { if (view(actor, id)?.key() !== expected) return false; actor.markers.delete(id); return true; },
};
function advance(ticks) {
  const until = now + ticks;
  while (now < until) { now++; context.NativeMinecraftStatus.reconcile(world, native); }
}
function reset() {
  randomRoll = .5;
  for (const actor of [native, ordinary]) { actor.data.clear(); actor.markers.clear(); actor.status = ''; actor.statusKey = ''; actor.seconds = 0; actor.types = []; actor.ability = ''; actor.health = 100; actor.individual = null; }
}
const inflict = (actor, name, ticks) => context.CombatStatus.inflict(world, actor, name, ticks);
const has = (actor, name) => context.CombatStatus.has(world, actor, name);
function event(name, actor, target, data) {
  let rejection = '', payload = JSON.stringify(data);
  listeners.get(`world_combat:status/${name}`).handler({ actor: () => actor, target: () => target, world: () => world,
    data(value) { if (value !== undefined) payload = value; return payload; }, reject: reason => { rejection = reason; } });
  return { rejection, data: JSON.parse(payload) };
}
let count = 0;
function check(name, run) { reset(); run(); count++; console.log(`PASS ${name}`); }
check('poison is one Minecraft clock on both domains; the native slot mirrors it and clears with it', () => {
  for (const actor of [native, ordinary]) assert(inflict(actor, 'poison', 80));
  assert.equal(native.seconds, 4); assert.equal(native.status, 'cobblemon:poison');
  advance(79); assert(has(native, 'poison')); assert(has(ordinary, 'poison'));
  advance(1); assert(!has(native, 'poison')); assert(!has(ordinary, 'poison')); assert.equal(native.status, '');
});
check('sleep is the shared default effect for both domains and mirrors natively', () => {
  assert(inflict(native, 'sleep', 45)); assert(inflict(ordinary, 'sleep', 45)); assert.equal(native.status, 'cobblemon:sleep'); assert.equal(native.seconds, 3);
  advance(44); assert(has(native, 'sleep')); assert(has(ordinary, 'sleep'));
  advance(1); assert(!has(native, 'sleep')); assert(!has(ordinary, 'sleep')); assert.equal(native.status, '');
});
check('sleep and frozen block commitment, navigation and outgoing attacks equally by identity', () => {
  for (const actor of [native, ordinary]) {
    inflict(actor, 'sleep', 45);
    assert.equal(event('commit', actor, attacker, {}).rejection, 'asleep');
    assert.equal(event('navigate', actor, null, { speed: 2 }).data.speed, 0);
    assert.equal(event('attacks', actor, attacker, { amount: 12 }).rejection, 'asleep');
    assert.equal(event('attacks', actor, actor, { amount: 1 }).rejection, '', 'A self-sourced environmental tick remains a real exposure');
    context.CombatStatus.cure(world, actor, 'sleep'); inflict(actor, 'frozen', 40);
    assert.equal(event('commit', actor, attacker, {}).rejection, 'frozen');
  }
});
check('actual damage wakes, fire thaws, zero damage does nothing', () => {
  for (const actor of [native, ordinary]) {
    inflict(actor, 'sleep', 45); event('applied', attacker, actor, { actual: 0 }); assert(has(actor, 'sleep'));
    event('applied', attacker, actor, { actual: .5 }); assert(!has(actor, 'sleep'));
    inflict(actor, 'frozen', 40); event('applied', attacker, actor, { actual: 1, type: 'water' }); assert(has(actor, 'frozen'));
    event('applied', attacker, actor, { actual: 1, type: 'fire' }); assert(!has(actor, 'frozen'));
  }
  assert.equal(native.status, '');
});
check('a move secondary status lands on any target through the same route', () => {
  event('applied', attacker, ordinary, { actual: 3, kind: 'move', status: 'brn', chance: 1 }); assert(has(ordinary, 'burn'));
  event('applied', attacker, native, { actual: 3, kind: 'move', status: 'burn', chance: 1 }); assert(has(native, 'burn')); assert.equal(native.status, 'cobblemon:burn');
});
check('burn damage ticks on the shared clock for every domain', () => {
  for (const actor of [native, ordinary]) inflict(actor, 'burn', 800);
  now = context.CombatStatus.burnInterval;
  for (const actor of [native, ordinary]) { event('tick', actor, actor, { id: 'world_combat:burn', amplifier: 0 }); assert.equal(actor.health, 100 - Math.floor(100 / 16)); }
});
check('a variant carrying the identity is consumed like the default; identity_only opts out of shared behavior', () => {
  world.marker(ordinary, 'fixture:deep_sleep', 40, 0);
  assert(has(ordinary, 'sleep')); assert.equal(event('commit', ordinary, attacker, {}).rejection, '');
  event('applied', attacker, ordinary, { actual: 2 }); assert(has(ordinary, 'sleep'), 'identity_only keeps its own wake rules');
});
check('only the shared default effect mirrors natively; a unit variant leaves the Pokemon layer to its author', () => {
  world.marker(native, 'fixture:deep_sleep', 40, 0); advance(2);
  assert(has(native, 'sleep')); assert.equal(native.status, '', 'a variant is not a native status by itself');
  assert(inflict(native, 'sleep', 45)); assert.equal(native.status, 'cobblemon:sleep', 'the author adds the native layer by applying the default');
});
check('a native cure removes the mirrored effect; a same-type native replacement keeps the Minecraft clock', () => {
  inflict(native, 'sleep', 45); context.CobblemonCombat.status(world, native, '', 0, native.statusKey); advance(1); assert(!has(native, 'sleep'));
  inflict(native, 'sleep', 45); context.CobblemonCombat.status(world, native, 'cobblemon:sleep', 12, native.statusKey);
  const externalKey = native.statusKey; advance(1); assert.equal(native.statusKey, externalKey); assert.equal(native.seconds, 3, 'Minecraft owns the loaded duration');
});
check('a native status without an effect grows its shared effect; an occupied slot leaves a second status unmirrored', () => {
  context.CobblemonCombat.status(world, native, 'cobblemon:burn', 20, ''); advance(1); assert(has(native, 'burn'));
  assert(inflict(native, 'paralysis', 100)); assert(has(native, 'paralysis')); assert.equal(native.status, 'cobblemon:burn');
});
check('real type and ability immunities apply through the gate', () => {
  native.types = ['steel']; assert(!inflict(native, 'poison', 80)); assert(!has(native, 'poison'));
  native.types = ['fire']; assert(!inflict(native, 'burn', 80));
  native.types = []; native.ability = 'insomnia'; assert(!inflict(native, 'sleep', 45));
  assert(inflict(ordinary, 'sleep', 45), 'ordinary bodies have no native policy');
});
check('the shared confusion carrier has a usable default chance and names its carrier in the rejection', () => {
  assert(inflict(ordinary, 'confusion', 100));
  const carrier = context.CombatStatus.representative(world, ordinary, 'confusion');
  assert(carrier !== null && carrier.amplifier() === 33, 'the shared default carrier carries its own 33% chance');
  randomRoll = .99;
  assert.equal(event('commit', ordinary, attacker, {}).rejection, '', 'a 33% roll does not fail at 0.99');
  randomRoll = .01;
  const failed = event('commit', ordinary, attacker, {});
  assert.equal(failed.rejection, 'confused');
  assert.equal(failed.data.status, 'confusion');
  assert.equal(failed.data.effect, 'world_combat:confusion', 'the rejection names the exact carrier that rolled');
});
console.log(`PASS combatant status: ${count} scenarios; shared identity, default behaviors, secondary route, variants and the native mirror`);
