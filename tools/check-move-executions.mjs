import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Neutral execution carriers exercise the shipped commitment/conversion/refusal consumers.
const hooks = new Map(), feedback = [];
const context = vm.createContext({
  WorldCombat: { on(id, topic, after, handler) { hooks.set(id, { topic, handler }); }, effect() {}, effectHandler() {}, point() { return point; } },
  EffectProtocols: { unchanged: value => value },
  WorldFeedback: { emit(...args) { feedback.push(args); }, text() {}, keep() {} },
  CobblemonCombat: { moveTemplate: id => ({ id: () => id, type: () => 'normal', category: () => 'physical' }), typeEffectiveness: (type, target) => type === 'electric' && target === 'ground' ? 0 : 1 },
});
function run(source) { vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None } }).outputText, context); }
run(fs.readFileSync('content/behavior/contributions.ts', 'utf8'));
context.NativeEffects = { incomingRules: new context.WorldContributions.Registry() };
context.CombatStatus = { actions: new context.WorldContributions.Registry(), rejected: new context.WorldContributions.Registry(),
  has: (world, actor, id) => world.effectsById.has(id === 'electrify' ? 'electrified' : id) };
context.NativeLoadout = { executing: action => action.move };
context.DamageSemantics = { read: data => ({ attack: data.native === true }) };
context.PokemonDamage = { metadata: new context.WorldContributions.Registry(), multipliers: { sameType: 1.5 },
  combatants: { read: (_world, actor) => ({ types: actor.types || [] }) },
  sourceMetadata(world, actor, move, feature, action) {
    const metadata = { kind: 'move', move: move.id(), type: move.type(), category: move.category(), power: 20, ...(feature.dynamic || {}) };
    context.PokemonDamage.metadata.apply({ world, actor, action, metadata, preview: true }); return metadata;
  },
};
context.MobEffects = { read: (world, _actor, id) => world.effectsById.get(id) || null,
  consume(world, actor, id) { const effect = this.read(world, actor, id); if (effect) world.effectsById.delete(id); return effect; },
  apply(world, _actor, id, ticks, amplifier) { const value = carrier(amplifier, ticks); world.effectsById.set(id, value); return value; },
};
const declarations = `namespace PokemonSkills {
 export const chargeMark='chargeMark', chargeUp='chargeUp', chargeScene='chargeScene', chargeSpentText='chargeSpent', chargeFadeText='chargeFade';
 export const electrifyPayload='electrifyPayload', electrified='electrified', electrifyScene='electrifyScene', electrifySpentText='electrifySpent';
 export function define(value:any):void {} export function p(...args:any[]):number { return 1; } export function damageSpec(...args:any[]):any { return {}; }
 export function sound(...args:any[]):void {}
}`;
run(declarations + '\n' + ['content/mechanisms/move-executions.ts', 'content/moves/charge/rules.ts', 'content/moves/electrify/rules.ts', 'content/moves/quash/skill.ts'].map(file => fs.readFileSync(file, 'utf8')).join('\n'));
let serial = 0;
const point = { plus() { return this; } };
const actor = { ref: () => 'actor', key: () => 'actor', domain: () => 'cobblemon', types: [] };
const target = { ref: () => 'target', key: () => 'target', domain: () => 'native', types: [] };
function carrier(amplifier = 0, ticks = 120) { const key = `carrier:${++serial}`; return { amplifier: () => amplifier, duration: () => ticks, key: () => key }; }
function world(origin = new Map(), effectsById = new Map(), writable = true) {
  return { origin, effectsById, all: false, valid: () => true, tick: () => 20,
    originInstance: () => 'execution:fixture', originData(key, value) { if (value !== undefined) { assert(writable, 'read-only mutation'); origin.set(key, value); } return origin.get(key) ?? null; },
    effects(_actor, id) { return id === 'electrifyPayload' && this.effectsById.has('electrified') ? [{ id: () => 1, data: () => JSON.stringify({ all: this.all ? 1 : 0 }) }] : []; },
    operation() { return true; }, observe: () => ({ position: () => point }), removeMobEffect(_actor, id, key) { const current = effectsById.get(id); if (!current || current.key() !== key) return false; effectsById.delete(id); return true; },
  };
}
function commit(scope, type = 'electric', category = 'special', dynamic = null) {
  const action = { move: { id: () => 'fixture', type: () => type, category: () => category } };
  if (dynamic) context.MoveExecutions.declarations.replace({ id: 'fixture:dynamic', apply: value => value.features.push({ dynamic }) });
  else context.MoveExecutions.declarations.remove('fixture:dynamic');
  hooks.get('world_combat:execution/commit').handler({ action: () => action, world: () => scope, actor: () => actor });
}
function hit(scope, options = {}) {
  const data = { kind: 'move', type: 'electric', category: 'special', amount: 10, ...options };
  context.NativeEffects.incomingRules.apply({ world: scope, source: actor, target, data }); return data;
}
function convert(scope, type = 'normal') { const metadata = { type }; context.PokemonDamage.metadata.apply({ world: scope, actor, metadata, preview: false }); return metadata.type; }
function check(name, body) { body(); console.log('PASS execution consumers: ' + name); }

