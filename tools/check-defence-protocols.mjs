import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Execute the shared production protocol and guard callbacks without a family recipe or game process.
const hooks = new Map(), definitions = new Map(), handlers = new Map();
const context = vm.createContext({ WorldCombat: { event() {}, phase() {},
  on: (id, _event, _after, callback) => hooks.set(id, callback),
  effect: (id, _version, _ticks, _owner, normalize) => definitions.set(id, normalize),
  effectHandler: (id, event, callback) => handlers.set(id + '/' + event, callback) } });
for (const file of ['content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/protocols/effects.ts', 'content/mechanisms/guard-effects.ts', 'content/mechanisms/world-environment.ts', 'content/mechanisms/world-effects.ts'])
  vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None }
  }).outputText, context);

const actor = id => ({ ref: () => id, key: () => id });
const protectedBody = actor('workshop:operator'), receiver = actor('workshop:relay');
context.GuardEffects.register('workshop:reserve', {});
const guardState = { rule: 'workshop:reserve', mode: 'pool', capacity: 8192, fraction: .75,
  minimumHealth: 512, charges: 0, linkRange: 0 };
let normalized;
context.GuardEffects.apply({ effect: (_id, _target, json) => { normalized = json; return 1; } }, protectedBody, guardState, 20);
assert.equal(JSON.parse(normalized).capacity, 8192);
assert.equal(JSON.parse(normalized).minimumHealth, 512);
const normalize = definitions.get('world_combat:guard');
for (const field of ['capacity', 'minimumHealth']) {
  assert.throws(() => normalize(JSON.stringify({ ...guardState, [field]: -1 })));
  assert.throws(() => normalize(JSON.stringify({ ...guardState, [field]: null })));
  assert.throws(() => normalize(JSON.stringify({ ...guardState, [field]: 1 }).replace('"' + field + '":1', '"' + field + '":1e400')));
}
let payload = JSON.stringify({ amount: 4096 }), state = normalized, ended = false;
const guardWorld = { observe: () => ({ health: () => 3000 }), friendly: () => true };
const scope = { world: () => guardWorld, source: () => protectedBody, target: () => protectedBody,
  state: json => json === undefined ? state : state = json, end: () => { ended = true; },
  event: () => ({ source: () => receiver, target: () => protectedBody, payload: json => json === undefined ? payload : payload = json }) };
handlers.get('world_combat:guard/intercept')(scope);
assert.equal(JSON.parse(payload).amount, 1024);
assert.equal(JSON.parse(state).capacity, 5120);
assert.equal(ended, false);
state = normalize(JSON.stringify({ ...guardState, mode: 'survive', charges: 1 }));
payload = JSON.stringify({ amount: 6000 });
handlers.get('world_combat:guard/intercept')(scope);
assert.equal(JSON.parse(payload).amount, 2488);
assert.equal(ended, true);

const transfers = [];
let original, intercepted;
const world = { actor: () => receiver, friendly: () => false,
  signal: () => JSON.stringify(intercepted),
  hurt: (target, amount, json) => { transfers.push({ target, amount, data: JSON.parse(json) }); return true; } };
