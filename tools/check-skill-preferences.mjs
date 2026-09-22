import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'build/preferences-check/skill-preferences.js');
fs.mkdirSync(path.dirname(output), { recursive: true });
const program = ts.createProgram([path.join(root, 'content/preferences/skill-preferences.ts')], {
  target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, lib: ['lib.es5.d.ts'], strict: true, noEmitOnError: true, outFile: output,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n',
}));
assert.equal(program.emit().emitSkipped, false);
const sandbox = vm.createContext({});
vm.runInContext(fs.readFileSync(output, 'utf8'), sandbox);
const Preferences = sandbox.SkillPreferences;
const clean = value => JSON.parse(JSON.stringify(value));
let count = 0;
function check(name, test) { test(); count++; console.log('PASS skill preferences: ' + name); }
function storage() {
  const entries = new Map(), writes = [];
  const key = (skill, individual) => JSON.stringify([skill, individual]);
  return { entries, writes, key,
    read: (skill, individual) => entries.get(key(skill, individual)) ?? null,
    write: (skill, individual, value) => {
      writes.push({ skill, individual, value });
      if (value === null) entries.delete(key(skill, individual)); else entries.set(key(skill, individual), value);
    },
  };
}
function example() {
  const registry = new Preferences.Registry();
  registry.define('example:flame', {
    version: 1, defaults: { world: { spread: false, lightSelected: true }, autonomous: { range: 8, reserve: 2 }, label: null },
    normalize: value => {
      if (typeof value.world?.spread !== 'boolean' || typeof value.world?.lightSelected !== 'boolean'
        || typeof value.autonomous?.range !== 'number' || value.autonomous.range < 1
        || typeof value.autonomous?.reserve !== 'number' || value.autonomous.reserve < 0) throw new Error('invalid flame preference');
      return value;
    },
  });
  registry.define('example:light', { version: 1, defaults: { desiredCharge: 5, searchForSun: false }, normalize: value => value });
  return registry;
}

check('each skill has independent global settings and an individual keeps inheriting untouched fields', () => {
  const registry = example(), store = storage();
  registry.update('example:flame', null, { autonomous: { range: 12 } }, store);
  registry.update('example:flame', 'a', { world: { spread: true } }, store);
  registry.update('example:light', null, { desiredCharge: 9 }, store);
  registry.update('example:flame', null, { world: { lightSelected: false }, autonomous: { range: 20 } }, store);
  const first = registry.resolve('example:flame', 'a', store);
  assert.deepEqual(clean(first), { world: { spread: true, lightSelected: false }, autonomous: { range: 20, reserve: 2 }, label: null });
  assert.equal(registry.resolve('example:flame', 'b', store).world.spread, false);
  assert.deepEqual(clean(registry.resolve('example:light', 'a', store)), { desiredCharge: 9, searchForSun: false });
  assert.deepEqual(JSON.parse(store.read('example:flame', 'a')), { version: 1, patch: { world: { spread: true } } });
});

check('clear restores nested inheritance while preserving sibling overrides', () => {
  const registry = example(), store = storage();
  registry.update('example:flame', 'a', { world: { spread: true, lightSelected: false }, autonomous: { reserve: 4 } }, store);
  registry.clear('example:flame', 'a', ['world', 'spread'], store);
  assert.deepEqual(clean(registry.overrides('example:flame', 'a', store)), { world: { lightSelected: false }, autonomous: { reserve: 4 } });
  assert.equal(registry.resolve('example:flame', 'a', store).world.spread, false);
  registry.update('example:flame', null, { world: { spread: true } }, store);
  assert.equal(registry.resolve('example:flame', 'a', store).world.spread, true);
  registry.clear('example:flame', 'a', store);
  assert.equal(store.read('example:flame', 'a'), null);
  assert.deepEqual(clean(registry.resolve('example:flame', 'a', store)), clean(registry.resolve('example:flame', null, store)));
  registry.clear('example:flame', null, store);
  assert.equal(registry.resolve('example:flame', 'a', store).world.spread, false);
});

