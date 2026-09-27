import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const owned = 'content/mechanisms/damage-budgets.ts';
const program = ts.createProgram(['sdk/core/index.d.ts', 'sdk/core/world.d.ts', 'content/protocols/effects.ts',
  'content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/mechanisms/mob-effects.ts', owned], { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None,
  lib: ['lib.es5.d.ts'], strict: true, noEmit: true });
const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.file && d.file.fileName.replaceAll('\\', '/') === owned);
assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
  getCurrentDirectory: () => process.cwd(), getCanonicalFileName: value => value, getNewLine: () => '\n'
}));
const definitions = new Map(), handlers = new Map(), hooks = new Map(), records = new Map();
let serial = 0, currentReceipt = '', currentTick = 0, checks = 0;
const noop = () => {};
const context = vm.createContext({
  EffectProtocols: { unchanged: () => { throw new Error('No restoration'); } },
  MobEffects: { validAnchor: a => typeof a.id === 'string' && !!a.key,
    matches: (_w, actor, a) => actor.anchor?.id === a.id && actor.anchor?.key === a.key },
  WorldCombat: { effect: (id, _v, _life, _scope, normalize) => definitions.set(id, normalize),
    effectHandler: (id, name, callback) => handlers.set(id + '/' + name, callback),
    on: (id, _topic, _after, callback) => hooks.set(id, callback) }
});
vm.runInContext(ts.transpileModule(fs.readFileSync('content/behavior/contributions.ts', 'utf8') + '\n' + fs.readFileSync(owned, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None }
}).outputText, context);
const B = context.DamageBudgets, plain = value => JSON.parse(JSON.stringify(value));
function actor(id) { return { live: true, ref: () => id }; }
const a = actor('fixture:a'), b = actor('fixture:b');
function world(source = a) {
  const w = { source: () => source, valid: target => target.live, tick: () => currentTick, damageReceipt: () => currentReceipt,
    effect(definition, target, json, ticks) {
      const record = { id: ++serial, definition, target, ticks, data: definitions.get(definition)(json), active: true };
      const effect = record.effect = { id: () => record.id, target: () => target, world: () => w,
        state: () => record.data, remaining: () => record.ticks, schedule: noop, end: () => end(record.id) };
      records.set(record.id, record); handlers.get(definition + '/start')(effect); return record.id;
    },
    effects: (target, definition) => [...records.values()].filter(r => r.active && r.target === target && r.definition === definition)
      .map(r => ({ id: () => r.id, data: () => r.data }))
  };
  return w;
}
const w = world();
function end(id) {
  const r = records.get(id); if (!r?.active) return;
  r.active = false; handlers.get(r.definition + '/end')(r.effect);
}
function budget(target = a, options = {}) { return B.open(w, target, 100, options); }
function reserve(id, claims, data = {}) {
  const before = currentReceipt; currentReceipt = id;
  try { return B.reserve({ world: w, data: { receiptId: id, ...data } }, claims); }
  finally { currentReceipt = before; }
}
function settle(id, actual, extra = {}) {
  let data = JSON.stringify({ receiptId: id, settled: true, actual, outcome: actual > 0 ? 'applied' : 'zero', ...extra });
  const event = { world: () => w, data(value) { if (value !== undefined) data = value; return data; } };
  hooks.get(B.settledHook)(event); return JSON.parse(data);
}
function check(name, callback) {
  for (const r of records.values()) if (r.active) end(r.id);
  a.live = b.live = true; delete a.anchor; delete b.anchor; currentReceipt = ''; currentTick = 0;
  callback(); checks++; console.log('PASS ' + name);
}