function incoming(input, result) {
  original = JSON.stringify(input); intercepted = result;
  hooks.get('world_combat:effects_incoming')({ target: () => protectedBody, world: () => world,
    data: json => json === undefined ? original : original = json });
  return JSON.parse(original);
}
const damage = { amount: 4096, armorExcluded: 24, toughnessExcluded: 8, type: 'electric', critical: true };
const result = incoming(damage, { ...damage, redirect: receiver.ref() });
assert.equal(result.amount, 0);
assert.equal(transfers.length, 1);
assert.equal(transfers[0].target, receiver);
assert.equal(transfers[0].amount, 4096);
assert.equal(transfers[0].data.armorExcluded, undefined);
assert.equal(transfers[0].data.toughnessExcluded, undefined);
assert.equal(transfers[0].data.type, 'electric');
assert.equal(transfers[0].data.critical, true);
assert.equal(transfers[0].data.redirected, true);
incoming(damage, { ...damage, amount: 0, redirect: receiver.ref() });
assert.equal(transfers.length, 1, 'A completely guarded redirect must not call hurt with zero');
incoming({ ...damage, redirected: true }, { ...damage, redirect: receiver.ref() });
assert.equal(transfers.length, 1, 'Already transferred damage cannot redirect recursively');
const untouched = incoming(damage, damage);
assert.equal(untouched.armorExcluded, 24, 'Ordinary calculated damage retains its own projection metadata');
assert.equal(untouched.toughnessExcluded, 8);
console.log('PASS shared defence protocols: large finite guard pool/minimum, invalid values, real interception, redirect target isolation, retained hit facts, zero-damage and recursive redirect guards');

// An independent field recipe observes the same exported limits that its descriptions can display.
const fieldLimits = context.WorldEffects.fieldLimits, nearby = Array.from({ length: fieldLimits.maxActors + 3 }, (_, i) => actor('workshop:body-' + i));
const point = x => ({ x, minus: other => point(x - other.x), length: () => Math.abs(x),
  unit: () => point(Math.sign(x)), scale: factor => point(x * factor) });
context.WorldAI = { point: coordinates => point(coordinates[0]) };
let sourceDistance = fieldLimits.sourceRange, visited = [], scheduled, expired = false;
let fieldData = JSON.stringify({ rule: 'workshop:repair-zone', position: [0, 0, 0], radius: 4, data: {}, members: [] });
context.WorldEffects.fieldRule('workshop:repair-zone', { stay: (_world, target) => visited.push(target.ref()) });
const fieldWorld = { source: () => protectedBody, observe: target => ({ position: () => point(target === protectedBody ? sourceDistance : 0) }),
  query: () => nearby, clear: () => true, valid: () => true, actor: ref => nearby.find(target => target.ref() === ref) || null };
const fieldScope = { source: () => protectedBody, world: () => fieldWorld,
  state: json => json === undefined ? fieldData : fieldData = json,
  schedule: (_key, _handler, delay) => { scheduled = delay; }, end: () => { expired = true; } };
handlers.get('world_combat:field/scan')(fieldScope);
assert.equal(visited.length, nearby.length, 'A field visits every eligible body, without an implicit per-scan content cap');
assert.equal(scheduled, fieldLimits.scanInterval);
assert.equal(expired, false, 'A field remains valid at its declared source-distance boundary');
sourceDistance += .01; visited = []; scheduled = undefined;
handlers.get('world_combat:field/scan')(fieldScope);
assert.equal(expired, true);
assert.equal(visited.length, 0);
assert.equal(scheduled, undefined);
console.log('PASS shared field descriptions can read the actual scan count, interval and source-distance boundary');

