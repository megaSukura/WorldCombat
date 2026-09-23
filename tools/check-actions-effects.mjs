import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Engineering-only synthetic actors, identities and callbacks. No content units or build outputs are loaded.
if (process.argv.includes('--types')) {
  const packages = JSON.parse(fs.readFileSync('content/packs.json', 'utf8')).packages;
  const roots = ['sdk/core/index.d.ts', 'sdk/core/world.d.ts', 'sdk/cobblemon/index.d.ts',
    ...new Set(Object.values(packages).flatMap(value => value.sources || []))];
  const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  const options = ts.convertCompilerOptionsFromJson(config.compilerOptions, process.cwd()).options;
  const program = ts.createProgram(roots, { ...options, noEmit: true });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n'
  }));
  assert.equal(diagnostics.length, 0, 'Shared server libraries must type-check without emission');
  console.log('PASS shared server library type-check (no emission)');
  process.exit(0);
}

const listeners = new Map(), effects = new Map(), handlers = new Map(), registrations = new Map(), templates = new Map();
const worldHits = [], fieldRequests = [];
let tick = 100, rolls = 0, sequence = 0;
const noop = () => {};
function point(x, y, z) {
  return { x: () => x, y: () => y, z: () => z, plus: p => point(x + p.x(), y + p.y(), z + p.z()),
    minus: p => point(x - p.x(), y - p.y(), z - p.z()), scale: n => point(x * n, y * n, z * n),
    length: () => Math.hypot(x, y, z), unit() { return this.scale(1 / this.length()); } };
}
const context = vm.createContext({ WorldCombat: {
  point, event: noop, phase: noop,
  on: (id, topic, after, handler) => listeners.set(id, { topic, after, handler }),
  effect: (id, _schema, _ticks, _scope, normalize) => effects.set(id, normalize),
  effectHandler: (id, event, handler) => handlers.set(`${id}/${event}`, handler)
}, CobblemonCombat: {
  loadout: noop, channel: noop, pokemon(actor) { assert(actor.pokemon, 'Native access requires a native actor'); return actor.pokemon; },
  registerAction: (id, _version, _ticks, kind, range, recipe) => registrations.set(id, { kind, range, recipe }),
  moveTemplate: id => { assert(templates.has(id), `Unknown synthetic move ${id}`); return templates.get(id); },
  ppCost(action, slot, key, amount) { assert(action.raw, 'Resource adapters receive the original host action'); return { actor: action.actor(), slot, key, amount }; },
  resetCritical: noop, record: noop, consumeHeld: noop, typeEffectiveness: () => 1,
  data: (_world, actor, key) => actor.data.get(key) ?? null,
  compareData: (_world, actor, key, expected, value) => {
    if ((actor.data.get(key) ?? null) !== expected) return false;
    actor.data.set(key, value); return true;
  }
}, WorldAI: { point: values => point(...values), coordinates: p => [p.x(), p.y(), p.z()] } });
const sources = ['content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/protocols/effects.ts', 'content/traits/composition.ts',
  'content/preferences/skill-preferences.ts', 'content/behavior/companion-menus.ts',
  ...['formula', 'status-vocabulary', 'combat-status', 'combatant-stats', 'combat-stages', 'native-abilities', 'native-items', 'native-semantics', 'native-modifiers',
    'native-effects', 'native-loadout', 'living-actions', 'native-repertoire', 'guard-effects', 'world-environment', 'mob-effects', 'status-contributions', 'world-effects', 'world-abilities',
    'pokemon-damage'].map(id => `content/mechanisms/${id}.ts`)];
for (const file of sources) vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None }
}).outputText, context, { filename: file });
vm.runInContext(ts.transpileModule('namespace PokemonSkills { export var define: any, field: any, p: any, damageFeatures: any, damageSegments: any, feedback: any; }\n' +
  ['content/library/skills/effects.ts', 'content/library/skills/actions.ts'].map(file => fs.readFileSync(file, 'utf8')).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None }
}).outputText, context);
const { CombatStatus: S, NativeLoadout: L, NativeEffects: N, LivingActions: A, GuardEffects: G, WorldEffects: W, WorldAbilities: B, PokemonSkills: P } = context;
const helperCatalogue = context.NativeRepertoire.create({ namespace: 'fixture' });
P.define = helperCatalogue.define; P.field = helperCatalogue.field; P.p = () => 20; P.feedback = noop;
P.damageFeatures = () => ({ damage: { base: 4, coefficient: 0 }, critical: false });
P.damageSegments = () => [];
const actors = [];
function actor(id, native = false, friendly = false, x = 0) {
  const value = { id, native, friendly, x, alive: true, health: 100, maximum: 100, status: '', ability: '', pp: 6,
    markers: new Map(), data: new Map(), modifiers: [], state: N.empty(), domain: () => native ? 'cobblemon' : 'minecraft', ref: () => id + '/1', key: () => id };
  if (native) value.pokemon = {
    id: () => id, moveSlots: () => 1, move: () => value.move, status: () => value.status,
    ability: () => value.ability, heldItem: () => '', heldTag: () => false, species: () => 'fixture:body',
    health: () => value.health, maxHealth: () => value.maximum, healthScale: () => 1, typeCount: () => 0,
    level: () => 1, stat: () => 10, projectedArmor: () => 0, projectedToughness: () => 0,
    vehicle: () => !!value.mounted, passenger: () => !!value.passenger, grounded: () => value.grounded !== false,
    activeState: () => new String('sent-out'), ridingStyle: () => value.mounted ? value.grounded === false ? 'air' : 'land' : ''
  };
  actors.push(value); return value;
}
const source = actor('source', true, true), enemy = actor('recipient', false, false, 3), friend = actor('partner', false, true, 2);
const world = { source: () => source, tick: () => tick, random: () => { rolls++; return .1; }, valid: a => a.alive,
  friendly: a => a.friendly, actor: ref => actors.find(a => a.ref() === ref && a.alive) || null,
  observe: a => a.alive ? { position: () => point(a.x, 0, 0), health: () => a.health, maxHealth: () => a.maximum } : null,
  effects: (a, id) => id === 'cobblemon_world_combat:individual' && a.native ? [{ id: () => actors.indexOf(a) + 1, data: () => JSON.stringify(a.state) }]
    : id === 'cobblemon_world_combat:modifier' ? a.modifiers : [],
  attributeValue: () => null,
  operation(id, _operation, data) { actors[id - 1].state = JSON.parse(data); return true; },
  health(a, delta) { const old = a.health; a.health = Math.min(a.maximum, Math.max(0, old + delta)); if (!a.health) a.alive = false; return a.health - old; },
  mobEffects: a => [...a.markers.values()], mobEffect: (a, id) => a.markers.get(id) || null,
  removeMobEffect(a, id, key) { return a.markers.get(id)?.key() === key && a.markers.delete(id); },
  marker(a, id, duration, amplifier) {
    const names = carrierTags.get(id) || [], key = String(++sequence);
    a.markers.set(id, { id: () => id, key: () => key, duration: () => duration, amplifier: () => amplifier,
      tags: () => names.map(S.tag).join(' '), tagged: name => names.map(S.tag).includes(name) });
  }, clear: () => true, query: () => [], navigate: () => 'moving', signal: (_id, _version, _target, data) => data,
  sound: noop,
  effect(id, target, json, ticks) {
    const data = JSON.parse(effects.get(id)(json)); fieldRequests.push({ id, target, data, ticks }); return ++sequence;
  },
  hurt(target, amount, metadata) {
    const data = JSON.parse(metadata);
    try { emit('world_combat:damage_incoming', source, target, { ...data, amount }); }
    catch (error) { if (String(error.message).startsWith('rejected:')) return false; throw error; }
    worldHits.push({ target, amount, data }); return true;
  }
};
const carrierTags = new Map([['fixture:resting', ['sleep']], ['fixture:fixed', ['frozen']], ['fixture:slow', ['paralysis']],
  ['fixture:alpha', ['fixture_identity']], ['fixture:beta', ['fixture_identity']],
  ['fixture:thermal_a', ['burn']], ['fixture:thermal_b', ['burn']]]);
