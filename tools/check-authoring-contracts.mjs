import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Engineering assertions only. These registrations are never shipped as content or authoring examples.
const events = new Map(), stored = new Map(), casts = [], channels = new Map();
const noop = () => {};
const storeKey = (actor, key) => actor.pokemon.id() + '/' + key;
let refuseWrite = false;
const sandbox = vm.createContext({
  WorldCombat: new Proxy({ point, on: (id, topic, after, fn) => events.set(id, fn) }, { get: (value, key) => value[key] || noop }),
  CobblemonCombat: new Proxy({
    pokemon: actor => actor.pokemon,
    channel: (id, handler) => channels.set(id, handler),
    moveTemplate: () => ({ maxPp: () => 10 }),
    data: (_world, actor, key) => stored.get(storeKey(actor, key)) ?? null,
    compareData: (_world, actor, key, previous, next) => {
      const id = storeKey(actor, key);
      if (refuseWrite || (stored.get(id) ?? null) !== previous) return false;
      if (next === null) stored.delete(id); else stored.set(id, next);
      return true;
    }
  }, { get: (value, key) => value[key] || noop })
});
function point(x, y, z) { return { x: () => x, y: () => y, z: () => z,
  plus: b => point(x + b.x(), y + b.y(), z + b.z()), minus: b => point(x - b.x(), y - b.y(), z - b.z()),
  scale: value => point(x * value, y * value, z * value), length: () => Math.hypot(x, y, z),
  unit: () => { const length = Math.hypot(x, y, z) || 1; return point(x / length, y / length, z / length); } }; }
function actor(id, stats = 30) { return { ref: () => id + '/1', key: () => id, domain: () => 'cobblemon', pokemon: {
  id: () => id, ability: () => '', heldItem: () => '', species: () => 'cobblemon:eevee',
  level: () => 15, health: () => 40, maxHealth: () => 50, weight: () => 65, friendship: () => 70,
  status: () => '', owner: () => '', wild: () => false, aiEnabled: () => true,
  form: () => 'base', gender: () => 'male', aspects: () => '[]', typeCount: () => 1, type: () => 'normal', move: () => null,
  healthScale: () => 1, heldDescriptionId: () => '', attribute: () => ({ base: () => 0, value: () => 0, modifiers: () => '[]' }), stat: () => stats, nature: () => 'cobblemon:docile', moveSlots: () => 0, canAccessMove: () => true, vehicle: () => false, passenger: () => false
} }; }
const first = actor('first'), second = actor('second', 80);
const view = actor => ({ actor: () => actor, position: () => point(0, 0, 0), health: () => 40, maxHealth: () => 50,
  velocity: () => point(0, 0, 0), wet: () => false, width: () => .9, height: () => 1.4, tags: () => '',
  movementSpeed: () => .2, visible: () => true, friendly: () => true, hostile: () => false, player: () => false,
  grounded: () => true, attacking: () => null, lastAttacker: () => null, hurtAgo: () => 100 });
let busy = false, cooldown = 0;
const world = {
  source: () => first, tick: () => 10, valid: () => true, effects: () => [], mobEffect: () => null, mobEffects: () => [], observe: view, actions: () => [],
  busy: () => busy, claimed: () => busy, cooldown: () => cooldown, readiness: () => cooldown ? 'cooldown' : busy ? 'busy' : '', actor: ref => ref === first.ref() ? first : ref === second.ref() ? second : null,
  friendly: () => true, query: () => [], survey: () => '[]', equipment: () => [],
  cast: (...args) => { casts.push(args); return casts.length; }, face: noop
};
const content = process.argv[2] || 'build/content/profiles/base';
vm.runInContext(fs.readFileSync(content + '/p1_demo.js', 'utf8'), sandbox);
sandbox.IndividualAttributes.define('checks:scalar', { label: 'Engineering scalar', base: 1, valid: value => typeof value === 'number' && Number.isFinite(value), writable: true });
const A = sandbox.IndividualAttributes, one = A.live(world, first), two = A.live(world, second);
for (const id of A.ids()) {
  assert.notEqual(A.read(one, id), undefined, id);
  assert.notEqual(A.read(two, id), undefined, id);
}
assert.equal(stored.size, 0, 'Reading complete public values must not rewrite native storage');
assert.equal(A.read(one, 'world_combat:atk'), 30);
assert.equal(A.read(two, 'world_combat:atk'), 80);
assert.equal(A.update(one, 'checks:scalar', () => 1.4), true);
assert.equal(A.read(one, 'checks:scalar'), 1.4);
assert.equal(A.read(two, 'checks:scalar'), 1);
const request = A.request({ pokemon: () => first.pokemon, actor: () => null, world: () => null,
  data: key => stored.get(storeKey(first, key)) ?? null,
  compareData: (key, previous, next) => sandbox.CobblemonCombat.compareData(world, first, key, previous, next) });
