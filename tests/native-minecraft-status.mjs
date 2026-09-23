import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const hooks = {}, handlers = {};
let tick = 0, serial = 0, native = '', nativeKey = '', seconds = 0, stored = null, effect = null;
let ref = 'entity/1', ability = '', type = 'normal', health = 60, failures = false, markerCalls = 0, writes = 0;
let individual;
const actor = { domain: () => new String('cobblemon'), ref: () => ref };
const pokemon = { status: () => new String(native), statusKey: () => nativeKey, statusSeconds: () => seconds, wild: () => false,
  ability: () => new String(ability), typeCount: () => 1, type: () => new String(type), health: () => health, maxHealth: () => 100,
  species: () => 'cobblemon:bulbasaur', heldTag: () => false, healthScale: () => 1, heldItem: () => '', heldKey: () => '' };
const effectView = () => effect && ({ id: () => 'minecraft:poison', duration: () => effect.end - tick, amplifier: () => effect.amplifier,
  key: () => JSON.stringify({ id: 'minecraft:poison', duration: effect.end, amplifier: effect.amplifier, hidden_effect: effect.hidden }),
  tags: () => 'world_combat:status/poison', tagged: tag => tag === 'world_combat:status/poison' });
const world = { valid: () => true, tick: () => tick, random: () => 0.5,
  effects: () => [{ id: () => 1, data: () => JSON.stringify(individual) }],
  operation: (_id, _op, data) => { individual = JSON.parse(data); return true; },
  mobEffect: () => effectView(), mobEffects: () => effectView() ? [effectView()] : [], observe: () => ({ maxHealth: () => 100 }), marker: (_actor, _id, duration, amplifier) => {
    markerCalls++; effect = { end: tick + duration, amplifier, hidden: null };
  }, removeMobEffect: (_actor, _id, expected) => {
    if (effectView()?.key() !== expected) return false; effect = null; return true;
  }, health: (_actor, delta) => { health += delta; return delta; } };
const context = vm.createContext({ WorldCombat: { on: (id, _topic, _after, handler) => { hooks[id] = handler; },
  effect() {}, effectHandler: (_id, name, callback) => { handlers[name] = callback; } },
  EffectProtocols: { unchanged: x => x }, NativeModifiers: { read: () => ({}) },
  CobblemonCombat: { pokemon: () => pokemon, data: () => stored === null ? null : new String(stored),
    compareData: (_w, _a, _key, expected, value) => {
      if (stored !== expected) return false;
      stored = value === null ? null : JSON.stringify(JSON.parse(value), Object.keys(JSON.parse(value)).sort()); writes++; return true;
    },
    status: (_w, _a, id, duration, expected) => {
      if (failures || nativeKey !== expected) return false;
      native = id; seconds = duration; nativeKey = id ? String(++serial) : ''; return true;
    }, statusSeconds: (_w, _a, value, expected) => {
      if (nativeKey !== expected) return false; seconds = value; return true;
    } } });
const sourceFiles = ['content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/mechanisms/mob-effects.ts', 'content/mechanisms/combat-stages.ts', 'content/traits/composition.ts', 'content/mechanisms/native-abilities.ts','content/mechanisms/native-items.ts', 'content/mechanisms/native-semantics.ts',
    'content/mechanisms/native-modifiers.ts', 'content/mechanisms/native-effects.ts', 'content/mechanisms/native-minecraft-status.ts'];
  vm.runInContext(ts.transpileModule(sourceFiles.map(file=>fs.readFileSync(file,'utf8')).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None }
  }).outputText, context);
// Ability policies under test are declared as flags here; shipped ability units are not part of this mechanism check.
context.NativeAbilities.define('poisonheal', { poisonTickRecovery: true });
context.NativeAbilities.define('magicguard', { indirectImmune: true });
function reset() {
  tick = 0; native = ''; nativeKey = ''; seconds = 0; stored = null; effect = null; ref = 'entity/1';
  ability = ''; type = 'normal'; health = 60; failures = false; markerCalls = 0; writes = 0; individual = context.NativeEffects.empty();
}
const reconcile = () => context.NativeMinecraftStatus.reconcile(world, actor);
const apply = () => context.NativeEffects.status(world, actor, 'poison');
function nativeCure() { native = ''; nativeKey = ''; seconds = 0; reconcile(); }
function application() {
  let rejection = '';
  context.NativeMinecraftStatus.application({ actor: () => actor, world: () => world,
    data: () => JSON.stringify({ id: 'minecraft:poison', amplifier: effect.amplifier }), reject: r => { rejection = r; } });
  if (!rejection) health--;
}
reset(); assert.equal(apply(), true); assert.equal(effect.amplifier, 0); assert.equal(effect.end, 800);
for (tick = 1; tick <= 200; tick++) {
  if (tick % 25 === 0) application();
  if (tick % 20 === 0) handlers.pulse({ world: () => world, target: () => actor,
    state: json => { individual = JSON.parse(json); }, remaining() {}, schedule() {} });
  reconcile();
}
assert.equal(health, 52, 'Only the Minecraft poison clock damages; the former native proportional pulse adds no damage');
assert.equal(writes, 1, 'Canonical native storage and boxed strings must not cause unchanged association writes every tick');
nativeCure(); assert.equal(effect, null, 'A native cure removes its unchanged linked Minecraft effect');

reset(); apply(); effect = null; reconcile(); assert.equal(native, '', 'Milk or /effect clear cures the native partner status');
reset(); effect = { end: 260, amplifier: 0, hidden: null }; reconcile();
assert.equal(native, 'cobblemon:poison'); assert.equal(seconds, 13); assert.equal(markerCalls, 0);
nativeCure(); assert.equal(effect, null, 'A first Minecraft exposure can be cured through native medicine');

reset(); apply(); const previous = effectView().key();
effect = { end: 1600, amplifier: 2, hidden: { duration: 900, amplifier: 0 } };
assert.equal(world.removeMobEffect(actor, 'minecraft:poison', previous), false, 'CAS rejects an externally upgraded effect');
reconcile(); nativeCure();
assert.equal(effect.amplifier, 2); assert.equal(effect.end, 1600); assert(effect.hidden);
reconcile(); assert.equal(native, '', 'Preserving a foreign upgrade does not immediately undo native medicine');

reset(); failures = true; assert.equal(apply(), true); assert(effect); assert.equal(native, ''); assert.equal(stored, null, 'A rejected native CAS leaves the Minecraft effect as the status and writes no association');
failures = false; reconcile(); assert.equal(native, 'cobblemon:poison', 'The native mirror follows once the store accepts the write');

reset(); apply(); tick = 80; seconds = 36;
const saved = JSON.stringify({ native, seconds, stored });
effect = null; ref = 'replacement/2'; nativeKey = 'restored-container';
({ native, seconds, stored } = JSON.parse(saved)); reconcile();
assert.equal(effect.end, tick + 720, 'Recall and native serialization restore the remaining native duration');
nativeCure(); assert.equal(effect, null);

reset(); ability = 'poisonheal'; apply(); application(); assert.equal(health, 61, 'Poison Heal converts the same native application clock once');
reset(); ability = 'magicguard'; apply(); application(); assert.equal(health, 60);
reset(); type = 'steel'; effect = { end: 100, amplifier: 2, hidden: null }; reconcile(); application();
assert.equal(native, ''); assert.equal(health, 60, 'Native immunity remains script policy for externally applied Minecraft poison');
console.log('PASS native/Minecraft status clock, cures, CAS failure, foreign upgrades, persistence and ability policies');