check('arrays replace and explicit null remains distinct from removing an override', () => {
  const registry = new Preferences.Registry(), store = storage();
  registry.define('example:route', { version: 1, defaults: { route: ['a', 'b'], memory: { name: 'home' }, nullable: 'default' }, normalize: value => value });
  registry.update('example:route', 'a', { route: ['c'], nullable: null }, store);
  assert.deepEqual(clean(registry.resolve('example:route', 'a', store)), { route: ['c'], memory: { name: 'home' }, nullable: null });
  registry.clear('example:route', 'a', ['nullable'], store);
  assert.equal(registry.resolve('example:route', 'a', store).nullable, 'default');
});

check('default definitions, patches, inspections and returned values share no mutable references', () => {
  const registry = new Preferences.Registry(), store = storage();
  const defaults = { nested: { value: 1 }, list: [{ value: 2 }] };
  const definition = { version: 1, defaults, normalize: value => value };
  registry.define('example:isolated', definition);
  defaults.nested.value = 90; defaults.list[0].value = 91; definition.version = 99;
  const patch = { nested: { value: 3 } };
  const result = registry.update('example:isolated', 'a', patch, store);
  patch.nested.value = 92; result.nested.value = 93;
  const inspected = registry.inspect('example:isolated', 'a', store);
  inspected.defaults.list[0].value = 94;
  inspected.global.nested.value = 95;
  inspected.overrides.nested.value = 96;
  inspected.effective.nested.value = 97;
  assert.deepEqual(clean(registry.resolve('example:isolated', 'a', store)), { nested: { value: 3 }, list: [{ value: 2 }] });
  assert.equal(registry.resolve('example:isolated', 'b', store).nested.value, 1);
});

check('a new schema migrates only old explicit fields and preserves newly introduced defaults', () => {
  const registry = new Preferences.Registry(), store = storage(), migrated = [];
  registry.define('example:evolving', { version: 3, defaults: { behavior: { reach: 10, patience: 5 }, reserve: 4 }, normalize: value => value,
    migrate: (version, patch, layer) => {
      migrated.push([version, layer]);
      if (version !== 1) throw new Error('unsupported migration');
      return Object.hasOwn(patch, 'reach') ? { behavior: { reach: patch.reach } } : patch;
    },
  });
  store.entries.set(store.key('example:evolving', null), JSON.stringify({ version: 1, patch: { reach: 12 } }));
  store.entries.set(store.key('example:evolving', 'a'), JSON.stringify({ version: 1, patch: { reserve: 7 } }));
  assert.deepEqual(clean(registry.resolve('example:evolving', 'a', store)), { behavior: { reach: 12, patience: 5 }, reserve: 7 });
  assert.equal(store.writes.length, 0, 'resolution must stay read-only');
  registry.update('example:evolving', null, { behavior: { patience: 9 } }, store);
  registry.update('example:evolving', 'a', { reserve: 8 }, store);
  assert.deepEqual(JSON.parse(store.read('example:evolving', 'a')), { version: 3, patch: { reserve: 8 } });
  assert.equal(registry.resolve('example:evolving', 'a', store).behavior.patience, 9);
  assert(migrated.some(([version, layer]) => version === 1 && layer === 'global'));
  assert(migrated.some(([version, layer]) => version === 1 && layer === 'individual'));
});

check('a skill can define merge semantics without copying inherited results into individual storage', () => {
  const registry = new Preferences.Registry(), store = storage();
  registry.define('example:signals', { version: 1, defaults: { signals: ['default'], limit: 3 }, normalize: value => {
    value.limit = Math.min(10, value.limit); return value;
  }, merge: (base, patch, layer) => {
    if (patch.signals) base.signals = layer === 'individual' ? base.signals.concat(patch.signals) : patch.signals;
    if (Object.hasOwn(patch, 'limit')) base.limit = patch.limit;
    return base;
  } });
  registry.update('example:signals', 'a', { signals: ['individual'], limit: 50 }, store);
  assert.deepEqual(clean(registry.resolve('example:signals', 'a', store)), { signals: ['default', 'individual'], limit: 10 });
  registry.update('example:signals', null, { signals: ['new-global'] }, store);
  assert.deepEqual(clean(registry.resolve('example:signals', 'a', store).signals), ['new-global', 'individual']);
  assert.deepEqual(JSON.parse(store.read('example:signals', 'a')).patch.signals, ['individual']);
});