assert.equal(A.read(request, 'checks:scalar'), 1.4, 'Recalled UI reads the same stored individual value');
A.define('checks:new_attribute', { label: 'New', base: ['a', 'b'], valid: value => Array.isArray(value), writable: true });
const cloned = A.read(one, 'checks:new_attribute'); cloned.push('changed');
assert.equal(A.read(two, 'checks:new_attribute').length, 2, 'New definitions supply every old individual a detached default');
assert.throws(() => A.update(one, 'checks:scalar', () => NaN), /Invalid/);
assert.throws(() => A.update(one, 'world_combat:atk', () => 100), /computed or native/);
refuseWrite = true;
assert.equal(A.update(one, 'checks:scalar', () => 2), false);
assert.equal(A.read(one, 'checks:scalar'), 1.4);
refuseWrite = false;
A.rules.contribute('checks:scalar', 'checks:contribution', (scope, value) => value + scope.term('checks:bonus', 'Bonus', .5));
assert.equal(A.read(one, 'checks:scalar'), 1.9);
A.update(one, 'checks:scalar', value => value + .1);
assert.equal(A.read(one, 'checks:scalar'), 2, 'Modifiers must not be saved back into the base');
assert(A.inspect(one, 'checks:scalar').sources.some(term => term.id === 'checks:bonus'));
assert.equal(A.has('world_combat:mood'), false);
for (const id of ['precision','balance','perception','endurance','recovery','turning','sociability','patience']) assert.equal(A.has('world_combat:'+id),false);
const readback = sandbox.NativeRepertoire.create({ namespace: 'checks_readback' });
readback.define({ id: 'readback', name: 'Readback', description: '', uses: [], kind: 'self', range: 0, prepare: 0,
  active: 0, recover: 0, cooldown: 0, style: '', defaults: {}, fields: [], ppCost: () => 0, execute: noop,
  resolve: (_pokemon, _config, _world, _actor, attributes) => ({ prepare: A.read(attributes, 'checks:scalar'), recover: 0, cooldown: 0 }),
  inspect: (_pokemon, detail, scope) => ({ ...detail, publicPrecision: A.read(scope.attributes, 'checks:scalar') }) });
readback.installChannel();
let detailReply;
channels.get('checks_readback:skills')({ pokemon: () => first.pokemon, world: () => null, actor: () => null,
  input: () => '{"op":"inspect","move":"readback"}', data: request.storage.read,
  compareData: request.storage.compare, reply: value => { detailReply = JSON.parse(value); } });
assert.equal(detailReply.requested.publicPrecision, 2);
assert.equal(detailReply.requested.timing.prepare, 2, 'Recalled skill timing and detail use actual persistent attributes');

// Nature records are declared as fixtures here; shipped nature units are not part of this mechanism check.
if (!sandbox.NativeNatures.registry.has('timid')) sandbox.NativeNatures.define('timid', { risk: -.2 });
const timid = actor('timid'); timid.pokemon.nature = () => 'cobblemon:timid';
const natureFrame = {facts:{},traits:{}}; sandbox.NativeNatures.apply(natureFrame,timid.pokemon);
assert.equal(sandbox.BehaviorProfiles.value(natureFrame,'risk',0),-.2);
assert.equal(A.read(A.live(world, timid), 'world_combat:risk'), 0, 'Individual modifier and nature are distinct sources');

// Native attribute values drive both shared formula paths; UI uses these same snapshots.
const accelerated = actor('accelerated'); accelerated.pokemon.attribute = id => ({base:()=>id.endsWith('skill_haste')?100:25,value:()=>id.endsWith('skill_haste')?100:25,modifiers:()=> '[]'});
const attributes = A.live(world, accelerated);
const values = new sandbox.RuleValues.Registry();
values.define('checks:cooldown',{value:scope=>sandbox.PokemonAttributes.cooldown(scope,attributes,80)});
const timing=values.evaluate('checks:cooldown',{});assert.equal(timing.value,40);assert(timing.sources.some(term=>term.id==='world_combat:skill_haste'));
let healed=0;const healingWorld={...world,health:(_actor,amount)=>{healed=amount;return amount;}};
sandbox.NativeEffects.heal(healingWorld,accelerated,accelerated.pokemon,20,'checks');assert.equal(healed,25);
for(const row of A.describe(one).filter(row=>row.id.startsWith('world_combat:'))) {assert(row.label.key);assert(row.description.key);}