function emit(topic, from, target, data = {}, action = null) {
  let payload = JSON.stringify(data);
  const event = { topic: () => topic, world: () => world, actor: () => from, target: () => target, action: () => action,
    data(value) { if (value !== undefined) payload = value; return payload; }, reject: reason => { throw Error(`rejected:${reason}`); } };
  const done = new Set();
  function visit(id) {
    if (done.has(id)) return;
    const listener = listeners.get(id); if (!listener || listener.topic !== topic) return;
    done.add(id); for (const before of listener.after.split(',').filter(Boolean)) visit(before);
    listener.handler(event);
  }
  for (const id of listeners.keys()) visit(id);
  return JSON.parse(payload);
}
function template(id, kind = 'physical') {
  const move = { id: () => id, key: () => `key-${id}`, category: () => kind, type: () => 'normal', power: () => 1,
    pp: () => source.pp, maxPp: () => 6, priority: () => 0, critRatio: () => 1, accuracy: () => 100 };
  templates.set(id, move); return move;
}
function register(id, kind = 'enemy', recipe = noop, range = 8) {
  template(id); L.define(id, `fixture:${id}`, '1', 100, kind, range, recipe); return templates.get(id);
}
function action(target = enemy, range = 8, inputArguments = {}) {
  const store = new Map(), subscriptions = new Map(), timers = [], costs = [];
  const arguments_ = { 'native-slot': '0', 'native-move': source.move.key(), 'native-selection': 'native', ...inputArguments };
  let token = 0, open = true, committed = false, released = false, nativeCooldown = 0, hits = [], kind = target ? 'enemy' : 'point';
  const maximum = range; let position = target ? point(target.x, 0, 0) : point(4, 0, 0), direction = point(1, 0, 0);
  const check = () => assert(open, 'No action access after cancellation');
  const raw = { raw: true, id: () => 1, content: () => 'fixture:entry', actor: () => source, target: () => target,
    sense: () => world, world: () => { check(); assert(committed, 'World writes require commit'); return world; },
    argument: key => arguments_[key] ?? null,
    origin: () => point(0, 0, 0), targetPosition: () => {
      if (!released && target) { if (!target.alive) throw Error('rejected:target-left'); position = point(target.x, 0, 0); }
      return position;
    },
    direction: () => direction, range: () => range, targetKind: () => kind,
    retarget(nextKind, nextTarget, nextPoint, nextDirection, nextRange) {
      check(); assert(!committed); assert(nextRange <= maximum);
      target = nextTarget; position = nextPoint; direction = nextDirection; range = nextRange; kind = nextKind; released = false;
    }, control: () => '{}', stage: noop,
    data(key, value) { check(); if (value !== undefined) store.set(key, value); return store.get(key) ?? null; },
    on(event, callback) { check(); subscriptions.set(++token, { event, callback }); return token; },
    off(id) { check(); subscriptions.delete(id); }, emit(event) {
      for (const item of [...subscriptions.values()]) { if (open && item.event === event) item.callback(raw); }
    },
    after(delay, callback) { check(); timers.push({ at: tick + delay, callback }); },
    cost(value) { check(); assert(!committed); costs.push(value); },
    commit(cooldown) {
      check(); assert(!committed); emit('world_combat:before_commit', source, target, {}, raw);
      for (const cost of costs) { assert.equal(cost.key, source.move.key()); assert(source.pp >= cost.amount); }
      for (const cost of costs) source.pp -= cost.amount;
      committed = true; nativeCooldown = cooldown; emit('world_combat:committed', source, target, {}, raw);
    },
    releaseTarget() { check(); assert(committed); position = this.targetPosition(); released = true; },
    hit(_impact, amount, strike, metadata) { check(); hits.push({ amount, strike, data: JSON.parse(metadata) }); return true; },
    projectile(_origin, _velocity, _gravity, _radius, _range, _lifetime, hit, complete) {
      timers.push({ at: tick + 1, callback: current => hit(current, { target: () => enemy }) });
      timers.push({ at: tick + 2, callback: complete }); return 'fixture-projectile';
    },
    approach: () => 'moving', face: noop, stopMovement: noop, present: noop,
    reject(reason) { throw Error(`rejected:${reason}`); }, cancel() { check(); open = false; timers.length = 0; subscriptions.clear(); },
    finish() { this.cancel(); },
    advance() { tick++; for (const task of [...timers]) if (task.at <= tick) { timers.splice(timers.indexOf(task), 1); if (open) task.callback(raw); } },
    get open() { return open; }, get committed() { return committed; }, get released() { return released; },
    get cooldown() { return nativeCooldown; }, get hits() { return hits; }, get subscriptionCount() { return subscriptions.size; }
  };
  return raw;
}
let count = 0;
function check(name, run) {
  for (const a of actors) { a.alive = true; a.health = 100; a.markers.clear(); a.modifiers = []; a.status = ''; a.ability = ''; a.state = N.empty(); }
  source.pp = 6; source.mounted = false; source.passenger = false; source.grounded = true;
  rolls = 0; worldHits.length = 0; fieldRequests.length = 0; run(); count++; console.log(`PASS ${name}`);
}
source.move = register('entry');
register('recipient_route', 'enemy', current => {
  current.after(1, later => { later.commit(7); later.hit({}, 2, 'unit', '{"move":"recipient_route"}'); });
});
register('point_route', 'point', current => current.after(1, later => later.commit(7)));
register('partner_route', 'friend', noop, 5); register('self_route', 'self');
register('exception_route');
L.configure('exception_route', { flags: { alternate: true }, eligibility(policy) {
  if (policy.metadata.flags.alternate) delete policy.blocked.asleep;
} });
check('availability, commit and outgoing gates share metadata policy without dropping independent restrictions', () => {
  source.move = templates.get('exception_route'); source.status = 'cobblemon:sleep'; world.marker(source, 'fixture:resting', 20, 0);
  function available() {
    let reason = '';
    L.slot({ world: () => world, pokemon: () => source.pokemon, slot: () => 0, bind: noop, resource: noop, argument: noop,
      unavailable: value => { reason = value; } });
    return reason;
  }
  assert.equal(available(), '');
  assert.equal(context.NativeModifiers.restriction(world, source, source.move), '');
  assert.equal(context.NativeModifiers.restriction(world, source, templates.get('entry')), 'asleep');
  source.move = templates.get('entry'); assert.equal(available(), 'asleep');
  assert.throws(() => L.prepare(action(), 'entry'), /asleep/); assert.equal(source.pp, 6);
  source.move = templates.get('exception_route');
  const current = action(); L.prepare(current, 'exception_route'); current.commit(3); assert.equal(source.pp, 5);
  emit('world_combat:damage_incoming', source, enemy, { amount: 2, kind: 'move', move: 'exception_route' });
  world.marker(source, 'fixture:fixed', 20, 0);
  assert.equal(context.NativeModifiers.restriction(world, source, source.move), 'frozen');
  assert.throws(() => emit('world_combat:damage_incoming', source, enemy, { amount: 2, move: 'entry' }), /asleep/);
});
check('attempt probability is never rolled by queries and rejected commit leaves resources intact', () => {
  source.move = templates.get('entry'); world.marker(source, 'fixture:slow', 20, 0);
  for (let i = 0; i < 4; i++) assert.equal(context.NativeModifiers.restriction(world, source, source.move), '');
  assert.equal(rolls, 0); const current = action(); L.prepare(current, 'entry');
  assert.throws(() => current.commit(3), /paralyzed/); assert.equal(rolls, 1); assert.equal(source.pp, 6);
});
check('native flags and metadata combine with content policy without mutating template facts', () => {
  const move = { ...templates.get('exception_route'), flags: () => '{"native_flag":1,"alternate":false}', metadata: () => '{"weight":3}' };
  L.metadata.define({ id: 'fixture:metadata', apply: value => { value.flags.contributed = true; } });
  const facts = L.facts(move); assert(facts.flags.native_flag); assert(facts.flags.alternate); assert(facts.flags.contributed);
  assert.equal(facts.data.weight, 3); assert.equal(JSON.parse(move.flags()).alternate, false);
  L.metadata.remove('fixture:metadata');
});
check('public slot selection is read-only and identical through binding, preparation and submission', () => {
  source.move = templates.get('entry');
  register('replacement_route'); templates.get('replacement_route').pp = () => 99;
  const modifier = (id, move) => ({ id: () => id, data: () => JSON.stringify({ moves: { 0: move } }) });
  const readOnly = { ...world, operation() { throw Error('read-only'); }, effect() { throw Error('read-only'); } };
  assert.equal(L.selection(readOnly, 0, source.move).id, 'entry'); assert.equal(L.selection(readOnly, 0, source.move).key, 'native');
  source.modifiers = [modifier(9, 'replacement_route'), modifier(4, 'entry')];
  const selected = L.selection(readOnly, 0, source.move), input = {}, resource = [];
  assert.equal(selected.id, 'replacement_route'); assert.equal(selected.key, '9');
  assert.deepEqual(source.modifiers.map(value => value.id()), [9, 4], 'Queries preserve the source effect order');
  L.slot({ world: () => readOnly, pokemon: () => source.pokemon, slot: () => 0,
    bind: (id, identity) => { assert.equal(id, 'fixture:replacement_route'); assert.equal(identity, `${source.move.key()}/9/replacement_route`); },
    resource: (pp, maximum) => resource.push(pp, maximum), argument: (key, value) => { input[key] = value; },
    unavailable: reason => assert.fail(reason) });
  assert.deepEqual(resource, [6, 6]); assert.equal(input['native-selection'], selected.key); assert.equal(source.pp, 6);
  const current = action(enemy, 8, input);
  assert.equal(L.prepare(current, selected.id).id(), selected.id);
  L.call(current, 'recipient_route', { cooldown: 19 }); current.advance();
  const invocation = L.invocation(current);
  assert.equal(invocation.source, 'entry'); assert.equal(invocation.design, 'replacement_route'); assert.equal(invocation.executing, 'recipient_route');
  assert.equal(invocation.key, source.move.key()); assert.equal(source.pp, 5); assert.equal(current.cooldown, 19);
  const pending = action(enemy, 8, input); L.prepare(pending, selected.id);
  source.modifiers = [modifier(10, 'replacement_route')];
  assert.throws(() => pending.commit(3), /loadout-changed/); assert.equal(source.pp, 5);
  source.modifiers = []; assert.equal(L.selection(readOnly, 0, source.move).key, 'native');
});
check('effective equipped queries belong to the recipient and follow copied-slot lifetimes', () => {
  const counter = register('counter_route'), recipient = actor('loadout-recipient', true, false, 3);
  const equipped = [null, templates.get('entry'), null];
  recipient.pokemon.moveSlots = () => equipped.length;
  recipient.pokemon.move = slot => equipped[slot];
  const readOnly = { ...world, operation() { throw Error('read-only'); }, effect() { throw Error('read-only'); } };
  source.move = counter; source.pp = 0;
  assert(L.hasEquipped(readOnly, source, 'counter_route'), 'PP does not change equipped identity');
  assert(!L.hasEquipped(readOnly, recipient, 'counter_route'), 'The attacker loadout is not the recipient loadout');
  assert(L.hasEquipped(readOnly, recipient, 'entry'), 'Empty slots are skipped');
  assert(!L.hasEquipped(readOnly, enemy, 'counter_route'), 'Non-native actors require no native access');
  world.marker(recipient, 'fixture:copy', 20, 0);
  const carrier = context.MobEffects.anchor(world.mobEffect(recipient, 'fixture:copy'));
  recipient.modifiers = [{ id: () => 17, data: () => JSON.stringify({ moves: { 1: 'counter_route' }, carrier }) }];
  assert.equal(L.selection(readOnly, 1, equipped[1], recipient).id, 'counter_route');
  assert(L.hasEquipped(readOnly, recipient, 'counter_route'));
  assert(!L.hasEquipped(readOnly, recipient, 'entry'), 'A replaced slot stops exposing its original move');
  recipient.modifiers.push({ id: () => 18, data: () => '{"moves":{"1":"entry"}}' });
  assert(!L.hasEquipped(readOnly, recipient, 'counter_route'), 'A newer replacement removes the copied capability');
  recipient.modifiers.pop(); recipient.markers.delete('fixture:copy');
  assert(!L.hasEquipped(readOnly, recipient, 'counter_route'), 'An expired copy carrier removes the copied capability');
  assert(L.hasEquipped(readOnly, recipient, 'entry'));
  recipient.alive = false;
  assert(!L.hasEquipped(readOnly, recipient, 'entry'), 'Unavailable actors expose no equipped capability');
});
check('inline input crosses entity, point, ally and self categories with bounded reach and recursion', () => {
  source.move = templates.get('entry'); const current = action(null); L.prepare(current, 'entry');
  assert.equal(L.choose(current, ['recipient_route'], { input: { target: enemy } }), 'recipient_route');
  assert.equal(L.choose(current, ['partner_route'], { input: { target: friend } }), 'partner_route');
  assert.equal(L.choose(current, ['partner_route'], { input: { target: enemy } }), null);
  assert.equal(L.choose(current, ['self_route']), 'self_route');
  let mapped = 0;
  const selection = L.select(current, ['partner_route'], () => { mapped++; return { input: { target: friend } }; });
  assert.equal(mapped, 1); assert.equal(selection.id, 'partner_route'); assert.equal(selection.options.input.target, friend);
  assert.equal(L.choose(current, ['entry']), null);
  assert.equal(L.choose(current, ['point_route'], { input: { point: point(9, 0, 0) } }), null);
  L.call(current, 'recipient_route', { input: { target: enemy }, cooldown: 17 }); current.advance();
  assert(current.committed); assert(!current.released); assert.equal(current.target(), enemy); assert.equal(current.cooldown, 17); assert.equal(source.pp, 5);
  assert.equal(current.hits[0].data.eligibilityMove, 'recipient_route');
  assert.equal(N.lastMove(world, source).id, 'recipient_route'); assert.equal(N.lastMove(world, source).source, 'entry');
  assert.equal(N.lastMove(world, source).key, source.move.key());
  const second = action(enemy); L.prepare(second, 'entry'); L.call(second, 'point_route'); second.advance();
  assert(second.committed); assert.equal(L.invocation(second).input.target, null);
});
check('caller eligibility survives inline commit and hit while fresh target and slot facts are revalidated', () => {
  source.move = templates.get('exception_route'); source.status = 'cobblemon:sleep'; world.marker(source, 'fixture:resting', 20, 0);
  const current = action(null); L.prepare(current, 'exception_route');
  assert.equal(L.choose(current, ['recipient_route'], { input: { target: enemy } }), null);
  L.call(current, 'recipient_route', { input: { target: enemy }, eligibility: 'caller' }); current.advance();
  emit('world_combat:damage_incoming', source, enemy, { amount: 2, ...current.hits[0].data, flags: { alternate: false } });
  const stale = action(null); L.prepare(stale, 'exception_route');
  L.call(stale, 'recipient_route', { input: { target: enemy }, eligibility: 'caller' });
  enemy.alive = false; const pp = source.pp;
  assert.throws(() => stale.advance(), /target-left/); assert.equal(source.pp, pp);
  enemy.alive = true;
  const changed = action(); L.prepare(changed, 'exception_route'); source.move = templates.get('entry');
  assert.throws(() => changed.commit(3), /loadout-changed/); assert.equal(source.pp, pp);
});
check('shared and self-managed lifecycles cancel preparation, execution and recovery once', () => {
  source.move = templates.get('entry');
  for (const phase of ['prepare', 'execute', 'recover']) {
    const current = action(); L.prepare(current, 'entry'); A.lifecycle(current); A.lifecycle(current);
    A.run(current, { prepare: phase === 'prepare' ? 2 : 0, recover: 3, cooldown: 4 }, (next, done) => {
      if (phase === 'recover') done(next); else next.after(2, done);
    });
    assert.equal(current.subscriptionCount, 2); const paid = source.pp; current.emit('world_combat:interrupt');
    current.advance(); assert(!current.open); assert.equal(source.pp, paid);
  }
  let executed = false;
  register('custom_route', 'enemy', current => current.after(1, later => { executed = true; later.commit(4); }));
  source.move = templates.get('custom_route'); const custom = action();
  registrations.get('fixture:custom_route').recipe(custom); custom.emit('world_combat:interrupt'); custom.advance(); assert(!executed);
  const resistant = action(); A.lifecycle(resistant, { interruptible: false }); resistant.emit('world_combat:interrupt');
  assert(resistant.open); resistant.emit('world_combat:input-stop'); assert(!resistant.open);
});
check('mapped deferred and projectile callbacks retain inputs and the same host resource identity', () => {
  source.move = templates.get('entry'); const current = action(); L.prepare(current, 'entry');
  L.call(current, 'partner_route', { input: { target: friend } });
  const mapped = L.view(current);
  mapped.commit(3); assert.equal(A.host(mapped), current);
  let hits = 0, finished = 0;
  mapped.projectile(point(0, 0, 0), point(1, 0, 0), 0, .1, 4, 20, later => {
    assert.equal(later.target().ref(), friend.ref()); assert.equal(later.targetPosition().x(), 2); hits++;
  }, later => { assert.equal(later.range(), 5); finished++; });
  friend.x = 6; current.advance(); current.advance(); assert.equal(hits, 1); assert.equal(finished, 1); friend.x = 2;
});
check('catalogue wiring preserves caller cooldown and recovery with callee execution and one source PP cost', () => {
  const catalogue = context.NativeRepertoire.create({ namespace: 'fixture' });
  const base = { name: 'Synthetic', description: '', uses: [], kind: 'enemy', range: 8, defaults: {}, fields: [], style: '', cooldown: 4, recover: 9 };
  template('catalogue_entry'); template('catalogue_child');
  catalogue.define({ ...base, id: 'catalogue_child', execute: (current, _move, _settings, done) => done(current) });
  catalogue.define({ ...base, id: 'catalogue_entry', run: current => L.call(current, 'catalogue_child', { cooldown: 11, recover: 2 }) });
  source.move = templates.get('catalogue_entry'); const current = action();
  registrations.get('fixture:catalogue_entry').recipe(current);
  assert.equal(current.cooldown, 11); assert.equal(source.pp, 5); assert(current.open);
  current.advance(); assert(current.open); current.advance(); assert(!current.open);
});
check('riding catalogue permits aerial casts and rejects independent motion or missing ground before payment', () => {
  const catalogue = context.NativeRepertoire.create({ namespace: 'fixture' });
  const base = { name: 'Synthetic', description: '', uses: [], kind: 'enemy', range: 8, defaults: {}, fields: [], style: '',
    prepare: 2, execute: (current, _move, _settings, done) => done(current) };
  for (const [id, extra] of [['aerial_payload', {}], ['independent_motion', { freeMovement: true }], ['ground_payload', { requiresGround: true }]]) {
    template(id); catalogue.define({ ...base, id, ...extra });
  }
  function available(id) {
    source.move = templates.get(id); let reason = '';
    L.slot({ world: () => world, pokemon: () => source.pokemon, slot: () => 0, bind: noop, resource: noop, argument: noop, range: noop,
      unavailable: value => { reason = value; } });
    return reason;
  }
  source.mounted = true; source.grounded = false;
  assert.equal(available('aerial_payload'), '');
  let current = action(); registrations.get('fixture:aerial_payload').recipe(current);
  current.advance(); current.advance(); assert.equal(source.pp, 5);
  assert.equal(available('independent_motion'), 'mounted-control');
  assert.throws(() => registrations.get('fixture:independent_motion').recipe(action()), /mounted-control/);
  assert.equal(available('ground_payload'), 'not-grounded');
  assert.throws(() => registrations.get('fixture:ground_payload').recipe(action()), /not-grounded/);
  assert.equal(source.pp, 5);
  source.grounded = true; assert.equal(available('ground_payload'), '');
  current = action(); registrations.get('fixture:ground_payload').recipe(current);
  source.grounded = false; current.advance(); assert.throws(() => current.advance(), /not-grounded/);
  assert.equal(source.pp, 5, 'Taking off during preparation preserves PP');
  source.mounted = false; assert.equal(available('independent_motion'), '');
  current = action(); registrations.get('fixture:independent_motion').recipe(current);
  source.mounted = true; current.advance(); assert.throws(() => current.advance(), /mounted-control/);
  assert.equal(source.pp, 5, 'Mounting during preparation preserves PP');
});
check('riding policy follows the configured variant for both submission and self-managed commit', () => {
  const catalogue = context.NativeRepertoire.create({ namespace: 'fixture' });
  template('conditional_anchor');
  catalogue.define({ id: 'conditional_anchor', name: 'Synthetic', description: '', uses: [], kind: 'enemy', range: 8,
    defaults: { anchored: false }, fields: [], style: '', freeMovement: config => !!config.anchored,
    run: current => current.after(2, later => later.commit(1)) });
  const key = catalogue.prefKey('conditional_anchor');
  source.move = templates.get('conditional_anchor'); source.mounted = true; source.grounded = false;
  const current = action(); registrations.get('fixture:conditional_anchor').recipe(current);
  source.data.set(key, JSON.stringify({ version: 1, patch: { anchored: true } }));
  current.advance(); assert.throws(() => current.advance(), /mounted-control/);
  assert.equal(source.pp, 6);
  assert.throws(() => registrations.get('fixture:conditional_anchor').recipe(action()), /mounted-control/);
  source.data.delete(key);
  const safe = action(); registrations.get('fixture:conditional_anchor').recipe(safe);
  safe.advance(); safe.advance(); assert.equal(source.pp, 5);
});
check('skill damage helpers retain action and paying identity across raw callbacks and world damage', () => {
  register('payload_route'); source.move = templates.get('exception_route'); source.status = 'cobblemon:sleep';
  world.marker(source, 'fixture:resting', 40, 0);
  const current = action(); L.prepare(current, 'exception_route'); L.call(current, 'payload_route', { eligibility: 'caller', cooldown: 23 });
  L.view(current).commit(5);
  const resolved = [];
  context.PokemonDamage.metadata.define({ id: 'fixture:action_context', apply: value => {
    resolved.push({ action: value.action, id: value.metadata.action, move: value.move.id() });
  } });
  const hit = { target: () => enemy, projectile: () => '' };
  assert(P.impact(current, hit, 'payload_route', 2, undefined, 'fixture-strike'));
  const payload = current.hits.at(-1).data;
  assert.equal(payload.eligibilityMove, 'exception_route'); assert.equal(payload.move, 'payload_route'); assert.equal(payload.action, current.id());
  emit('world_combat:damage_incoming', source, enemy, { amount: current.hits.at(-1).amount, ...payload });
  assert(P.hurt(current, enemy, 'payload_route', 2));
  assert.equal(worldHits.at(-1).data.eligibilityMove, 'exception_route'); assert.equal(worldHits.at(-1).data.action, current.id());
  assert.equal(resolved.length, 2); assert(resolved.every(value => value.action === current && value.id === current.id() && value.move === 'payload_route'));
  assert.equal(source.pp, 5); assert.equal(current.cooldown, 23); assert.equal(L.invocation(current).key, source.move.key());
  assert.equal(P.hurt(world, enemy, 'payload_route', 2), false, 'A bare world scope carries its own ordinary eligibility');
  source.status = ''; source.markers.clear(); assert(P.hurt(world, enemy, 'payload_route', 2));
  assert.equal(worldHits.at(-1).data.eligibilityMove, undefined); assert.equal(worldHits.at(-1).data.action, 0);
  context.PokemonDamage.metadata.remove('fixture:action_context');
});
check('non-slot actions preserve explicit aim points while checking real entity positions and relations', () => {
  const casts = [], coordinates = value => [value.x(), value.y(), value.z()];
  const access = { ...world, busy: () => false, cooldown: () => 0, readiness: () => '',
    cast: (id, target, at, direction, args) => { casts.push({ id, target, at: coordinates(at), direction: coordinates(direction), args: JSON.parse(args) }); return casts.length; } };
  for (const kind of ['self', 'point', 'motion', 'enemy', 'friend', 'aim']) {
    const frame = { capabilities: [], services: { world: access } }, pointKind = kind === 'point' || kind === 'motion';
    B.grant(frame, { id: 'fixture:grant', action: 'fixture:non_slot', use: 'fixture:use', protocols: [], kind, range: kind === 'self' ? 0 : 8,
      arguments: { unit: 1 } });
    const expected = kind === 'self' ? source : pointKind ? null : kind === 'friend' ? friend : enemy;
    const input = { ref: expected && kind !== 'self' ? expected.ref() : 'fixture:point', point: [0, 0, pointKind ? 4 : 20] };
    assert(B.invoke(frame, 'fixture:grant', input));
    const cast = casts.at(-1); assert.equal(cast.target, expected); assert.deepEqual(cast.at, input.point);
    assert.deepEqual(cast.direction, [0, 0, 1]); assert.deepEqual(cast.args, { unit: 1 });
  }
});
check('non-slot target rejection keeps real range, relationships and live grant authority', () => {
  const casts = [];
  let busy = false, cooldown = 0;
  const access = { ...world, busy: () => busy, cooldown: () => cooldown, readiness: () => cooldown ? 'cooldown' : busy ? 'busy' : '',
    cast: (...args) => { casts.push(args); return 1; } };
  const frame = { capabilities: [], services: { world: access } };
  B.grant(frame, { id: 'fixture:grant', action: 'fixture:non_slot', use: 'fixture:use', protocols: [], kind: 'enemy', range: 4 });
  assert(!B.invoke(frame, 'fixture:grant', { ref: 'fixture:missing', point: [1, 0, 0] }));
  assert(!B.invoke(frame, 'fixture:grant', { ref: friend.ref(), point: [1, 0, 0] }));
  enemy.x = 5; assert(!B.invoke(frame, 'fixture:grant', { ref: enemy.ref(), point: [1, 0, 0] })); enemy.x = 3;
  assert(!B.invoke(frame, 'fixture:grant', { ref: enemy.ref(), point: [NaN, 0, 0] }));
  const input = { ref: enemy.ref(), point: [.005, 0, 0] };
  busy = true; assert(!B.invoke(frame, 'fixture:grant', input)); busy = false;
  cooldown = 1; assert(!B.invoke(frame, 'fixture:grant', input)); cooldown = 0;
  assert.equal(casts.length, 0); assert(B.invoke(frame, 'fixture:grant', input));
  assert.deepEqual([casts[0][3].x(), casts[0][3].y(), casts[0][3].z()], [0, 0, 1]);
  frame.capabilities[0].data.available = false; assert(!B.invoke(frame, 'fixture:grant', input));
  frame.capabilities = []; assert(!B.invoke(frame, 'fixture:grant', input));
  B.grant(frame, { id: 'fixture:aim_grant', action: 'fixture:aim', use: 'fixture:use', protocols: [], kind: 'aim', range: 4 });
  assert(!B.invoke(frame, 'fixture:aim_grant', { ref: friend.ref(), point: [1, 0, 0] }));
  B.grant(frame, { id: 'fixture:point_grant', action: 'fixture:point', use: 'fixture:use', protocols: [], kind: 'point', range: 4 });
  assert(!B.invoke(frame, 'fixture:point_grant', { ref: enemy.ref(), point: [5, 0, 0] }));
});
check('cloud helpers require a registered caller field and forward only its supplied exposure', () => {
  template('cloud_entry');
  assert.throws(() => P.cloud('cloud_entry', 'Synthetic', '', 'fixture:undefined_region'), /Unknown field rule/);
  assert.equal(helperCatalogue.skills.cloud_entry, undefined);
  W.fieldRule('fixture:cloud_region', {});
  P.cloud('cloud_entry', 'Synthetic', '', 'fixture:cloud_region', (_config, current) => ({ action: current.id(), value: 3 }));
  source.move = templates.get('cloud_entry'); const current = action(null, 10);
  registrations.get('fixture:cloud_entry').recipe(current);
  for (let i = 0; i < 24; i++) current.advance();
  assert.equal(fieldRequests.length, 1);
  const request = fieldRequests[0]; assert.equal(request.id, 'world_combat:field'); assert.equal(request.data.rule, 'fixture:cloud_region');
  assert.deepEqual(request.data.position, [4, 0, 0]); assert.deepEqual(request.data.data, { action: 1, value: 3 });
  assert.equal(request.ticks, 20); assert.equal(source.pp, 5); assert(!current.open);
  assert.equal(source.markers.size + enemy.markers.size + friend.markers.size, 0);
});
check('identity carriers are content-defined, optionally unique and gated for every combatant', () => {
  S.define('fixture_identity', { effect: 'fixture:alpha', amplifier: 0, ticks: () => 20 });
  assert.throws(() => S.define('fixture_identity', {}), /Duplicate/);
  for (const target of [source, enemy]) {
    assert(S.inflict(world, target, 'fixture_identity'));
    assert(S.apply(world, target, 'fixture_identity', 'fixture:beta', 30, 1, { unique: true }));
    assert.equal(S.tagged(world, target, 'fixture_identity').length, 1);
    assert.equal(S.representative(world, target, 'fixture_identity').id(), 'fixture:beta');
    assert.equal(S.actionReason(S.actionPolicy(world, target)), '');
  }
  context.NativeAbilities.define('fixture_secondary', { secondaryImmune: true }); source.ability = 'fixture_secondary';
  assert(!S.apply(world, source, 'fixture_identity', 'fixture:alpha', 20, 0, { secondary: true }));
  assert.equal(S.tagged(world, source, 'fixture_identity')[0].id(), 'fixture:beta');
  assert(S.apply(world, source, 'fixture_identity', 'fixture:alpha', 20, 0, { secondary: true, ignoreAbility: true, unique: true }));
  for (const id of ['fixture:thermal_a', 'fixture:thermal_b']) world.marker(enemy, id, 20, 0);
  tick = 200;
  for (const id of ['fixture:thermal_a', 'fixture:thermal_b']) emit('world_combat:mob_effect_tick', enemy, null, { id });
  assert.equal(enemy.health, 94, 'Multiple carriers trigger one shared periodic behavior');
});
check('content identity policies and authoritative interruption work independently of combatant domain', () => {
  S.actions.define({ id: 'fixture:identity_policy', applies: policy => S.has(policy.world, policy.actor, 'fixture_identity'),
    apply: policy => { policy.blocked.fixture_gate = true; } });
  for (const target of [source, enemy]) {
    world.marker(target, 'fixture:alpha', 20, 0);
    assert.throws(() => emit('world_combat:before_commit', target, null), /fixture_gate/);
    let cancelled;
    assert(A.interrupt({ interrupt: (actor, reason) => { cancelled = { actor, reason }; return true; } }, target, 'fixture:stop'));
    assert.equal(cancelled.actor, target); assert.equal(cancelled.reason, 'fixture:stop');
  }
  S.actions.remove('fixture:identity_policy');
});
check('guard filtering sees source and full metadata; callbacks can end exhausted effects safely', () => {
  let guarded = 0, ended = false, capacity = 5, pending = 0, payload;
  G.register('fixture:guard', {
    accepts: (_effect, _state, hit) => hit.source === enemy && hit.data.kind === 'fixture_hit' && hit.data.direct,
    guarded(effect, state, blocked, hit) {
      assert.equal(hit.source, enemy); assert.equal(hit.data.type, 'fixture_type'); assert.equal(hit.amount, 8);
      assert.equal(hit.remaining, 3); assert.equal(blocked, 5); assert.equal(state.capacity, 0); guarded++; effect.end();
    }
  });
  let state = JSON.stringify({ rule: 'fixture:guard', mode: 'pool', capacity, fraction: 1, minimumHealth: 1, charges: 0, linkRange: 0 });
  const ensure = () => assert(!ended, 'Ended effect handles cannot be reused');
  const scope = { world: () => world, source: () => source, target: () => source,
    state(value) { ensure(); if (value !== undefined) state = value; return state; },
    remaining(value) { ensure(); pending = value; }, end() { ensure(); ended = true; },
    event: () => ({ source: () => enemy, target: () => source, payload(value) { if (value !== undefined) payload = value; return payload; } }) };
  payload = '{"amount":8,"kind":"fixture_environment","direct":false}'; handlers.get('world_combat:guard/intercept')(scope);
  assert.equal(JSON.parse(state).capacity, 5); assert.equal(guarded, 0);
  payload = '{"amount":8,"kind":"fixture_hit","direct":true,"type":"fixture_type"}'; handlers.get('world_combat:guard/intercept')(scope);
  assert.equal(JSON.parse(payload).amount, 3); assert.equal(guarded, 1); assert(ended); assert.equal(pending, 1);
});
check('shared hit hooks and actual-damage drain/recoil cover every actor domain and zero-hit paths', () => {
  const seen = [], received = [];
  N.appliedRules.define({ id: 'fixture:applied', apply: hit => seen.push(hit.source) });
  N.incomingRules.define({ id: 'fixture:incoming', apply: hit => { received.push(hit.source); hit.data.amount *= .5; } });
  for (const from of [source, enemy]) {
    from.health = 50;
    N.applied({ world: () => world, actor: () => from, target: () => friend, data: () => '{"actual":8,"recoil":0.25,"drain":0.5}' });
    assert.equal(from.health, 52); assert.equal(seen.at(-1), from);
    const data = emit('world_combat:damage_incoming', from, friend, { amount: 8, move: 'fixture:external_action' }); assert.equal(data.amount, 4);
  }
  const before = seen.length;
  N.applied({ world: () => world, actor: () => enemy, target: () => friend, data: () => '{"actual":0,"recoil":1}' });
  assert.equal(seen.length, before); assert.equal(received.length, 2);
  context.NativeAbilities.define('fixture_resistance', { recoilImmune: true }); source.ability = 'fixture_resistance'; source.health = 50;
  N.applied({ world: () => world, actor: () => source, target: () => friend, data: () => '{"actual":8,"recoil":0.25}' });
  assert.equal(source.health, 50);
  N.appliedRules.remove('fixture:applied'); N.incomingRules.remove('fixture:incoming');
});
check('defender hit callbacks still run when settlement exhausts the attacker', () => {
  let received = 0;
  context.NativeAbilities.define('fixture_receiver', {}, { received: () => received++ });
  source.ability = 'fixture_receiver'; enemy.health = 1;
  const incomingWorld = { ...world, source: () => enemy, friendly: actor => actor === enemy,
    operation(...args) { assert(enemy.alive, 'Defender writes require the living event source'); return world.operation(...args); } };
  N.applied({ world: () => incomingWorld, actor: () => enemy, target: () => source, data: () => '{"actual":8,"recoil":0.5}' });
  assert(!enemy.alive); assert.equal(received, 1);
});
check('field registration is discoverable and named contributions compose with the owning rule', () => {
  const visited = [];
  assert(!W.hasFieldRule('fixture:absent'));
  assert.throws(() => W.field(world, 'fixture:absent', point(0, 0, 0), 2, {}, 20), /Unknown field rule/);
  W.fieldRule('fixture:region', { stay: () => visited.push('base') }); assert(W.hasFieldRule('fixture:region'));
  W.fieldRules.define({ id: 'fixture:addition', applies: value => value.field.rule === 'fixture:region',
    apply: value => { if (value.phase === 'stay') visited.push('contribution'); } });
  const localWorld = { ...world, query: () => [enemy] };
  let state = JSON.stringify({ rule: 'fixture:region', position: [0, 0, 0], radius: 4, data: {}, members: [] });
  handlers.get('world_combat:field/scan')({ world: () => localWorld, source: () => source,
    state(value) { if (value !== undefined) state = value; return state; }, schedule: noop, end: noop });
  assert.deepEqual(visited, ['base', 'contribution']);
});
check('independent field producers share an identity without replacing each others callbacks', () => {
  const stored=[]; const at=point(0,0,0);
  const local={...world,source:()=>source,observe:()=>({position:()=>at}),query:()=>[],
    effect(kind,actor,json){ stored.push({id:()=>stored.length+1,source:()=>source,data:()=>json});return stored.length; },
    effects(actor,kind){return kind==='world_combat:field'?stored:[];}};
  W.fieldRule('fixture:producer_one',{},'fixture:shared_region');
  W.fieldRule('fixture:producer_two',{},'fixture:shared_region');
  W.field(local,'fixture:producer_one',at,2,{},20); W.field(local,'fixture:producer_two',at,2,{},20);
  assert.equal(W.areas(local,'fixture:shared_region').length,2);
  assert.equal(W.areas(local,'fixture:producer_one').length,1);
  assert.throws(()=>W.fieldRule('fixture:producer_one',{}),/Duplicate field rule: fixture:producer_one/);
});
check('areas read every live field by real position, dimension, category and pending state', () => {
  const view = (id, actor, remaining, state) => ({ id: () => id, source: () => actor, remaining: () => remaining, data: () => JSON.stringify(state) });
  const terrain = { rule: 'fixture:zone_grass', identity: W.terrain('grassyterrain'), tags: [W.categories.terrain], position: [0, 0, 0], radius: 3, data: { n: 1 } };
  const hazard = { rule: 'fixture:zone_spikes', identity: W.hazard('spikes'), tags: [W.categories.hazard], position: [10, 0, 0], radius: 2, data: {} };
  const pending = { rule: 'fixture:zone_grass', position: [0, 0, 0], radius: 2, data: {} };
  const dimension = { ...world, effectsOfType: definition => definition === 'world_combat:field'
    ? [view(7, source, 40, terrain), view(9, enemy, 20, hazard)]
    : [view(11, source, 5, pending)] };
  assert.equal(W.areas(dimension).length, 3);
  assert.equal(W.areas(dimension, 'fixture:zone_grass').length, 2);
  assert.equal(W.areas(dimension, W.terrain('grassyterrain')).length, 1);
  assert.equal(W.hazards(dimension).length, 1);
  assert.equal(W.areasWithTag(dimension, W.categories.terrain, point(0, 0, 0), 0).length, 1);
  const reservations = W.areas(dimension, 'fixture:zone_grass').filter(area => area.pending);
  assert.equal(reservations.length, 1); assert.equal(reservations[0].id, 11); assert.equal(reservations[0].remaining, 5);
  assert.equal(W.areasAround(dimension, point(9, 0, 0), 1.5, 'fixture:zone_spikes').length, 1);
  assert.equal(W.areasAround(dimension, point(20, 0, 0), 1.5).length, 0);
});
check('fieldRule declares identity and tags, and membership binds one member mark', () => {
  W.fieldRule('fixture:tagged_zone', {}, { identity: W.terrain('electricterrain'), tags: [W.categories.terrain], lineOfSight: false });
  assert.equal(W.fieldIdentity('fixture:tagged_zone'), W.terrain('electricterrain'));
  assert.deepEqual(W.fieldTags('fixture:tagged_zone'), [W.categories.terrain]);
  W.membership('fixture:member_zone', 'fixture:member_mark', { ticks: 30, amplifier: 1 });
  assert(W.hasFieldRule('fixture:member_zone'));
});
check('weather reads the newest declared field, layers and restores the older sky', () => {
  const view = (id, tag) => ({ id: () => id, source: () => source, remaining: () => 20,
    data: () => JSON.stringify({ rule: 'fixture:sky_' + tag, identity: 'world_combat:weather/' + tag,
      tags: ['world_combat:category/weather', 'world_combat:weather/' + tag], position: [0, 0, 0], radius: 5, data: {} }) });
  const sky = (views) => ({ ...world, environment: () => JSON.stringify({ loaded: true, day: true, skyVisible: true, skyLight: 15, rain: 0, thunder: 0 }),
    effectsOfType: definition => definition === 'world_combat:field' ? views : [] });
  context.WorldEnvironment.defineWeather('sun', { sunlight: 1 });
  context.WorldEnvironment.defineWeather('rain', { sunlight: 0.3 });
  assert.equal(context.WorldEnvironment.weather(sky([view(3, 'sun'), view(8, 'rain')]), point(0, 0, 0)), 'rain');
  assert.equal(context.WorldEnvironment.sunlight(sky([view(3, 'sun'), view(8, 'rain')]), point(0, 0, 0)), 0.3);
  assert.equal(context.WorldEnvironment.weather(sky([view(3, 'sun')]), point(0, 0, 0)), 'sun');
  assert.equal(context.WorldEnvironment.weather(sky([]), point(0, 0, 0)), null);
  assert.equal(context.WorldEnvironment.weather(sky([view(3, 'sun')]), point(50, 0, 0)), null);
});
check('stepped displacement and native free-space probing reuse the host entries', () => {
  const legs = [];
  const shift = { ...world, displace: (_actor, delta) => { legs.push(delta.length()); return delta.length(); } };
  assert.equal(A.step(shift, source, point(0, 0, 9), 4), 9);
  assert.deepEqual(legs, [4, 4, 1]);
  const free = { ...world, freeSpace: (at, width, height) => width === .9 && height === 1.4 && at.x() === 2 && at.z() === 0 };
  assert(A.hasFreeSpace(free)); assert(A.freeSpace(free, point(2, 0, 0), .9, 1.4));
  const spot = A.freeSpot(free, point(0, 0, 0), .9, 1.4, 2);
  assert(spot && spot.x() === 2 && spot.z() === 0);
  assert.equal(A.freeSpot(world, point(0, 0, 0), .9, 1.4, 2), null);
});
console.log(`PASS actions/effects: ${count} neutral mechanism scenarios`);