check('invalid values and normalization failures leave stored preferences unchanged', () => {
  const registry = example(), store = storage();
  registry.update('example:flame', 'a', { autonomous: { reserve: 4 } }, store);
  const before = store.read('example:flame', 'a'), writes = store.writes.length;
  for (const bad of [NaN, Infinity, -Infinity, undefined, () => 1, new Date()]) {
    assert.throws(() => registry.update('example:flame', 'a', { autonomous: { reserve: bad } }, store));
  }
  assert.throws(() => registry.update('example:flame', 'a', { autonomous: { reserve: -1 } }, store), /invalid flame/);
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => registry.update('example:flame', 'a', cycle, store), /Cyclic/);
  assert.equal(store.read('example:flame', 'a'), before);
  assert.equal(store.writes.length, writes);
  const badNormalizer = new Preferences.Registry();
  assert.throws(() => badNormalizer.define('bad', { version: 1, defaults: {}, normalize: () => ({ value: NaN }) }), /finite/);
});

check('prototype pollution, accessors and array property tricks are rejected without executing them', () => {
  const registry = example(), store = storage(); let touched = false;
  const accessor = {}; Object.defineProperty(accessor, 'world', { enumerable: true, get() { touched = true; return {}; } });
  assert.throws(() => registry.update('example:flame', 'a', accessor, store), /accessors/);
  assert.equal(touched, false);
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const patch = JSON.parse(`{"nested":{"${key}":{"polluted":true}}}`);
    assert.throws(() => registry.update('example:flame', 'a', patch, store), /Unsafe/);
    assert.throws(() => registry.clear('example:flame', 'a', [key], store), /Unsafe/);
  }
  const named = [1]; named.extra = 2;
  assert.throws(() => registry.update('example:flame', 'a', { named }, store), /named properties/);
  const sparse = []; sparse.length = 2;
  assert.throws(() => registry.update('example:flame', 'a', { sparse }, store), /explicit JSON/);
  assert.equal({}.polluted, undefined);
  assert.equal(store.writes.length, 0);
});

check('newer, malformed and unmigratable stored data are reported; explicit clear can recover the layer', () => {
  const registry = example(), store = storage(), key = store.key('example:flame', 'a');
  for (const stored of ['{broken', JSON.stringify({ version: 9, patch: {} }), JSON.stringify({ version: 0, patch: {} }),
    '{"version":1,"patch":{"__proto__":{"polluted":true}}}']) {
    store.entries.set(key, stored);
    assert.throws(() => registry.resolve('example:flame', 'a', store));
  }
  registry.clear('example:flame', 'a', store);
  assert.equal(store.read('example:flame', 'a'), null);
  const newerDefinition = new Preferences.Registry();
  newerDefinition.define('example:older', { version: 2, defaults: {}, normalize: value => value });
  store.entries.set(store.key('example:older', null), JSON.stringify({ version: 1, patch: {} }));
  assert.throws(() => newerDefinition.resolve('example:older', 'a', store), /migration/);
});

check('replace updates exactly one explicit layer and storage operations are supplied per callback', () => {
  const registry = example(), backing = storage();
  function within(operation) {
    let valid = true;
    const scoped = { read: (...args) => { assert(valid, 'expired storage callback'); return backing.read(...args); },
      write: (...args) => { assert(valid, 'expired storage callback'); return backing.write(...args); } };
    const result = operation(scoped); valid = false; return result;
  }
  within(store => registry.update('example:flame', 'a', { world: { spread: true }, autonomous: { reserve: 9 } }, store));
  within(store => registry.replace('example:flame', 'a', { label: 'hello' }, store));
  assert.deepEqual(clean(within(store => registry.overrides('example:flame', 'a', store))), { label: 'hello' });
  assert.equal(within(store => registry.resolve('example:flame', 'a', store)).world.spread, false);
  assert.throws(() => within(store => registry.resolve('unknown-skill', 'a', store)), /Unknown/);
  assert.throws(() => registry.define('example:flame', { version: 1, defaults: {}, normalize: value => value }), /Duplicate/);
});

console.log(`PASS ${count} skill-owned preference checks; strict ES5 script compilation`);
