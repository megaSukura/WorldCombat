import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the actual navigation handlers together; only native facts and effect storage are modeled.
const listeners = new Map();
const context = vm.createContext({
  WorldCombat: {
    on(id, topic, after, handler) { if (topic === 'world_combat:navigate') listeners.set(id, { after, handler }); },
    effect() {}, effectHandler() {},
  },
  EffectProtocols: { unchanged: value => value },
  NativeModifiers: { read: world => world.layers },
  CobblemonCombat: { pokemon: actor => { actor.adapterReads++; return actor.pokemon; } },
});
// Keep merged namespace references visible to TypeScript; light intensity is the library boundary.
const sources = ['namespace WorldEnvironment { export function sunlight(world: any, point: any): number { return world.sunlight; } }',
  ...['content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/mechanisms/mob-effects.ts', 'content/mechanisms/combat-stages.ts', 'content/traits/composition.ts', 'content/traits/ability-recipes.ts', 'content/mechanisms/native-abilities.ts', 'content/mechanisms/native-items.ts', 'content/mechanisms/native-semantics.ts',
    'content/mechanisms/native-effects.ts', 'content/mechanisms/world-environment.ts', 'content/mechanisms/world-effects.ts',
    'content/mechanisms/native-mobility.ts', 'content/mechanisms/native-vitality.ts', 'content/rules/world-attributes/rules.ts'].map(source => fs.readFileSync(source, 'utf8'))];
vm.runInContext(ts.transpileModule(sources.join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
}).outputText, context);
// Ability policies under test are declared as flags here; shipped ability units are not part of this mechanism check.
context.NativeAbilities.define('chlorophyll', {}, {
  mobility: (ability, data) => { if (ability.world.sunlight > .2) data.factor *= 1.5; },
});
assert(listeners.has('world_combat:movement'));
assert.equal(listeners.get('world_combat:movement').after, 'cobblemon_world_combat:navigate');

function navigate(options = {}) {
  const value = { speed: .3, level: 30, spe: 55, ability: 'overgrow', status: '', sunlight: 0,
    domain: 'cobblemon', nativeMovement: .2, ...options };
  const nativeString = string => value.boxed ? new String(string) : string;
  const actor = { adapterReads: 0, domain: () => nativeString(value.domain) };
  actor.pokemon = { species: () => 'cobblemon:bulbasaur', heldTag: () => false, level: () => value.level, stat: id => id === 'spe' ? value.spe : value.otherStats || 80,
    ability: () => nativeString(value.ability), status: () => nativeString(value.status), heldItem: () => nativeString('') };
  const state = { ...context.NativeEffects.empty(), stages: { spe: value.stage || 0 }, flags: value.flags || {} };
  const nativeAttributes = Object.freeze({ movementSpeed: value.nativeMovement });
  const world = {
    layers: value.layers || {}, sunlight: value.sunlight, tick: () => 100, source: () => actor, valid: () => true, mobEffects: () => [], mobEffect: () => null,
    observe: target => { assert.equal(target, actor); return { position: () => ({ x: 1, y: 2, z: 3 }), movementSpeed: () => nativeAttributes.movementSpeed }; },
    effects: (_actor, kind) => kind === 'cobblemon_world_combat:individual' ? [{ data: () => JSON.stringify(state) }]
      : kind === 'world_combat:rooted' && value.rooted ? [{}] : [],
    attribute() { assert.fail('Movement composition must leave the native attribute controller in charge'); },
  };
  let data = JSON.stringify({ speed: value.speed, arrival: 1.2 }), writes = 0;
  const event = { actor: () => actor, world: () => world, data(json) { if (json !== undefined) { data = json; writes++; } return nativeString(data); } };
  const done = new Set();
  function run(id) { if (done.has(id)) return; const rule = listeners.get(id); if (rule.after) run(rule.after); rule.handler(event); done.add(id); }
  for (const id of listeners.keys()) run(id);
  const result = JSON.parse(data);
  assert.equal(result.arrival, 1.2, 'Unrelated native navigation options survive the policy');
  return { speed: result.speed, actualMovement: nativeAttributes.movementSpeed * result.speed, adapterReads: actor.adapterReads, writes };
}
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-10, `${actual} differs from ${expected}`);
let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS native mobility: ' + name); }

check('native movement and incoming navigation coefficient compose proportionally', () => {
  const original = navigate({ speed: .25, nativeMovement: .15 });
  const coefficient = navigate({ speed: .5, nativeMovement: .15 });
  const attribute = navigate({ speed: .25, nativeMovement: .3 });
  near(coefficient.speed, original.speed * 2);
  near(attribute.speed, original.speed);
  near(attribute.actualMovement, original.actualMovement * 2);
});
check('same-level investment in the native speed stat changes mobility independently of other stats', () => {
  const ordinary = navigate({ spe: 45 }), trained = navigate({ spe: 95 });
  assert(trained.speed > ordinary.speed);
  near(navigate({ spe: 45, otherStats: 240 }).speed, ordinary.speed);
});
check('chlorophyll responds to light and respects native ability suppression', () => {
  const shade = navigate({ ability: 'chlorophyll' }), sun = navigate({ ability: 'chlorophyll', sunlight: 1 });
  assert(sun.speed > shade.speed);
  near(navigate({ ability: 'overgrow', sunlight: 1 }).speed, navigate({ ability: 'overgrow' }).speed);
  near(navigate({ ability: 'chlorophyll', sunlight: 1, layers: { suppressAbility: true } }).speed, shade.speed);
});
check('existing status and stage slowdowns survive cultivation while roots and zero remain zero', () => {
  const ordinary = navigate();
  // Paralysis slows through the shared effect's movement attribute (content/rules/combat-status), not this hook.
  near(navigate({ status: 'cobblemon:paralysis' }).speed, ordinary.speed);
  assert(navigate({ stage: -2 }).speed < ordinary.speed);
  for (const locked of [{ speed: 0 }, { rooted: true }, { status: 'cobblemon:sleep' }, { flags: { rootedUntil: 120 } }])
    assert.equal(navigate({ ...locked, ability: 'chlorophyll', sunlight: 1, spe: 200 }).speed, 0);
});
check('non-Cobblemon navigation passes through without requesting Pokemon facts', () => {
  const result = navigate({ domain: 'minecraft', boxed: true });
  assert.equal(result.speed, .3); assert.equal(result.adapterReads, 0); assert.equal(result.writes, 0);
});
check('native string wrappers preserve climate, status slowdowns and immobilization', () => {
  for (const options of [{ ability: 'chlorophyll', sunlight: 1 }, { status: 'cobblemon:paralysis' }, { status: 'cobblemon:sleep' }])
    near(navigate({ ...options, boxed: true }).speed, navigate(options).speed);
});
console.log(`PASS native mobility composition: ${checks} checks`);