check('commit consumes charge even on a miss and all later targets/segments share it', () => {
  const scope = world(); scope.effectsById.set('chargeUp', carrier()); commit(scope);
  assert(!scope.effectsById.has('chargeUp'));
  assert.equal(hit(scope).amount, 20); assert.equal(hit(world(scope.origin, scope.effectsById)).amount, 20);
  assert.equal(hit(scope).amount, 20); assert.equal(hit(scope, { type: 'fire' }).amount, 10);
  const next = world(new Map(), scope.effectsById); commit(next); assert.equal(hit(next).amount, 10);
});
check('non-electric/status actions preserve charge and late charge does not attach to an old action', () => {
  const scope = world(); scope.effectsById.set('chargeUp', carrier()); commit(scope, 'electric', 'status'); assert(scope.effectsById.has('chargeUp'));
  const plain = world(); commit(plain); plain.effectsById.set('chargeUp', carrier()); assert.equal(hit(plain).amount, 10);
});
check('dynamic declared type and Electrify compose before Charge without per-hit consumption', () => {
  const scope = world(); scope.effectsById.set('chargeUp', carrier()); commit(scope, 'normal', 'special', { type: 'electric' }); assert.equal(hit(scope).amount, 20);
  const changed = world(); changed.effectsById.set('chargeUp', carrier()); changed.effectsById.set('electrified', carrier()); commit(changed, 'normal');
  assert(!changed.effectsById.has('chargeUp')); assert(!changed.effectsById.has('electrified'));
  assert.equal(convert(changed), 'electric'); assert.equal(convert(changed, 'fire'), 'electric'); assert.equal(hit(changed).amount, 20);
  const next = world(new Map(), changed.effectsById); commit(next, 'normal'); assert.equal(convert(next), 'normal');
});
check('native delivery shares one rewrite; unknown native type is not guessed Normal', () => {
  const scope = world(); scope.effectsById.set('electrified', carrier());
  assert.equal(hit(scope, { native: true, kind: undefined, type: '' }).type, ''); assert(scope.effectsById.has('electrified'));
  const next = world(new Map(), scope.effectsById); next.all = true;
  assert.equal(hit(next, { native: true, kind: undefined, type: '' }).type, 'electric'); assert(!next.effectsById.has('electrified'));
  assert.equal(hit(next, { native: true, kind: undefined, type: '' }).type, 'electric');
  target.types = ['ground']; assert.equal(hit(next, { native: true, kind: undefined, type: '' }).amount, 0); target.types = [];
});
function policy(scope, phase = 'commit', native = false) {
  return context.CombatStatus.actions.apply({ world: scope, actor, action: null, phase, metadata: { native }, blocked: {}, failures: {}, detail: {} });
}
function reject(scope, result) { context.CombatStatus.rejected.apply({ world: scope, actor, target, reason: 'quashed', details: result.detail.quashed || {} }); }
check('Quash spends only a writable rejection, once per native delivery and once per script attempt', () => {
  const effects = new Map([['world_combat:quash', carrier(2)]]), origin = new Map();
  assert(!policy(world(origin, effects, false), 'available').blocked.quashed);
  const proposed = policy(world(origin, effects, false)); assert(proposed.blocked.quashed); assert.equal(effects.get('world_combat:quash').amplifier(), 2);
  reject(world(origin, effects), proposed); assert.equal(effects.get('world_combat:quash').amplifier(), 1);
  const native = world(new Map(), effects), first = policy(native, 'damage', true); reject(native, first);
  assert.equal(effects.get('world_combat:quash').amplifier(), 0);
  const repeated = policy(native, 'damage', true); assert(repeated.blocked.quashed); reject(native, repeated); assert.equal(effects.get('world_combat:quash').amplifier(), 0);
  assert(!policy(world(new Map(), effects), 'damage', true).blocked.quashed);
  assert(!policy(world(new Map(), new Map([['world_combat:quash', carrier(2)]])), 'damage', false).blocked.quashed);
});