const uses = new sandbox.WorldMethods.Library();
uses.register('checks:independent', { protocols: ['checks:work'] });
const adapter = new sandbox.PokemonBehaviorHost.Adapter(uses, { describe: () => null, supports: () => false, supportsIndividual: () => true });
sandbox.PokemonIndividuals.registry.define({ id: 'checks:grant', autonomous: true, matches: () => true, apply: ({ frame }) => {
  sandbox.WorldAbilities.grant(frame, { id: 'checks:work', action: 'checks:execute', use: 'checks:independent',
    protocols: ['checks:work'], kind: 'point', range: 4 });
  sandbox.WorldAbilities.grant(frame, { id: 'checks:self', action: 'checks:self', use: 'checks:independent',
    protocols: ['checks:work'], kind: 'self', range: 0 });
} });
const frame = adapter.frame(world, first.pokemon, 'autonomous', point(0, 0, 0), null, null, null, 16, '', () => { throw Error('Independent action used native slot'); }, noop);
assert.equal(frame.capabilities.length, 2);
assert.equal(frame.services.behavior.use(frame.capabilities[0], { ref: 'ground', point: [2, 0, 0] }), 1);
assert.equal(casts.at(-1)[1], null);
assert.equal(frame.services.behavior.use(frame.capabilities[1], { ref: 'missing', point: [9, 0, 0] }), 2);
assert.equal(casts.at(-1)[1], first);
assert.equal(sandbox.WorldAbilities.invoke(frame, 'checks:work', { ref: 'ground', point: [5, 0, 0] }), false);
cooldown = 1;
assert.equal(sandbox.WorldAbilities.invoke(frame, 'checks:work', { ref: 'ground', point: [1, 0, 0] }), false);
cooldown = 0;
frame.capabilities.splice(0, 1);
assert.equal(sandbox.WorldAbilities.invoke(frame, 'checks:work', { ref: 'ground', point: [1, 0, 0] }), false, 'Revoked grant is unavailable');
const tasks = new sandbox.WorldMethods.Tasks(uses);
const selfContext = { ...frame, facts: { ...frame.facts, busy: false }, memory: {}, scratch: {}, senses: {},
  registry: new sandbox.WorldBehavior.Registry(), active: null, suspended: [], choice: null };
assert.equal(tasks.perform(selfContext, 'checks:self', 'work', { ref: second.ref(), point: [10, 0, 0] }, {}).state, 'running');

let effect = null, cureRace = false, reactions = 0;
const effectWorld = { ...world, mobEffect: () => effect,
  mobEffects: () => effect ? [effect] : [],
  marker: (_actor, id, ticks, amplifier) => { effect = { id: () => id, duration: () => ticks, amplifier: () => amplifier,
    key: () => 'native-instance', tags: () => '', tagged: () => false }; },
  removeMobEffect: (_actor, _id, key) => { if (cureRace || key !== effect?.key()) return false; effect = null; return true; }
};
sandbox.MobEffects.apply(effectWorld, first, 'minecraft:glowing', 40);
sandbox.MobEffects.react('checks:react', 'minecraft:glowing', 'world_combat:damage_applied', event => event.target(), () => reactions++);
events.get('checks:react')({ world: () => effectWorld, target: () => first });
assert.equal(reactions, 1);
cureRace = true; assert.equal(sandbox.MobEffects.consume(effectWorld, first, 'minecraft:glowing'), null);
cureRace = false; assert.equal(sandbox.MobEffects.consume(effectWorld, first, 'minecraft:glowing').duration(), 40);
assert.equal(sandbox.MobEffects.consume(effectWorld, first, 'minecraft:glowing'), null);
events.get('checks:react')({ world: () => effectWorld, target: () => first });
assert.equal(reactions, 1, 'Cured native effects stop their gameplay reaction');
console.log('PASS authoring contracts: complete defaults, native persistence/CAS, typed values, value explanations, non-slot actions, zero-range self use and native effect consumption/reactions');