check('availability reads are pure and detached', () => {
  const h = budget(a, { payload: { factor: 1.5 } });
  for (let i = 0; i < 10; i++) assert.equal(B.read(w, h).available, 1);
  const view = B.read(w, h); view.payload.factor = 900;
  assert.equal(B.read(w, h).payload.factor, 1.5);
});
check('one real hurt reserves once and nested hits cannot see its unconfirmed use', () => {
  const h = budget(); assert(reserve('outer', [h]));
  assert.equal(reserve('outer', [h]), null); assert.equal(reserve('nested', [h]), null);
  assert.equal(B.read(w, h).remaining, 1); assert.equal(B.read(w, h).available, 0);
  settle('nested', 3); assert.equal(B.read(w, h).available, 0);
  settle('outer', 3); assert.equal(B.read(w, h).remaining, 0);
});
for (const outcome of ['cancelled', 'absorbed', 'zero', 'refused', 'blocked', 'rejected', 'error']) {
  check(outcome + ' releases synchronously without a tick deadline', () => {
    const h = budget(); assert(reserve('attempt', [h]));
    const receipt = settle('attempt', 0, { outcome, accepted: outcome === 'absorbed' });
    assert.equal(B.results(receipt)[0].committed, false); assert.equal(B.read(w, h).available, 1);
    assert(reserve('retry-in-same-tick', [h])); settle('retry-in-same-tick', 1);
  });
}
check('a multihit execution spends only its first successful hit', () => {
  const h = budget(); assert(reserve('first', [h], { originInstance: 'execution' })); settle('first', 0);
  assert(reserve('second', [h], { originInstance: 'execution' })); settle('second', 2);
  assert.equal(reserve('third', [h], { originInstance: 'execution' }), null);
});
check('multiple resource acquisition is all-or-none', () => {
  const first = budget(), second = budget(b);
  assert(reserve('holding', [second])); assert.equal(reserve('pair', [first, second]), null);
  assert.equal(B.read(w, first).available, 1); settle('holding', 0);
  assert(reserve('pair', [first, second]));
  const receipt = settle('pair', 4); assert.equal(B.results(receipt).length, 2);
  assert.equal(B.read(w, first).remaining, 0); assert.equal(B.read(w, second).remaining, 0);
});
check('duplicate claims and a wrong actor cannot acquire uses', () => {
  const h = budget(); assert.equal(reserve('duplicate', [h, h]), null);
  assert.equal(reserve('wrong-holder', [{ id: h.id, actor: b }]), null);
  assert.equal(B.read(w, h).available, 1);
});
check('manual or forged metadata has no native lifetime', () => {
  const h = budget(); assert.equal(B.reserve({ world: w, data: { receiptId: 'invented' } }, [h]), null);
  currentReceipt = 'real'; assert.equal(B.reserve({ world: w, data: { receiptId: 'different' } }, [h]), null);
  assert.equal(B.reserve({ world: w, data: { receiptId: 'real', settled: true } }, [h]), null);
});
check('all decisions are visible before content creates a received credit', () => {
  const outgoing = budget(a, { payload: { amount: 4 } }), incoming = budget(b, { payload: { amount: 9 } });
  assert(reserve('paired-hit', [outgoing, incoming]));
  assert.equal(B.read(w, outgoing).available, 0); assert.equal(B.read(w, incoming).available, 0);
  const results = B.results(settle('paired-hit', 3));
  assert.deepEqual(plain(results.map(r => [r.committed, r.payload.amount])), [[true, 4], [true, 9]]);
  const gift = budget(b, { payload: { amount: results[0].payload.amount } });
  assert.equal(B.read(w, gift).payload.amount, 4);
  assert.equal(B.read(w, outgoing).remaining, 0); assert.equal(B.read(w, incoming).remaining, 0);
});
check('ending an owner during a pending hit cannot revive a budget', () => {
  const h = budget(); assert(reserve('ending', [h])); end(h.id);
  const result = B.results(settle('ending', 3))[0];
  assert.equal(result.active, false); assert.equal(result.committed, true); assert.equal(B.read(w, h), null);
});
check('a dead event source still releases pure reservations', () => {
  const h = budget(); assert(reserve('fatal-response', [h])); a.live = false;
  assert.equal(B.results(settle('fatal-response', 0))[0].active, false); a.live = true;
  assert.equal(B.read(w, h).available, 1);
});
check('native suspension without an end callback does not promise a live owner', () => {
  const h = budget(); assert(reserve('suspended-owner', [h])); records.get(h.id).active = false;
  const result = B.results(settle('suspended-owner', 2))[0];
  assert.equal(result.committed, true); assert.equal(result.active, false); assert.equal(B.read(w, h), null);
});
check('expired detached entries are retired without guessing any hurt outcome', () => {
  const h = budget(); records.get(h.id).active = false; currentTick = 100;
  assert.equal(B.read(w, h), null);
  const fresh = budget(); assert.equal(B.read(w, fresh).remaining, 1);
});
check('an exact carrier refresh ends eligibility', () => {
  a.anchor = { id: 'fixture:carrier', key: 'one' };
  const h = budget(a, { anchor: { ...a.anchor } });
  a.anchor.key = 'two'; assert.equal(B.read(w, h), null);
  assert.equal(reserve('stale-carrier', [h]), null);
});
check('finite multiuse budgets support independently nested reservations', () => {
  const h = budget(a, { uses: 3 }); assert(reserve('outer-multi', [{ ...h, uses: 2 }]));
  assert.equal(reserve('too-many', [{ ...h, uses: 2 }]), null);
  assert(reserve('inner-multi', [h])); settle('inner-multi', 1); settle('outer-multi', 0);
  assert.equal(B.read(w, h).remaining, 2); assert.equal(B.read(w, h).available, 2);
});
check('duplicate settlement cannot consume twice or publish another gift', () => {
  const h = budget(a, { uses: 2 }); assert(reserve('once', [h])); settle('once', 2);
  assert.deepEqual(plain(B.results(settle('once', 2))), []); assert.equal(B.read(w, h).remaining, 1);
});
check('invalid counts and lifetimes are rejected before creation', () => {
  for (const uses of [0, -1, 1.1, Infinity, 9007199254740992]) assert.throws(() => budget(a, { uses }));
  assert.equal(B.read(w, budget(a, { uses: 4096 })).remaining, 4096);
  assert.throws(() => B.open(w, a, 0)); assert.throws(() => B.open(w, a, Infinity));
});
console.log('Damage budget checks PASS (' + checks + ')');
