import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';

const hooks = new Map(), entries = new Map();
let tick = 40, serial = 0;
const context = vm.createContext({ WorldCombat: {
  effect() {}, effectHandler() {}, on(id, _topic, _after, callback) { hooks.set(id, callback); }
} });
vm.runInContext(ts.transpileModule(['content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts']
  .map(path => fs.readFileSync(path, 'utf8')).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None } }).outputText, context);
const source = { ref: () => 'source/1', key: () => 'source' }, target = { ref: () => 'target/1', key: () => 'target' };
const world = { valid: () => true, tick: () => tick,
  effects: (_actor, definition) => [...entries.values()].filter(row => row.definition === definition),
  operation: id => entries.delete(id), effect: (definition, _actor, data) => {
    const id = ++serial; entries.set(id, { id: () => id, data: () => data, definition }); return id;
  }
};
const record = data => hooks.get('world_combat:native_attack_memory')({ world: () => world, actor: () => source, target: () => target, data: () => JSON.stringify(data) });
const native = { sourceLiving: true, sourceActor: 'source/1', direct: true, directProjectile: false,
  damageType: 'minecraft:mob_attack', actual: 3, amount: 3 };
record(native);
let seen = context.DamageSemantics.recentOffense(world, source);
assert.equal(seen.kind, 'native'); assert.equal(seen.directProjectile, false); assert.equal(seen.contact, true);
record({ ...native, damageType: 'minecraft:arrow', damageTags: ['minecraft:is_projectile'], directProjectile: true, projectilePath: [] });
seen = context.DamageSemantics.recentOffense(world, source);
assert.equal(seen.directProjectile, true, 'A real projectile remains a projectile with no recorded path');
record({ ...native, kind: 'move', move: 'fixture_ray', category: 'special', contact: false, directProjectile: true, projectilePath: [] });
seen = context.DamageSemantics.recentOffense(world, source);
assert.equal(seen.move, 'fixture_ray'); assert.equal(seen.kind, 'move'); assert.equal(seen.directProjectile, true);
const held = serial;
record({ ...native, actual: 0 }); record({ ...native, kind: 'residual', indirect: true });
assert.equal(serial, held, 'Failed/residual damage replaced the last direct offense');
record({ ...native, directProjectile: undefined });
assert.equal(context.DamageSemantics.recentOffense(world, source).directProjectile, undefined, 'Missing native fact was guessed');
tick += 101;
assert.equal(context.DamageSemantics.recentOffense(world, source), null, 'Observation exceeded its finite age');
console.log('PASS resolved offense memory: native/authored identity, explicit projectile fact, empty path, failed/residual exclusion and finite age');