let fieldSequence = 0, lifetimeChecks = 0;
function fieldHarness(rule = {}) {
  const id = typeof rule === 'string' ? rule : `fixture:field_${++fieldSequence}`;
  if (typeof rule !== 'string') context.WorldEffects.fieldRule(id, rule);
  const source = actor('fixture:source'), first = actor('fixture:first'), second = actor('fixture:second');
  const bodies = [source, first, second], live = new Set(bodies), observable = new Set(bodies);
  const state = { query: [first, second], ends: 0, schedules: [], writes: [], onQuery() {}, onEffect() {},
    friendly: () => false, field: { rule: id, position: [0, 0, 0], radius: 4, data: {}, members: [] } };
  const world = { source: () => source, valid: target => live.has(target), tick: () => 20,
    observe: target => live.has(target) && observable.has(target)
      ? { position: () => point(target === source ? 0 : 1), health: () => 5, maxHealth: () => 10 } : null,
    // A previously resolved handle can remain in the caller's snapshot after its body is unavailable.
    actor: ref => bodies.find(target => target.ref() === ref) || null,
    query: () => { const snapshot = state.query.slice(); state.onQuery(); return snapshot; }, clear: () => true,
    friendly: target => state.friendly(target), effects: () => [],
    effect: (kind, target) => { assert(world.observe(target)); state.writes.push(kind); state.onEffect(target); return 1; },
    deliver: target => { assert(world.observe(target)); state.writes.push('deliver'); },
    health: target => { assert(world.observe(target)); state.writes.push('health'); },
    displace: target => { assert(world.observe(target)); state.writes.push('displace'); } };
  const scope = { source: () => source, world: () => world,
    state: json => { if (json !== undefined) { assert.equal(state.ends, 0); state.field = JSON.parse(json); } return JSON.stringify(state.field); },
    schedule: (_key, _handler, delay) => { assert.equal(state.ends, 0); state.schedules.push(delay); },
    end: () => { state.ends++; } };
  function contribute(name, phase, apply, extra = {}, replace = false) {
    const contribution = { id: `fixture:${name}_${fieldSequence}`, applies: value => value.field.rule === id && value.phase === phase,
      apply, ...extra };
    context.WorldEffects.fieldRules[replace ? 'replace' : 'define'](contribution);
    return contribution.id;
  }
  return { id, source, first, second, world, state, contribute,
    remove: target => live.delete(target), hide: target => observable.delete(target),
    run: (phase = 'scan') => handlers.get(`world_combat:field/${phase}`)(scope) };
}
function fieldCheck(name, run) { run(); lifetimeChecks++; console.log(`PASS field lifetime: ${name}`); }

fieldCheck('query and scan callbacks can retire recipients while remaining recipients still execute', () => {
  for (const edge of ['query', 'scan']) {
    const calls = [];
    const h = fieldHarness({ scan() { if (edge === 'scan') h.hide(h.first); },
      enter: (_world, target) => calls.push('enter:' + target.ref()), stay: (_world, target) => calls.push('stay:' + target.ref()) });
    if (edge === 'query') h.state.onQuery = () => h.remove(h.first);
    h.run(); assert.deepEqual(calls, ['enter:' + h.second.ref(), 'stay:' + h.second.ref()]);
    assert.deepEqual(h.state.field.members, [h.second.ref()]); assert.deepEqual(h.state.schedules, [fieldLimits.scanInterval]);
  }
});
fieldCheck('removal during entry suppresses its contributors and stay without suppressing other recipients', () => {
  const calls = [];
  const h = fieldHarness({ enter(_world, target) { calls.push('enter:' + target.ref()); if (target === h.first) h.remove(target); },
    stay: (_world, target) => calls.push('stay:' + target.ref()) });
  h.contribute('after_entry', 'enter', value => { assert(value.world.observe(value.actor)); calls.push('contribute:' + value.actor.ref()); });
  h.run(); assert.deepEqual(calls, ['enter:' + h.first.ref(), 'enter:' + h.second.ref(), 'contribute:' + h.second.ref(), 'stay:' + h.second.ref()]);
  assert.deepEqual(h.state.field.members, [h.second.ref()]);
});
fieldCheck('ordered contributors recheck observability before later predicates and apply callbacks', () => {
  const h = fieldHarness(); h.state.query = [h.first];
  const first = h.contribute('remove_recipient', 'enter', value => h.hide(value.actor));
  let predicates = 0, callbacks = 0;
  h.contribute('later_recipient', 'enter', () => callbacks++, { after: [first], applies(value) {
    if (value.field.rule !== h.id || value.phase !== 'enter') return false;
    predicates++; assert(value.world.observe(value.actor)); return true;
  } });
  h.run(); assert.equal(h.world.valid(h.first), true); assert.equal(predicates, 0); assert.equal(callbacks, 0);
  assert.deepEqual(h.state.field.members, []);
});
fieldCheck('replaced contribution predicates cannot hand a retired recipient to their apply callback', () => {
  const h = fieldHarness(); h.state.query = [h.first];
  let callbacks = 0;
  h.contribute('predicate_lifetime', 'enter', () => assert.fail('The replaced callback must not run'));
  h.contribute('predicate_lifetime', 'enter', () => callbacks++, { applies(value) {
    if (value.field.rule !== h.id || value.phase !== 'enter') return false;
    h.remove(value.actor); return true;
  } }, true);
  h.run(); assert.equal(callbacks, 0); assert.deepEqual(h.state.field.members, []);
});
fieldCheck('later callbacks retire earlier members before the scan is saved', () => {
  let contributions = 0;
  const h = fieldHarness({ stay(_world, target) { if (target === h.second) { h.remove(h.first); h.remove(h.second); } } });
  h.state.field.members = [h.first.ref(), h.second.ref()];
  h.contribute('stay_lifetime', 'stay', value => { assert(value.world.observe(value.actor)); contributions++; });
  h.run(); assert.equal(contributions, 1); assert.deepEqual(h.state.field.members, []);
});
fieldCheck('scan exits and final cleanup skip recipients removed by an earlier leave callback', () => {
  for (const phase of ['scan', 'end']) {
    const calls = [];
    const h = fieldHarness({ leave(_world, target) { calls.push(target.ref()); h.remove(h.first); h.remove(h.second); } });
    h.state.query = []; h.state.field.members = [h.first.ref(), h.second.ref()];
    h.contribute('leave_lifetime', 'leave', () => assert.fail('A removed recipient cannot receive a contribution'));
    h.run(phase); assert.deepEqual(calls, [h.first.ref()]);
    if (phase === 'scan') assert.deepEqual(h.state.field.members, []);
    else assert.equal(h.state.schedules.length, 0);
  }
});
fieldCheck('source disappearance stops every scan stage and prevents rescheduling', () => {
  for (const edge of ['initial', 'query', 'scan', 'contribution', 'enter', 'stay', 'leave']) {
    let removed = false;
    const retire = () => { removed = true; h.hide(h.source); };
    const h = fieldHarness({
      scan() { assert(!removed); if (edge === 'scan') retire(); },
      enter() { assert(!removed); if (edge === 'enter') retire(); },
      stay() { assert(!removed); if (edge === 'stay') retire(); },
      leave() { assert(!removed); if (edge === 'leave') retire(); }
    });
    if (edge === 'initial') retire();
    if (edge === 'query') h.state.onQuery = retire;
    if (edge === 'leave') { h.state.query = []; h.state.field.members = [h.first.ref(), h.second.ref()]; }
    const first = h.contribute('source_lifetime', 'scan', () => { assert(!removed); if (edge === 'contribution') retire(); });
    h.contribute('source_later', 'scan', () => assert(!removed), { after: [first] });
    h.run(); assert.equal(h.state.ends, 1, edge); assert.equal(h.state.schedules.length, 0, edge);
  }
});
fieldCheck('built-in callbacks reacquire missing observations and stop multi-step writes on removal', () => {
  for (const [id, friendly] of [['world_combat:spring', true], ['world_combat:vortex', false]]) {
    const h = fieldHarness(id); h.state.query = [h.first];
    h.state.friendly = target => { h.hide(target); return friendly; };
    h.run(); assert.deepEqual(h.state.writes, []); assert.deepEqual(h.state.field.members, []);
  }
  for (const id of ['world_combat:mist', 'world_combat:snare']) {
    const h = fieldHarness(id); h.state.query = [h.first]; h.state.onEffect = target => h.remove(target);
    h.run(); assert.equal(h.state.writes.length, 1); assert.deepEqual(h.state.field.members, []);
  }
});
console.log(`PASS field observation lifetime: ${lifetimeChecks} neutral regression groups`);
