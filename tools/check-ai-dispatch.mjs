import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { loadContentManifest, resolvePackages } from './content-manifest.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = loadContentManifest('content/packs.json', root);
const packages = resolvePackages(manifest, ['world_combat:default_companion', 'world_combat:default_wild']);
const files = ['sdk/core/index.d.ts', 'sdk/core/world.d.ts', 'sdk/cobblemon/index.d.ts',
  ...packages.flatMap(id => manifest.packages[id].sources)];
const options = { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, strict: true, lib: ['lib.es5.d.ts'] };
const program = ts.createProgram(files.map(file => path.join(root, file)), options);
const errors = ts.getPreEmitDiagnostics(program);
const sources = [
  'content/behavior/composition.ts', 'content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/behavior/worksite.ts',
  'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/mechanisms/mob-effects.ts', 'content/mechanisms/combat-stages.ts',
  'content/mechanisms/native-modifiers.ts', 'content/mechanisms/native-loadout.ts', 'content/mechanisms/world-abilities.ts',
  'content/behavior/profiles.ts', 'content/behavior/world-methods.ts', 'content/behavior/world-host.ts',
  'content/behavior/pokemon-host.ts', 'content/behavior/pokemon-wild.ts',
  'content/library/companions/runtime.ts', 'content/library/companions/wild.ts',
  'content/behaviors/companion/rules.ts', 'content/behaviors/wild/rules.ts',
];
// Exercise production decision, loadout and policy code with neutral host observations and resource transactions.
const scripts = sources.map(file => {
  let script;
  const result = program.emit(program.getSourceFile(path.join(root, file)), (name, text) => { if (name.endsWith('.js')) script = text; });
  assert.equal(result.emitSkipped, false); assert.equal(typeof script, 'string'); return script;
});
const plain = value => JSON.parse(JSON.stringify(value));
const point = values => ({ x: () => values[0], y: () => values[1], z: () => values[2],
  minus: other => point(values.map((value, i) => value - [other.x(), other.y(), other.z()][i])),
  length: () => Math.hypot(...values), unit: () => point(values.map(value => value / (Math.hypot(...values) || 1))) });
const coordinates = value => [value.x(), value.y(), value.z()];
const subject = (ref, data = {}) => ({ ref, point: [0, 0, 0], velocity: [0, 0, 0], domain: 'minecraft', health: 100, maximum: 100, friendly: false, hostile: false,
  player: false, visible: true, speed: .2, wet: false, grounded: true, width: 1, height: 2, tags: '',
  effects: [], mobEffects: [], facts: {}, attacking: '', lastAttacker: '', hurtAgo: 1000, ...data });

function harness() {
  const state = { tick: 0, subjects: [], skills: [], casts: [], moves: [], faces: [], reports: [], nativeReads: {},
    busy: false, intent: 'follow', allowCast: true, probes: {}, world: null, definitions: {}, modifiers: [], payments: [], rolls: 0,
    effects: [], controls: [], nextInstance: 1 };
  const listeners = new Map(), effectHandlers = new Map();
  const self = subject('actor:self', { friendly: true, domain: 'cobblemon' });
  const threat = subject('actor:target', { point: [4, 0, 0], hostile: true });
  state.subjects = [self, threat];
  const moveView = (value, template = false) => {
    const data = { ...value };
    return { id: () => data.id, key: () => template ? 'template:' + data.id : data.key || data.id + ':key',
      pp: () => template ? 40 : data.pp, maxPp: () => template ? 40 : data.maxPp || 10,
      category: () => data.category || 'physical', flags: () => JSON.stringify(data.flags || {}), metadata: () => JSON.stringify(data.metadata || {}) };
  };
  const pokemon = (record, moves = []) => {
    const slots = moves.map(move => move ? moveView(move) : null);
    return { id: () => record.individual || record.ref, species: () => record.facts.species || 'test:species',
    level: () => 20, status: () => record.facts.status || '', wild: () => record.wild === true,
    owner: () => record.wild ? '' : 'actor:owner', aiEnabled: () => record.aiEnabled !== false,
    typeCount: () => (record.nativeTypes || ['type-a']).length, type: index => (record.nativeTypes || ['type-a'])[index],
    gender: () => record.nativeGender || 'none', form: () => record.nativeForm || 'base', aspects: () => JSON.stringify(record.nativeAspects || []),
    vehicle: () => false, passenger: () => false, friendship: () => 50, stat: () => 20,
    moveSlots: () => slots.length, move: slot => slots[slot] || null };
  };
  const actor = record => ({ ref: () => record.ref, domain: () => record.domain || (record === self ? 'cobblemon' : 'minecraft'),
    key: () => record.ref, record });
  const observe = handle => {
    const record = handle?.record; if (!record || !state.subjects.includes(record)) return null;
    const related = ref => state.subjects.find(entry => entry.ref === ref);
    return { actor: () => actor(record), position: () => point(record.point), health: () => record.health, maxHealth: () => record.maximum,
      ...(record.velocity ? { velocity: () => point(record.velocity) } : {}),
      movementSpeed: () => record.speed, visible: () => record.visible, friendly: () => record.friendly, hostile: () => record.hostile,
      player: () => record.player, wet: () => record.wet, grounded: () => record.grounded, width: () => record.width, height: () => record.height,
      tags: () => record.tags, hurtAgo: () => record.hurtAgo,
      attacking: () => related(record.attacking) ? actor(related(record.attacking)) : null,
      lastAttacker: () => related(record.lastAttacker) ? actor(related(record.lastAttacker)) : null };
  };
  const world = state.world = { source: () => actor(self), observe, tick: () => state.tick, busy: () => state.busy,
    closestPoint: (handle, from) => {
      const record = handle.record;
      if (!record.bounds) return point(record.point);
      const current = coordinates(from);
      return point(current.map((value, index) => Math.max(record.bounds[0][index], Math.min(record.bounds[1][index], value))));
    },
    actions: () => (state.instances || (state.busy ? [1] : [])).map(id => ({ instance: () => id })),
    claimed: () => state.movementBusy === undefined ? state.busy : state.movementBusy,
    readiness: id => world.cooldown(id) ? 'cooldown' : state.busy && !state.compatible ? 'busy' : '',
    survey: () => JSON.stringify(state.subjects), actor: ref => { const found = state.subjects.find(entry => entry.ref === ref); return found ? actor(found) : null; },
    valid: handle => state.subjects.includes(handle.record),
    effects: (actor, id) => id === 'cobblemon_world_combat:modifier' ? state.modifiers.map(entry => ({ id: () => entry.id, data: () => JSON.stringify(entry.data) }))
      : state.effects.filter(effect => !effect.ended && effect.definition() === id && effect.target().ref() === actor.ref()),
    effect: startEffect, controlled: value => state.controls.push(value),
    mobEffect: (_actor, id) => state.probes['marker:' + id] || null,
    mobEffects: () => Object.keys(state.probes).filter(key => key.startsWith('status:') && state.probes[key]).map(key => ({
      tagged: tag => tag === 'world_combat:status/' + key.slice(7), amplifier: () => 0,
    })),
    entityType: handle => ({ id: () => handle.record.facts.entityType || 'test:entity', tags: () => JSON.stringify(handle.record.facts.entityTags || []) }),
    friendly: handle => handle.record.friendly,
    cooldown: action => Object.values(state.definitions).find(skill => skill.action === action)?.ready === false ? 1 : 0,
    cast: (id, target, position, direction) => {
      if (!state.allowCast) return 0;
      const instance = state.nextInstance++;
      state.casts.push({ id, instance, slot: null, target: target?.ref() || null, point: coordinates(position), direction: coordinates(direction) });
      state.afterCast?.(instance); return instance;
    },
    face: position => state.faces.push(coordinates(position)), stopMovement() {}, random: () => { state.rolls++; return .5; } };
  function startEffect(definition, target, data, ticks) {
    let remaining = ticks, ended = false;
    const id = state.effects.length + 1, timers = new Map();
    const effect = { id: () => id, definition: () => definition, source: world.source, target: () => target, world: () => world, data: () => data,
      remaining(value) { if (value !== undefined) remaining = value; return remaining; },
      schedule: (key, event, delay) => timers.set(key, { key, event, at: state.tick + delay }),
      end() { ended = true; timers.clear(); }, get ended() { return ended; }, timers };
    state.effects.push(effect); effectHandlers.get(definition + '/start')?.(effect); return id;
  }
  function advanceEffects(ticks = 4) {
    state.tick += ticks;
    for (const effect of state.effects) for (const timer of [...effect.timers.values()]) {
      if (effect.ended || timer.at > state.tick) continue;
      effect.timers.delete(timer.key);
      const callback = effectHandlers.get(effect.definition() + '/' + timer.event); assert(callback, 'Missing effect callback'); callback(effect);
    }
  }
  function emit(topic) {
    const event = { world: () => world, actor: world.source, target: () => null, data: () => '{}' };
    for (const listener of listeners.values()) if (listener.topic === topic) listener.handler(event);
  }
  function resolve(slot) {
    const binding = { id: '', identity: '', arguments: {}, reason: '' };
    sandbox.NativeLoadout.slot({ world: () => world, pokemon: () => pokemon(self, state.skills), slot: () => slot,
      bind: (id, identity) => Object.assign(binding, { id, identity }), resource() {},
      argument: (key, value) => { binding.arguments[key] = value; }, unavailable: reason => { binding.reason = reason; } });
    return binding;
  }
  function nativeReady(slot) {
    const binding = resolve(slot); return !!binding.id && !binding.reason && world.readiness(binding.id) === '';
  }
  function cast(slot, target, position, direction) {
    if (!state.allowCast || !nativeReady(slot)) return 0;
    const binding = resolve(slot), data = new Map(), costs = [];
    const action = { actor: () => actor(self), target: () => target, sense: () => world, world: () => world,
      range: () => state.definitions[binding.arguments['native-design']].range,
      origin: () => point(self.point), targetPosition: () => position,
      argument: key => binding.arguments[key] ?? null, cost: cost => costs.push(cost),
      data(key, value) { if (value !== undefined) data.set(key, value); return data.get(key) ?? null; },
      reject: reason => { throw Error('rejected:' + reason); } };
    try {
      sandbox.NativeLoadout.prepare(action, binding.arguments['native-design']);
      state.beforeCommit?.(action);
      const event = { world: () => world, actor: action.actor, action: () => action, reject: action.reject };
      for (const listener of listeners.values()) if (listener.topic === 'world_combat:before_commit') listener.handler(event);
      for (const cost of costs) {
        const current = state.skills[cost.slot];
        if (!current || moveView(current).key() !== cost.key || current.pp < cost.amount) action.reject('resource-changed');
      }
      for (const cost of costs) { state.skills[cost.slot].pp -= cost.amount; state.payments.push(cost); }
      const instance = state.nextInstance++;
      state.casts.push({ id: binding.arguments['native-design'], instance, slot, target: target?.ref() || null,
        point: coordinates(position), direction: coordinates(direction), invocation: plain(sandbox.NativeLoadout.invocation(action)) });
      state.afterCast?.(instance);
      return instance;
    } catch (error) { if (error.message.startsWith('rejected:')) return 0; throw error; }
  }
  const sandbox = vm.createContext({
    WorldCombat: { clock: () => 0, measured() {}, point: (x, y, z) => point([x, y, z]), effect() {},
      effectHandler: (id, event, handler) => effectHandlers.set(id + '/' + event, handler),
      on: (id, topic, after, handler) => listeners.set(id, { topic, after, handler }) },
    CobblemonCombat: { tactics() {}, loadout() {}, registerAction() {}, skill: (_world, slot) => ({ ready: () => nativeReady(slot), cast: (...input) => cast(slot, ...input) > 0, submit: (...input) => cast(slot, ...input) }),
      moveTemplate: id => { assert(state.definitions[id], 'Unknown neutral definition: ' + id); return moveView(state.definitions[id], true); },
      ppCost: (_action, slot, key, amount) => ({ slot, key, amount }),
      pokemon: handle => { const ref = handle.ref(); state.nativeReads[ref] = (state.nativeReads[ref] || 0) + 1;
        return pokemon(handle.record, handle.record === self ? state.skills : []); } },
    CompanionRepertoire: { catalogue: { skills: state.definitions }, describe: (_world, _actor, id) => state.definitions[id] },
    WorldAI: { navigate: (_world, destination, within) => { state.moves.push({ point: coordinates(destination), within }); return 'moving'; } },
    GuardEffects: { has: () => false }, EffectProtocols: { unchanged: value => value },
    NativeEffects: { read: (world, actor) => ({ layers: sandbox.NativeModifiers.read(world, actor), flags: {} }) },
    NativeNatures: { apply() {} }, NativeItems: { apply: (_world, _actor, _event, value) => value, applyFacts: (_pokemon, _state, _event, value) => value },
    NativeAbilities: { apply: (_world, _actor, _event, value) => value },
    PokemonIndividuals: { registry: { apply() {}, supports: () => false } },
    IndividualAttributes: { live: () => ({}), read: () => 0 }, EquipmentBehavior: { apply() {} },
    WorldEnvironment: { sunlight: () => 1, read: () => ({ loaded: true, day: true, skyVisible: true, rain: 0, thunder: 0, skyLight: 15, blockLight: 0, weather: null, skyKnown: false }) },
    WorldFeedback: { keep() {} },
  });
  scripts.forEach(script => vm.runInContext(script, sandbox));
  const C = sandbox.CompanionBehavior, B = sandbox.WorldBehavior, M = sandbox.WorldMethods;
  const agent = new B.Agent(C.registry);
  function define(id, protocol, usage = {}, config = {}) {
    const skill = { id, kind: 'enemy', range: 16, config: { ai: {} }, ready: true, pp: 10, maxPp: 10, action: 'test:action/' + id, ...config };
    state.definitions[id] = skill; C.registerUse(id, { protocols: [protocol], ...usage });
    if (skill.geometry) sandbox.NativeLoadout.define(id, skill.action, '1', 100, skill.kind, skill.range, () => {}, () => skill.cost ?? 1);
    else sandbox.NativeLoadout.map(id, skill.action, () => skill.cost ?? 1);
    sandbox.NativeLoadout.availableWhen(id, () => skill.unavailable || '');
    if (skill.policy) sandbox.NativeLoadout.configure(id, skill.policy);
    return skill;
  }
  function add(...args) {
    const skill = define(...args); state.skills.push(skill); return skill;
  }
  function frame() {
    return C.frame(world, pokemon(self, state.skills), state.intent, point([0, 0, 0]), null, null, null, 24, '',
      cast, (stage, reason) => state.reports.push({ stage, reason }));
  }
  function context() { return { ...frame(), senses: {}, scratch: {}, memory: agent.memory, registry: C.registry, active: null, suspended: [], choice: null }; }
  function tick() { const report = agent.tick(frame()); state.tick += 4; return report; }
  return { state, self, threat, add, define, frame, context, tick, C, B, M, sandbox, agent, resolve, emit, advanceEffects,
    pokemon: () => pokemon(self, state.skills) };
}
let cases = 0;
function check(name, test) { test(); cases++; console.log('PASS AI dispatch: ' + name); }
check('slot and independent actions reach a large body surface without losing explicit aim', () => {
  for (const native of [false, true]) {
    const h = harness(); h.threat.point = [8, 10, 0]; h.threat.bounds = [[2, 0, -1], [14, 20, 1]];
    if (native) h.add('test:surface', 'world_combat:attack', {}, { kind: 'aim', range: 3, geometry: true });
    else h.C.readFacts('test:surface', frame => h.sandbox.WorldAbilities.grant(frame,
      { id: 'test:surface', action: 'test:surface', use: 'test:surface', protocols: ['world_combat:attack'], kind: 'aim', range: 3 }));
    const submit = selection => { const frame = h.frame(); return frame.services.behavior.use(frame.capabilities[0], selection); };
    assert.equal(submit({ ...h.threat, point: [2, .2, 0] }), 1);
    assert.equal(h.state.casts[0].target, h.threat.ref); assert.deepEqual(h.state.casts[0].point, [2, .2, 0]);
    h.threat.point = [36, 10, 0]; h.threat.bounds = [[30, 0, -1], [42, 20, 1]];
    assert(!submit({ ...h.threat, point: [1, 0, 0] }), 'A forged close point cannot bring a distant body into range');
  }
});

check('neutral aiming submits actual points and allies for both slot and independent actions', () => {
  for (const native of [false, true]) {
    const h = harness();
    if (native) h.add('test:aim', 'world_combat:attack', {}, { kind: 'aim', range: 12 });
    else h.C.readFacts('test:grant', frame => h.sandbox.WorldAbilities.grant(frame,
      { id: 'test:grant', action: 'test:aim', use: 'test:aim', protocols: ['world_combat:attack'], kind: 'aim', range: 12 }));
    const friend = subject('actor:friend', { friendly: true, point: [3, 0, 0] }); h.state.subjects.push(friend);
    const submit = target => {
      const frame = h.frame(); return frame.services.behavior.use(frame.capabilities[0], target);
    };
    assert.equal(submit(subject('', { point: [5, 0, 2] })), 1);
    assert.equal(h.state.casts[0].target, null); assert.deepEqual(h.state.casts[0].point, [5, 0, 2]);
    assert.equal(submit(friend), 2); assert.equal(h.state.casts[1].target, friend.ref);
    assert(!submit(subject('actor:missing', { point: [5, 0, 2] })), 'A vanished entity cannot become an implicit world point');
    if (!native) assert(!submit(subject('', { point: [20, 0, 2] })), 'Independent aim keeps its range limit');
  }
});

check('ordinary use priority outranks shared range, recency and combination preferences', () => {
  const h = harness();
  h.add('test:first', 'world_combat:attack', { priority: () => 8 }, { range: 8 });
  h.add('test:second', 'world_combat:attack', { priority: () => 2 }, { range: 20 });
  h.C.registerCombination('test:second', { prepare: () => null, priority: () => 50, wait: () => h.B.step(() => h.B.success()) });
  h.agent.memory.events = { 'move:test:first': 0, 'move:test:second': -50 };
  h.tick(); assert.equal(h.state.casts[0].id, 'test:first');
});

check('equal priorities retain the existing shared tie-breaks', () => {
  const h = harness();
  h.add('test:first', 'world_combat:attack', {}, { range: 8 });
  h.add('test:second', 'world_combat:attack', {}, { range: 20 });
  h.tick(); assert.equal(h.state.casts[0].id, 'test:second');
});

check('a higher ordinary priority replaces an uncommitted approach', () => {
  const h = harness(); h.threat.point = [12, 0, 0]; let preferFirst = true;
  h.add('test:first', 'world_combat:attack', { priority: () => preferFirst ? 8 : 0 }, { range: 4 });
  h.add('test:second', 'world_combat:attack', { priority: () => preferFirst ? 0 : 8 }, { range: 4 });
  assert.equal(h.tick().choice.offer.capabilities[0].data.move, 'test:first');
  preferFirst = false;
  assert.equal(h.tick().choice.offer.capabilities[0].data.move, 'test:second'); assert.equal(h.state.casts.length, 0);
});

check('busy actions retain their active choice despite a new priority', () => {
    const h = harness(); let preferFirst = true;
  h.add('test:first', 'world_combat:attack', { priority: () => preferFirst ? 8 : 0 });
  h.add('test:second', 'world_combat:attack', { priority: () => preferFirst ? 0 : 8 });
  h.state.afterCast = () => { h.state.busy = true; }; h.tick(); preferFirst = false;
  assert.equal(h.tick().choice.offer.capabilities[0].data.move, 'test:first'); assert.equal(h.state.casts.length, 1);
});

check('compatible dispatch and completion follow the submitted instance while other work remains active', () => {
  const h = harness(); let followed = 0;
  h.state.busy = true; h.state.compatible = true; h.state.movementBusy = true; h.state.instances = [41];
  h.add('test:parallel', 'world_combat:attack', { after: () => { followed++; return h.B.success(); } });
  h.state.nextInstance = 42; h.state.afterCast = instance => { h.state.instances.push(instance); };
  h.tick(); assert.equal(h.state.casts.length, 1, 'Any-action busy must not override action-specific readiness');
  h.tick(); assert.equal(followed, 0, 'The submitted action is still running');
  h.state.instances = [41]; h.tick();
  assert.equal(followed, 1, 'An unrelated running action must not prevent completion');
  assert.equal(h.state.payments.length, 1);
});

check('background work without movement claims permits an independent approach', () => {
  const h = harness(); h.state.busy = true; h.state.compatible = true; h.state.movementBusy = false; h.state.instances = [41];
  h.threat.point = [12, 0, 0]; h.add('test:approach', 'world_combat:attack', {}, { range: 4 });
  h.tick(); assert.equal(h.state.casts.length, 0); assert.equal(h.state.moves.length, 1);
});

check('synchronous parent completion tracks the accepted identity instead of its surviving child', () => {
  for (const native of [false, true]) {
    const h = harness(); let followed = 0;
    const usage = { after: (_context, _item, _target, progress) => {
      assert.equal(progress.instance, h.state.casts[0].instance);
      assert(h.state.instances.includes(101)); followed++; return h.B.success();
    } };
    if (native) h.add('test:parent', 'world_combat:attack', usage);
    else {
      h.C.registerUse('test:parent', { protocols: ['world_combat:attack'], ...usage });
      h.C.readFacts('test:grant', frame => h.sandbox.WorldAbilities.grant(frame,
        { id: 'test:grant', action: 'test:parent', use: 'test:parent', protocols: ['world_combat:attack'], kind: 'enemy', range: 16 }));
    }
    h.state.afterCast = instance => { assert.equal(instance, 1); h.state.instances = [101]; h.state.busy = true; h.state.compatible = true; };
    h.tick(); assert.equal(h.state.casts[0].instance, 1);
    assert.equal(h.tick().state, 'succeeded'); assert.equal(followed, 1); assert.deepEqual(h.state.instances, [101]);
    assert.equal(h.state.casts.length, 1);
  }
});

function population(h, wild) {
  if (!wild) return h.tick;
  h.self.wild = true;
  let report;
  const run = h.C.runWild;
  h.C.runWild = (...args) => { report = run(...args); return report; };
  h.emit('world_combat:actor_bound');
  return () => { h.advanceEffects(); return report; };
}

check('owned and wild choosers suspend for compatible urgent work and resume the original action task', () => {
  for (const wild of [false, true]) {
    const h = harness(); let armed = false; const followed = [];
    const first = h.add('test:ongoing', 'world_combat:attack', { after: () => { followed.push('a'); return h.B.success(); } });
    h.add('test:urgent', 'world_combat:attack', { available: (_context, _item, purpose) => armed && ['world_combat:attack', 'attack'].includes(purpose), priority: () => 100,
      after: () => { followed.push('b'); return h.B.success(); } });
    h.state.instances = []; h.state.compatible = true;
    h.state.afterCast = instance => {
      h.state.instances.push(instance); h.state.busy = true;
      h.state.definitions[h.state.casts.at(-1).id].ready = false;
    };
    const tick = population(h, wild);
    tick(); assert.equal(h.state.casts[0].id, first.id);
    armed = true; let report = tick();
    assert.equal(h.state.casts[1]?.id, 'test:urgent', wild ? 'wild chooser' : 'owned chooser');
    assert.deepEqual(h.state.instances, [1, 2]); assert.equal(report.suspended.length, 1);
    report = tick(); assert.equal(report.suspended.length, 1, 'Suspended unready capability lost its task');
    assert.equal(h.state.casts.length, 2); assert.deepEqual(followed, []);
    h.state.instances = [1]; assert.equal(tick().state, 'succeeded'); assert.deepEqual(followed, ['b']);
    armed = false; report = tick(); assert.equal(report.choice.offer.capabilities[0].data.move, first.id);
    assert.equal(report.state, 'running'); assert.equal(h.state.casts.length, 2, 'Resuming repeated payment/submission');
    h.state.instances = []; h.state.busy = false;
    assert.equal(tick().state, 'succeeded'); assert.deepEqual(followed, ['b', 'a']); assert.equal(h.state.payments.length, 2);
  }
});

check('owned and wild choosers retain conflicting actions despite an urgent authored readiness override', () => {
  for (const wild of [false, true]) {
    const h = harness(); let armed = false;
    h.add('test:ongoing', 'world_combat:attack');
    h.add('test:urgent', 'world_combat:attack', { available: () => armed, ready: () => true, priority: () => 100 });
    h.state.afterCast = instance => { h.state.instances = [instance]; h.state.busy = true; };
    const tick = population(h, wild); tick(); armed = true;
    const report = tick(); assert.equal(report.choice.offer.capabilities[0].data.move, 'test:ongoing');
    assert.equal(h.state.casts.length, 1); assert.equal(report.suspended.length, 0);
  }
});

check('wild boundary policy can suspend compatible ongoing work using current action readiness', () => {
  const h = harness(); h.state.subjects = [h.self, subject('actor:visitor', { player: true, point: [2, 0, 0] })];
  h.add('test:ongoing', 'world_combat:fortify', {}, { kind: 'self' });
  const warning = h.add('test:signal', 'world_combat:warning', {}, { ready: false, config: { ai: {}, warnBeforeAttack: true } });
  h.state.instances = []; h.state.compatible = true;
  h.state.afterCast = instance => { h.state.instances.push(instance); h.state.busy = true; h.state.definitions[h.state.casts.at(-1).id].ready = false; };
  const run = h.C.runWild;
  h.C.runWild = (frame, memory) => { frame.facts.restFor = 100; frame.facts.territorial = true; return run(frame, memory); };
  const tick = population(h, true); tick(); assert.equal(h.state.casts[0].id, 'test:ongoing');
  warning.ready = true; const report = tick();
  assert.equal(report.choice.goal.kind, 'world_combat:boundary'); assert.equal(report.suspended.length, 1);
  assert.equal(h.state.casts[1].id, warning.id); assert.deepEqual(h.state.instances, [1, 2]);
});

check('wild chooser retains a suspended on-cooldown intent and follows its original instance on resumption', () => {
  for (const finishesWhilePaused of [false, true]) {
    const h = harness(); let armed = false; const followed = [];
    h.state.subjects = [h.self, subject('actor:visitor', { player: true, point: [2, 0, 0] })];
    const first = h.add('test:first', 'world_combat:warning', {
      after: (context, _item, target, progress) => {
        assert.equal(progress.instance, h.state.casts[0].instance); assert.equal(target.ref, 'actor:visitor');
        assert(!h.state.instances.includes(progress.instance), 'Follow-up ran before its action ended');
        followed.push({ id: 'first', instance: progress.instance, tick: context.tick }); return h.B.success();
      }
    }, { config: { ai: {}, warnBeforeAttack: true } });
    h.add('test:second', 'world_combat:fortify', { available: () => armed, priority: () => 100,
      after: (context, _item, _target, progress) => {
        assert.equal(progress.instance, h.state.casts[1].instance);
        followed.push({ id: 'second', instance: progress.instance, tick: context.tick }); return h.B.success();
      }
    }, { kind: 'self' });
    h.state.instances = []; h.state.compatible = true;
    h.state.afterCast = instance => {
      h.state.instances.push(instance); h.state.busy = true; h.state.definitions[h.state.casts.at(-1).id].ready = false;
    };
    const run = h.C.runWild;
    h.C.runWild = (frame, memory) => { frame.facts.restFor = 100; frame.facts.territorial = true; return run(frame, memory); };
    const tick = population(h, true), started = tick();
    assert.equal(started.choice.goal.kind, 'world_combat:boundary'); assert.equal(h.state.casts[0].id, first.id);
    const key = started.choice.key, execution = started.choice.execution, firstInstance = h.state.casts[0].instance;
    armed = true; let report = tick();
    assert.equal(report.choice.goal.kind, 'world_combat:fortify'); assert(report.suspended.includes(key));
    const secondInstance = h.state.casts[1].instance;
    if (finishesWhilePaused) h.state.instances = [secondInstance];
    for (let i = 0; i < 3; i++) {
      report = tick(); assert(report.suspended.includes(key), 'Cooldown retired an owned suspended intent');
      assert.equal(first.ready, false); assert.deepEqual(followed, []); assert.equal(h.state.casts.length, 2);
    }
    h.state.instances = finishesWhilePaused ? [] : [firstInstance]; h.state.busy = h.state.instances.length > 0;
    assert.equal(tick().state, 'succeeded'); assert.deepEqual(followed.map(value => value.id), ['second']);
    const resumeTick = h.state.tick + 4;
    report = tick(); assert.equal(report.choice.key, key); assert.equal(report.choice.execution, execution);
    assert.equal(report.suspended.length, 0); assert.equal(h.state.casts.length, 2); assert.equal(h.state.payments.length, 2);
    if (finishesWhilePaused) {
      assert.equal(report.state, 'succeeded'); assert.equal(followed[1].tick, resumeTick);
    } else {
      assert.equal(report.state, 'running'); assert.equal(followed.length, 1, 'Resumption repeated submission or skipped the original action');
      h.state.instances = []; h.state.busy = false;
      const completionTick = h.state.tick + 4;
      assert.equal(tick().state, 'succeeded'); assert.equal(followed[1].tick, completionTick);
    }
    assert.deepEqual(followed.map(value => value.id), ['second', 'first']);
    assert.equal(followed[1].instance, firstInstance); tick(); assert.equal(followed.length, 2);
    assert.deepEqual(h.state.casts.map(value => value.instance), [firstInstance, secondInstance]);
    assert.equal(h.state.payments.length, 2);
  }
});

check('a paused timed intent retains its own recency exemption and resumes the original wait', () => {
  const h = harness(); let armed = false;
  h.state.intent = 'autonomous'; h.state.subjects = [h.self, subject('actor:visitor', { player: true, point: [2, 0, 0] })];
  h.sandbox.IndividualAttributes.read = (_context, id) => id === 'world_combat:curiosity' ? 1 : 0;
  h.sandbox.WorldAI.navigate = (_world, point, within) => {
    assert.deepEqual(coordinates(point), [2, 0, 0]); assert(within >= 2); return 'arrived';
  };
  h.add('test:second', 'world_combat:fortify', { available: () => armed, priority: () => 100 }, { kind: 'self' });
  h.state.instances = []; h.state.compatible = true;
  h.state.afterCast = instance => { h.state.instances.push(instance); h.state.busy = true; h.state.skills[0].ready = false; };
  const started = h.tick(), key = started.choice.key, execution = started.choice.execution;
  assert.equal(started.choice.method.id, 'world_combat:observe');
  h.tick(); const observedAt = h.agent.memory.events['observe:actor:visitor']; h.tick();
  armed = true; assert(h.tick().suspended.includes(key));
  for (let i = 0; i < 4; i++) assert(h.tick().suspended.includes(key), 'The task lost its continuing offer after recording recency');
  h.state.instances = []; h.state.busy = false; assert.equal(h.tick().state, 'succeeded');
  const resumed = h.tick(); assert.equal(resumed.choice.key, key); assert.equal(resumed.choice.execution, execution);
  assert.equal(resumed.state, 'running');
  for (let i = 0; i < 4; i++) assert.equal(h.tick().state, 'running', 'Suspended time advanced the wait');
  assert.equal(h.tick().state, 'succeeded');
  assert.equal(h.agent.memory.events['observe:actor:visitor'], observedAt, 'Resumption repeated the earlier observation stage');
  assert.equal(h.state.faces.filter(point => point[0] === 2 && point[2] === 0).length, 1);
  assert.equal(h.state.casts.length, 1); assert.equal(h.state.payments.length, 1);
});

check('a sole eligible negative-priority use dispatches for each independent purpose', () => {
  for (const protocol of ['attack', 'control', 'survive', 'fortify', 'prepare', 'cover']) {
    const h = harness();
    h.add('test:only', 'world_combat:' + protocol, { priority: () => -3 }, { kind: ['attack', 'control'].includes(protocol) ? 'enemy' : 'self' });
    h.tick(); assert.equal(h.state.casts.length, 1, protocol); assert.equal(h.state.casts[0].id, 'test:only');
  }
});

check('a sole support use dispatches with the method-provided subject', () => {
  for (const protocol of ['heal', 'shield', 'bolster', 'travel-help', 'drain']) {
    const h = harness(); h.self.health = 60; h.self.hurtAgo = 0; h.threat.attacking = h.self.ref;
    h.add('test:only', 'world_combat:' + protocol, { priority: () => 0 },
      { kind: protocol === 'drain' ? 'enemy' : 'self', config: { ai: {}, allowSelf: true } });
    if (protocol === 'travel-help') {
      h.state.subjects = [h.self]; h.self.point = [7, 0, 0];
      h.state.skills[0].config.allowSelf = true;
      h.C.uses.get('test:only').protocols.push('world_combat:bolster');
    }
    h.tick(); assert.equal(h.state.casts.length, 1, protocol);
  }
});

check('a target-specific support condition can select an eligible friend', () => {
  const h = harness(); const recipient = subject('actor:friend', { friendly: true, health: 20, point: [2, 0, 0] });
  h.state.subjects.push(recipient);
  h.add('test:only', 'world_combat:heal', { available: (_context, _item, _purpose, target) => target?.ref === recipient.ref },
    { kind: 'friend', config: { ai: {}, helpFriends: true } });
  h.tick(); assert.equal(h.state.casts[0].target, recipient.ref);
});

check('ordinary preference stays within goal order and explicit urgency crosses it', () => {
  for (const priority of [99, 100]) {
    const h = harness(); h.add('test:ordinary', 'world_combat:attack', { priority: () => priority });
    h.add('test:preceding', 'world_combat:survive', {}, { kind: 'self' }); h.tick();
    assert.equal(h.state.casts[0].id, priority === 100 ? 'test:ordinary' : 'test:preceding');
  }
});

check('support selection asks the current use about full-health needs and explicit self support', () => {
  for (const protocol of ['bolster', 'travel-help']) {
    const h = harness();
    const idle = subject('actor:idle', { friendly: true, point: [1, 0, 0] });
    const preparing = subject('actor:preparing', { friendly: true, point: [2, 0, 0] });
    h.state.subjects.push(idle, preparing);
    if (protocol === 'travel-help') h.state.subjects = [h.self, idle, preparing];
    let wanted = preparing.ref;
    const skill = h.add('checks:tempo', 'world_combat:' + protocol,
      { available: (_context, _item, _purpose, target) => target?.ref === wanted },
      { kind: 'friend', config: { ai: {}, allowSelf: false } });
    const partner = () => { const context = h.context(); h.C.registry.read(context); return context.senses['world_combat:partner']; };
    assert.equal(partner()?.ref, preparing.ref, 'A declared full-health preparation need must reach the use');
    wanted = '';
    assert.equal(partner(), null, 'A friendly body without a declared need must not be inserted');
    wanted = h.self.ref;
    assert.equal(partner(), null, 'Self support requires the capability opt-in');
    skill.config.allowSelf = true;
    assert.equal(partner()?.ref, h.self.ref, 'The explicit self-support candidate reaches the same use predicate');
  }
});

check('author-provided methods can offer a capability independently of the default pairing policy', () => {
  const h = harness(); h.threat.point = [12, 0, 0];
  h.add('test:first', 'world_combat:attack'); h.add('test:second', 'world_combat:control', { priority: () => 5 });
  h.C.abilityMethod({ id: 'test:independent', protocol: 'world_combat:control', purpose: 'control',
    matches: (_context, goal) => goal.kind === 'world_combat:defend', target: h.M.goalSubject });
  h.tick(); assert.equal(h.state.casts[0].id, 'test:second');
});

check('an author can allow or decline a quiet-time use through availability', () => {
  for (const allowed of [true, false]) {
    const h = harness(); h.state.subjects = [h.self];
    h.add('test:only', 'world_combat:fortify', { available: () => allowed, priority: () => -1 }, { kind: 'self', pp: 1 });
    h.tick(); assert.equal(h.state.casts.length, allowed ? 1 : 0);
  }
});

check('hard availability, target acceptance and readiness gates refuse a sole use', () => {
  for (const gate of ['available', 'accepts', 'ready', 'resource', 'native-ready']) {
    const h = harness(); const usage = ['available', 'accepts', 'ready'].includes(gate) ? { [gate]: () => false } : {};
    h.add('test:only', 'world_combat:attack', usage, { pp: gate === 'resource' ? 0 : 10, ready: gate !== 'native-ready' });
    for (let i = 0; i < 3; i++) h.tick();
    assert.equal(h.state.casts.length, 0, gate);
    assert(h.state.moves.every(move => move.point[0] === 0), gate + ' must not approach a declined subject');
  }
});

check('target-dependent rejection falls through to an eligible lower-priority purpose', () => {
  const h = harness(); h.threat.point = [12, 0, 0];
  h.add('test:conditional', 'world_combat:attack', { available: (_context, _item, _purpose, target) => target === null });
  h.add('test:fallback', 'world_combat:control', { priority: () => -20 });
  h.tick(); assert.equal(h.state.casts[0].id, 'test:fallback'); assert.equal(h.state.moves.length, 0);
});

check('a preference ranks candidates and still permits the sole remaining eligible candidate', () => {
  const h = harness(); let preferred = true;
  h.add('test:first', 'world_combat:attack', { priority: () => 12, available: () => preferred });
  h.add('test:second', 'world_combat:attack', { priority: () => -10 });
  h.tick(); assert.equal(h.state.casts[0].id, 'test:first');
  preferred = false; h.tick(); assert.equal(h.state.casts[1].id, 'test:second');
});

check('default self casts stay local; explicit approach targets close the distance before dispatch', () => {
  const ordinary = harness(); ordinary.threat.point = [15, 0, 0];
  ordinary.add('test:only', 'world_combat:control', {}, { kind: 'self', range: 6 });
  ordinary.tick(); assert.equal(ordinary.state.moves.length, 0); assert.equal(ordinary.state.casts[0].target, ordinary.self.ref);
  const h = harness(); h.threat.point = [15, 0, 0];
  h.add('test:only', 'world_combat:control', { approachTarget: (_context, _item, target) => target }, { kind: 'self', range: 6 });
  h.tick(); assert.equal(h.state.casts.length, 0); assert.deepEqual(h.state.moves[0], { point: [15, 0, 0], within: 6 * .82 });
  h.self.point = [11, 0, 0]; h.tick();
  assert.equal(h.state.casts[0].target, h.self.ref); assert.deepEqual(h.state.casts[0].point, h.self.point);
  assert.equal(h.agent.memory.events['control:' + h.threat.ref], 4);
});

check('point placement and self aim keep the authored position and direction', () => {
  for (const kind of ['point', 'motion', 'self', 'enemy']) {
    const h = harness(); const destination = [2, 0, 3];
    h.add('test:only', 'world_combat:control', { target: (_context, _item, target) => ({ ...target, point: destination }) }, { kind });
    h.tick(); const cast = h.state.casts[0]; assert.deepEqual(cast.point, destination);
    assert.equal(cast.target, kind === 'self' ? h.self.ref : ['point', 'motion'].includes(kind) ? null : h.threat.ref);
    assert(Math.abs(cast.direction[0] - 2 / Math.sqrt(13)) < 1e-8); assert(Math.abs(cast.direction[2] - 3 / Math.sqrt(13)) < 1e-8);
  }
});

check('an explicit self positioning reach is independent of zero-distance self targeting', () => {
  const h = harness(); h.threat.point = [15, 0, 0];
  h.add('test:only', 'world_combat:control', { approachTarget: (_context, _item, target) => target, reach: () => 6 }, { kind: 'self', range: 0 });
  h.tick(); assert.equal(h.state.casts.length, 0); assert.equal(h.state.moves[0].within, 6 * .82);
  h.self.point = [11, 0, 0]; h.tick(); assert.equal(h.state.casts[0].target, h.self.ref);
});

check('authored target selection runs before acceptance and reaches the actual cast and follow-up', () => {
  const h = harness(); const selected = subject('actor:alternate', { point: [6, 0, 0], hostile: true, grounded: false });
  h.state.subjects.push(selected); let followed;
  h.add('test:only', 'world_combat:attack', {
    selectTarget: context => context.facts.nearby.find(target => target.ref === selected.ref) || null,
    accepts: (_context, _item, target) => target.grounded === false,
    available: (_context, _item, _purpose, target) => target?.ref === selected.ref,
    after: (_context, _item, target) => { followed = target.ref; },
  });
  h.tick(); assert.equal(h.state.casts[0].target, selected.ref); h.tick(); assert.equal(followed, selected.ref);
});

check('candidate and execution callbacks see their selected subject without leaking into the next candidate', () => {
  const h = harness(); const selected = subject('actor:alternate', { point: [6, 0, 0], hostile: true }); h.state.subjects.push(selected);
  const seen = [];
  const selection = context => { assert.equal(h.M.goalSubject(context).ref, h.threat.ref); return context.facts.nearby.find(target => target.ref === selected.ref); };
  const condition = context => { seen.push(h.M.goalSubject(context).ref); return true; };
  h.add('test:first', 'world_combat:attack', { selectTarget: selection, available: condition, accepts: condition, ready: condition,
    priority: context => { condition(context); return 2; } });
  h.add('test:second', 'world_combat:attack', { selectTarget: selection, available: condition, accepts: condition, ready: condition });
  h.tick(); assert.equal(h.state.casts[0].target, selected.ref); assert(seen.length > 4); assert(seen.every(ref => ref === selected.ref));
});

check('declined selection and vanished selected subjects fall back without dispatch', () => {
  const h = harness(); const selected = subject('actor:alternate', { point: [18, 0, 0], hostile: true }); h.state.subjects.push(selected);
  h.add('test:only', 'world_combat:attack', { selectTarget: context => context.facts.nearby.find(target => target.ref === selected.ref) || null }, { range: 4 });
  h.tick(); assert.equal(h.state.casts.length, 0); assert.deepEqual(h.state.moves[0].point, selected.point);
  h.state.subjects = h.state.subjects.filter(value => value !== selected); h.tick();
  assert.equal(h.state.casts.length, 0); assert.equal(h.state.moves.length, 2); assert.deepEqual(h.state.moves[1].point, [0, 0, 0]);
});

check('approach plans can wait, and station limits use the actual approach subject', () => {
  const h = harness(); h.threat.point = [15, 0, 0]; h.state.intent = 'stay';
  h.add('test:only', 'world_combat:control', { approachTarget: (_context, _item, target) => target }, { kind: 'self', range: 6 });
  h.tick(); assert.equal(h.state.casts.length, 0); assert(h.state.moves.every(move => move.point[0] === 0));
  const waiting = harness(); waiting.threat.point = [15, 0, 0];
  waiting.add('test:only', 'world_combat:control', { approachTarget: (_context, _item, target) => target, approach: () => 'wait' }, { kind: 'self', range: 6 });
  waiting.tick(); assert.equal(waiting.state.casts.length, 0); assert.equal(waiting.state.moves.length, 0);
  assert.equal(waiting.state.reports.at(-1).stage, 'waiting');
});

check('a declined casting point or approach subject never reaches the host cast', () => {
  for (const callback of ['target', 'approachTarget']) {
    const h = harness(); h.add('test:only', 'world_combat:control', { [callback]: () => null });
    assert.equal(h.tick().choice.goal.kind, 'world_combat:command'); assert.equal(h.state.casts.length, 0);
  }
});

check('execution rechecks availability and host refusal before recording a use', () => {
  const h = harness(); h.threat.point = [15, 0, 0]; let allowed = true;
  const skill = h.add('test:only', 'world_combat:attack', { available: () => allowed }, { range: 5 });
  h.tick(); allowed = false; h.self.point = [12, 0, 0]; h.tick(); assert.equal(h.state.casts.length, 0);
  allowed = true; skill.ready = false; h.tick(); assert.equal(h.state.casts.length, 0);
  skill.ready = true; h.state.allowCast = false; const report = h.tick();
  assert.equal(report.result.reason, 'cast-refused'); assert.equal(h.agent.memory.events, undefined);
});

check('explicit known subjects reuse native snapshots and enrichment without broadening capture', () => {
  const h = harness(), world = h.state.world; h.threat.visible = false;
  let enrichments = 0, observations = 0;
  const observe = world.observe;
  world.observe = actor => { observations++; return observe(actor); };
  world.survey = (_point, _range, visible) => JSON.stringify(h.state.subjects.filter(value => !visible || value.visible));
  const adapter = new h.sandbox.WorldBehaviorHost.Adapter((_access, actor, value, facts) => {
    if (actor?.ref() === h.threat.ref) { enrichments++; value.facts = { calibration: 7 }; }
  });
  const frame = adapter.capture(world, { intent: 'follow', anchor: point([0, 0, 0]), owner: null, focused: null, range: 16, focusActive: false });
  frame.scratch = {}; frame.memory = {}; frame.services.behavior = adapter.operations(world, () => false);
  assert.equal(frame.facts.nearby.length, 0);
  const before = observations;
  assert.equal(h.M.find(frame, h.threat.ref), null); assert.equal(observations, before);
  const known = h.M.observeKnown(frame, h.threat.ref);
  assert.equal(known.visible, false); assert.equal(known.ref, h.threat.ref); assert.equal(known.facts.calibration, 7);
  assert.equal(enrichments, 1); assert.equal(observations, before + 1); assert.deepEqual(plain(known.velocity), h.threat.velocity);
  assert.equal(frame.facts.nearby.length, 0); assert.equal(h.M.find(frame, h.threat.ref), known);
  assert.equal(h.M.observeKnown(frame, h.threat.ref), known); assert.equal(observations, before + 1);
  world.valid = () => false; frame.tick++; frame.scratch = {};
  assert.equal(h.M.observeKnown(frame, h.threat.ref), null); assert.equal(observations, before + 1);
  world.valid = () => true; world.actor = () => world.source(); frame.tick++; frame.scratch = {};
  assert.equal(h.M.observeKnown(frame, h.threat.ref), null, 'Native lookup must retain the requested reference');
});
check('survey and lone observations retain grounded, dimensions and published domain facts', () => {
  const h = harness(); h.threat.grounded = false; h.threat.wet = true; h.threat.width = 2; h.threat.tags = 'test:tag';
  h.threat.facts = { species: 'test:native', level: 10, status: '', wild: true, owner: '', aiEnabled: true };
  const frame = h.frame(), record = frame.facts.nearby[0];
  assert.equal(record.grounded, false); assert.equal(record.wet, true); assert.equal(record.width, 2); assert.equal(record.tags, 'test:tag');
  assert.deepEqual(plain(record.facts), h.threat.facts); assert.equal(frame.facts.self.grounded, true);
  const adapter = new h.sandbox.WorldBehaviorHost.Adapter();
  const lone = adapter.snapshot(h.state.world.observe(h.state.world.actor(h.threat.ref)), h.state.world);
  for (const key of ['grounded', 'wet', 'width', 'height', 'tags']) assert.equal(lone[key], record[key]);
});

check('native identity uses existing accessors once per decision and distinguishes non-native actors', () => {
  const h = harness(); h.threat.domain = 'cobblemon'; h.threat.nativeGender = 'female'; h.threat.nativeForm = 'alternate'; h.threat.nativeTypes = ['type-b', 'type-c']; h.threat.nativeAspects = ['test:aspect'];
  const context = h.context(), target = context.facts.nearby[0];
  const facts = h.C.pokemonFacts(context, target);
  assert.deepEqual(plain(facts.types), ['type-b', 'type-c']); assert.equal(facts.gender, 'female'); assert.equal(facts.form, 'alternate');
  assert.deepEqual(plain(facts.aspects), ['test:aspect']);
  assert.equal(h.C.pokemonFacts(context, target), facts); assert.equal(h.state.nativeReads[h.threat.ref], 1);
  h.threat.nativeGender = 'male'; assert.equal(h.C.pokemonFacts(h.context(), target).gender, 'male'); assert.equal(h.state.nativeReads[h.threat.ref], 2);
  h.threat.domain = 'minecraft'; const foreign = h.context(); assert.equal(h.C.pokemonFacts(foreign, foreign.facts.nearby[0]), null);
  assert.equal(h.C.domain(foreign, foreign.facts.nearby[0]), 'minecraft'); assert.equal(h.state.nativeReads[h.threat.ref], 2);
});

check('complete published native identity avoids per-subject snapshot calls', () => {
  const h = harness(); h.threat.domain = 'cobblemon'; h.threat.facts = { species: 'test:native', level: 10, status: '', wild: true,
    owner: '', aiEnabled: true, types: ['type-a'], gender: 'none', form: 'base', aspects: [] };
  const context = h.context(); assert.deepEqual(plain(h.C.pokemonFacts(context, context.facts.nearby[0])), h.threat.facts);
  assert.equal(h.state.nativeReads[h.threat.ref], undefined);
});

check('actor kinds consume registry facts and use the existing single-actor registry accessor as fallback', () => {
  const h = harness(); h.threat.facts = { entityType: 'test:entity', entityTags: ['test:classification'] };
  let reads = 0; const read = h.state.world.entityType;
  h.state.world.entityType = actor => { reads++; return read(actor); };
  const context = h.context(), target = context.facts.nearby[0];
  assert.deepEqual(plain(h.C.entityType(context, target)), { id: 'test:entity', tags: ['test:classification'] }); assert.equal(reads, 0);
  const lone = { ref: target.ref, point: target.point };
  assert.deepEqual(plain(h.C.entityType(context, lone)), { id: 'test:entity', tags: ['test:classification'] });
  h.C.entityType(context, lone); assert.equal(reads, 1);
});

check('fact caches separate probe identities and refresh on the next decision', () => {
  const h = harness(); const context = h.context(), target = context.facts.nearby[0]; let reads = 0;
  context.services.fact = probe => { reads++; return probe === 'world:marker'; };
  assert.equal(h.C.marker(context, target, 'test:identity'), true); assert.equal(h.C.effect(context, target, 'test:identity'), false);
  assert.equal(h.C.marker(context, target, 'test:identity'), true); assert.equal(reads, 2);
  context.scratch = {}; assert.equal(h.C.effect(context, target, 'test:identity'), false); assert.equal(reads, 3);
});

check('registered facts cache each argument and preserve unavailable subjects as null', () => {
  const h = harness(); let reads = 0;
  h.C.registerFact('test:fact', (_world, actor, argument) => { reads++; return { ref: String(actor.ref()), value: argument.value }; });
  const context = h.context(), target = context.facts.nearby[0];
  assert.deepEqual(plain(h.C.fact(context, 'test:fact', target, { value: 1 })), { ref: target.ref, value: 1 });
  h.C.fact(context, 'test:fact', target, { value: 1 }); assert.equal(reads, 1);
  assert.equal(h.C.fact(context, 'test:fact', target, { value: 2 }).value, 2); assert.equal(reads, 2);
  const absent = { ref: 'actor:absent', point: [0, 0, 0] };
  assert.equal(h.C.fact(context, 'test:fact', absent), null); assert.equal(reads, 2);
});

check('effective slot definitions supply methods and parameters while the equipped slot pays', () => {
  const h = harness();
  const payer = h.add('test:payer', 'world_combat:attack', { available: () => false }, { key: 'payer-key', pp: 3, maxPp: 7 });
  const effective = h.define('test:effective', 'world_combat:control', { priority: () => -2 },
    { kind: 'point', range: 9, cost: 2, config: { ai: {}, parameter: 17 } });
  h.state.modifiers.push({ id: 11, data: { moves: { 0: effective.id } } });
  const capability = h.frame().capabilities[0];
  assert.equal(capability.data.use, effective.id); assert.equal(capability.data.move, effective.id);
  assert.equal(capability.data.source, payer.id); assert.equal(capability.data.key, 'payer-key'); assert.equal(capability.data.selection, '11');
  assert.equal(capability.data.pp, 3); assert.equal(capability.data.maxPp, 7); assert.equal(capability.data.config.parameter, 17);
  assert.deepEqual(plain(capability.protocols), ['world_combat:control']); assert.equal(capability.data.kind, 'point'); assert.equal(capability.data.range, 9);
  const report = h.tick(); assert.equal(report.choice.method.id, 'world_combat:control-only');
  assert.equal(h.state.casts[0].id, effective.id); assert.equal(h.state.casts[0].target, null);
  assert.deepEqual(h.state.payments, [{ slot: 0, key: 'payer-key', amount: 2 }]); assert.equal(payer.pp, 1); assert.equal(effective.pp, 10);
  const invocation = h.state.casts[0].invocation;
  assert.equal(invocation.source, payer.id); assert.equal(invocation.key, 'payer-key'); assert.equal(invocation.executing, effective.id);
});

check('effective capability and support lookup work with an unimplemented paying definition', () => {
  const h = harness(); const effective = h.define('test:effective', 'world_combat:fortify', {}, { kind: 'self' });
  h.state.skills.push({ id: 'test:unmapped', key: 'unmapped-key', pp: 4, maxPp: 8 });
  h.state.modifiers.push({ id: 12, data: { moves: { 0: effective.id } } });
  assert.equal(h.C.supports(h.pokemon()), false); assert.equal(h.C.supports(h.pokemon(), h.state.world), true);
  h.tick(); assert.equal(h.state.casts[0].id, effective.id); assert.equal(h.state.payments[0].key, 'unmapped-key');
  h.state.modifiers = [];
  assert.equal(h.C.supports(h.pokemon(), h.state.world), false); assert.equal(h.frame().capabilities.length, 0);
  h.tick(); assert.equal(h.state.casts.length, 1);
});

check('selection revisions and paying identities retire old plans while PP changes preserve identity', () => {
  const h = harness(); h.threat.point = [12, 0, 0]; let followed = 0;
  const payer = h.add('test:payer', 'world_combat:attack', {}, { range: 3, key: 'payer-a' });
  const effective = h.define('test:effective', 'world_combat:attack', { after: () => { followed++; } });
  const initial = h.tick().choice; assert.equal(h.state.casts.length, 0);
  h.state.modifiers.push({ id: 21, data: { moves: { 0: effective.id } } });
  const first = h.tick().choice;
  assert.notEqual(first.key, initial.key); assert.equal(h.state.casts[0].id, effective.id);
  assert.equal(h.frame().capabilities[0].id, first.offer.capabilities[0].id);
  h.state.modifiers[0].id = 22;
  const revised = h.tick().choice; assert.notEqual(revised.key, first.key); assert.equal(h.state.casts.length, 2); assert.equal(followed, 0);
  payer.key = 'payer-b';
  const replaced = h.tick().choice; assert.notEqual(replaced.key, revised.key); assert.equal(h.state.casts.length, 3);
  assert.equal(h.state.payments[2].key, 'payer-b'); assert.equal(followed, 0);
  h.state.modifiers = []; h.self.point = [10, 0, 0];
  h.tick(); assert.equal(h.state.casts[3].id, payer.id); assert.equal(followed, 0);
});

check('dispatch rejects a changed slot selection or paying key even within the captured frame', () => {
  const h = harness(); const payer = h.add('test:payer', 'world_combat:attack');
  const effective = h.define('test:effective', 'world_combat:attack');
  let frame = h.frame();
  const use = value => value.services.behavior.use(value.capabilities[0], value.facts.nearby[0]);
  h.state.modifiers.push({ id: 24, data: { moves: { 0: effective.id } } });
  assert.equal(use(frame), false); assert.equal(h.state.casts.length, 0);
  frame = h.frame(); assert.equal(use(frame), 1);
  h.state.modifiers[0].id = 25; assert.equal(use(frame), false);
  frame = h.frame(); payer.key = 'new-paying-key'; assert.equal(use(frame), false);
  frame = h.frame(); assert.equal(use(frame), 2); assert.equal(h.state.payments[1].key, 'new-paying-key');
  h.state.skills[0] = null; assert.equal(use(frame), false); assert.equal(h.state.casts.length, 2);
});

check('a policy exemption follows the effective definition and preserves independent blockers', () => {
  const h = harness(); h.state.locked = true;
  h.sandbox.CombatStatus.actions.define({ id: 'test:conditions', before: ['cobblemon_world_combat:skill-policy'], apply: policy => {
    if (h.state.locked) policy.blocked['test:locked'] = true;
    if (h.state.otherBlocked) policy.blocked['test:independent'] = true;
  } });
  const payer = h.add('test:payer', 'world_combat:attack');
  const effective = h.define('test:effective', 'world_combat:attack', { priority: () => -5 }, { policy: {
    flags: { permitted: true }, eligibility: policy => { if (policy.metadata.flags.permitted) delete policy.blocked['test:locked']; },
  } });
  assert.equal(h.frame().capabilities[0].data.ready, false); h.tick(); assert.equal(h.state.casts.length, 0);
  h.state.modifiers.push({ id: 31, data: { moves: { 0: effective.id } } });
  assert.equal(h.frame().capabilities[0].data.ready, true); h.tick(); assert.equal(h.state.casts[0].id, effective.id);
  assert.equal(h.state.rolls, 0); h.state.otherBlocked = true;
  assert.equal(h.frame().capabilities[0].data.ready, false); h.tick(); h.tick(); assert.equal(h.state.casts.length, 1);
  h.state.otherBlocked = false; h.state.modifiers[0] = { id: 32, data: { moves: { 0: payer.id } } };
  assert.equal(h.frame().capabilities[0].data.ready, false); h.tick(); assert.equal(h.state.casts.length, 1);
  h.state.locked = false; h.tick(); assert.equal(h.state.casts[1].id, payer.id);
});

check('commit-time policy changes and failed attempts retain the paying resource', () => {
  for (const probabilistic of [false, true]) {
    const h = harness(); const payer = h.add('test:payer', 'world_combat:attack');
    h.sandbox.CombatStatus.actions.define({ id: 'test:condition', apply: policy => {
      if (probabilistic) policy.failures['test:attempt'] = 1;
      else if (h.state.locked) policy.blocked['test:locked'] = true;
    } });
    if (!probabilistic) h.state.beforeCommit = () => { h.state.locked = true; };
    assert.equal(h.frame().capabilities[0].data.ready, true); assert.equal(h.state.rolls, 0);
    const report = h.tick(); assert.equal(report.result.reason, 'cast-refused'); assert.equal(h.state.casts.length, 0);
    assert.equal(payer.pp, 10); assert.equal(h.state.payments.length, 0); assert.equal(h.agent.memory.events, undefined);
    assert.equal(h.state.rolls, probabilistic ? 1 : 0);
  }
});

check('velocity and domain snapshots reach callbacks independently of movement speed attributes', () => {
  const h = harness(); h.self.velocity = [0, .25, 0]; h.threat.velocity = [1, -.5, 2]; h.threat.speed = .7;
  const context = h.context(), target = context.facts.nearby[0];
  assert.deepEqual(plain(context.facts.self.velocity), [0, .25, 0]);
  assert.deepEqual(plain(target.velocity), [1, -.5, 2]); assert.equal(target.speed, .7);
  const lone = new h.sandbox.WorldBehaviorHost.Adapter().snapshot(h.state.world.observe(h.state.world.actor(h.threat.ref)), h.state.world);
  assert.deepEqual(plain(lone.velocity), plain(target.velocity)); assert.equal(lone.domain, target.domain);
  context.services.fact = () => { throw Error('Published facts must not trigger another host query'); };
  assert.equal(h.C.domain(context, target), 'minecraft'); assert.deepEqual(plain(h.C.velocity(context, target)), [1, -.5, 2]);
  h.threat.velocity[0] = 9; assert.equal(target.velocity[0], 1); assert.equal(h.frame().facts.nearby[0].velocity[0], 9);
});

check('optional velocity facts distinguish stationary, unavailable and stale observations', () => {
  const h = harness(); const bare = { ref: h.threat.ref, point: h.threat.point };
  const context = h.context(); let reads = 0; const observe = h.state.world.observe;
  h.state.world.observe = actor => { reads++; return observe(actor); };
  assert.deepEqual(plain(h.C.velocity(context, bare)), [0, 0, 0]); h.C.velocity(context, bare); assert.equal(reads, 1);
  delete h.threat.velocity;
  const next = h.context(); assert.equal(next.facts.nearby[0].velocity, undefined);
  assert.equal(h.C.velocity(next, bare), null);
  h.state.subjects = [h.self]; assert.equal(h.C.velocity(h.context(), bare), null);
});

check('non-slot dispatch preserves authored aim through the shared action bridge', () => {
  for (const kind of ['self', 'point', 'motion', 'enemy', 'friend']) {
    const h = harness(); const at = [2, 0, 3];
    h.state.subjects.push(subject('actor:friend', { friendly: true, point: [2, 0, 0] }));
    h.C.registerUse('test:grant', { protocols: ['world_combat:attack'],
      selectTarget: (context, _item, target) => kind === 'friend' ? context.facts.nearby.find(value => value.friendly) : target,
      target: (_context, _item, target) => ({ ...target, point: at }) });
    h.C.readFacts('test:grant', frame => h.sandbox.WorldAbilities.grant(frame,
      { id: 'test:grant', action: 'test:action', use: 'test:grant', protocols: ['world_combat:attack'], kind, range: 16 }));
    h.tick(); const cast = h.state.casts[0]; assert(cast, kind);
    assert.equal(cast.target, ['point', 'motion'].includes(kind) ? null : kind === 'self' ? h.self.ref : kind === 'friend' ? 'actor:friend' : h.threat.ref);
    assert(Math.abs(cast.direction[0] - 2 / Math.sqrt(13)) < 1e-8, kind); assert(Math.abs(cast.direction[2] - 3 / Math.sqrt(13)) < 1e-8, kind);
    if (['point', 'motion'].includes(kind)) assert.deepEqual(cast.point, at);
    assert.equal(h.state.payments.length, 0);
  }
});

check('non-slot dispatch still refuses invalid entity identities and relationships', () => {
  for (const missing of [false, true]) {
    const h = harness();
    h.C.registerUse('test:grant', { protocols: ['world_combat:attack'], target: (_context, _item, target) =>
      ({ ...target, ref: missing ? 'actor:missing' : target.ref, point: [2, 0, 3] }) });
    h.C.readFacts('test:grant', frame => h.sandbox.WorldAbilities.grant(frame,
      { id: 'test:grant', action: 'test:action', use: 'test:grant', protocols: ['world_combat:attack'], kind: 'friend', range: 16 }));
    assert.equal(h.tick().result.reason, 'cast-refused'); assert.equal(h.state.casts.length, 0);
  }
});

check('wild entry paths use world-scoped effective support and release revoked replacements', () => {
  for (const entry of ['world_combat:actor_bound', 'world_combat:actor_changed', 'clock']) {
    const h = harness(); h.self.wild = true;
    const effective = h.define('test:effective', 'world_combat:attack');
    h.state.skills.push({ id: 'test:unmapped', key: 'paying-key', pp: 4, maxPp: 8 });
    h.state.modifiers.push({ id: 41, data: { moves: { 0: effective.id } } });
    const supports = h.C.supports; let scoped = 0;
    h.C.supports = (pokemon, world) => { assert.equal(world, h.state.world); scoped++; return supports(pokemon, world); };
    if (entry === 'clock') h.state.world.effect('world_combat:wild/clock', h.state.world.source(), '{}', 1200000);
    else h.emit(entry);
    const clock = h.state.effects.find(effect => effect.definition() === 'world_combat:wild/clock'); assert(clock, entry);
    h.advanceEffects(); assert.equal(h.state.casts[0].id, effective.id, entry);
    assert.equal(h.state.payments[0].key, 'paying-key'); assert(scoped >= 2, entry); assert.equal(h.state.controls[0], true);
    h.state.modifiers = []; h.advanceEffects();
    assert.equal(clock.ended, true); assert.equal(h.state.controls.at(-1), false); assert.equal(h.state.casts.length, 1);
  }
});

check('wild notifications retain the successful pre-cast identity and omit refused casts', () => {
  const h = harness(); h.self.wild = true; const used = [];
  const first = h.define('test:first', 'world_combat:attack'), second = h.define('test:second', 'world_combat:attack');
  h.state.skills.push({ id: 'test:unmapped', key: 'paying-key', pp: 4, maxPp: 8 });
  for (const id of ['test:unmapped', first.id, second.id]) h.C.onUsed(id, () => used.push(id));
  h.emit('world_combat:actor_bound'); assert.equal(h.state.effects.length, 0);
  h.state.modifiers.push({ id: 51, data: { moves: { 0: first.id } } });
  h.state.afterCast = () => { h.state.modifiers[0] = { id: 52, data: { moves: { 0: second.id } } }; delete h.state.afterCast; };
  h.emit('world_combat:actor_changed'); h.advanceEffects();
  assert.deepEqual(used, [first.id]); assert.equal(h.state.casts[0].invocation.executing, first.id);
  h.advanceEffects(); assert.deepEqual(used, [first.id, second.id]);
  h.state.allowCast = false; h.state.modifiers[0].id = 53; h.advanceEffects();
  assert.deepEqual(used, [first.id, second.id]); assert.equal(h.state.casts.length, 2);
  assert.equal(h.state.skills[0].pp, 2); assert.equal(h.state.payments.length, 2);
});

check('manual pending cleanup releases autonomous JS state without stopping native manual navigation',()=>{
  const h=harness();h.state.intent='hold';h.state.tick=20;let lastManual=0,pending=false,stops=0,memory='{"checks":true}';
  h.state.world.stopMovement=()=>stops++;
  const orders=new h.sandbox.PokemonBehaviorHost.Orders();orders.register({id:'hold',persistent:true});
  const manager=new h.sandbox.PokemonBehaviorHost.Companions({frame:()=>h.frame()},new h.M.Pool(h.C.registry),{id:'checks',orders,defaultIntent:'hold',decisionTicks:4,manualGrace:12,settings:{lookRange:15,chaseRange:16}});
  const view={world:()=>h.state.world,actor:h.state.world.source,operation:()=> 'tick',owner:()=>null,intent:()=> 'hold',intentPoint:()=>null,intentTarget:()=>null,chaseRange:()=>16,captureHold:()=>'',
    lastManual:()=>lastManual,pending:()=>pending,pendingNavigation:()=>pending,preferences:()=> '{}',settings(){},report(){},submitInput(){return 0;},memory(value){if(value!==undefined)memory=value;return memory;}};
  manager.update(view);assert(stops>0,'Autonomous hold established before takeover');const before=stops;
  pending=true;lastManual=24;h.state.tick=24;manager.update(view);assert.equal(stops,before,'Accepted manual navigation survives old task exit');
  h.state.tick=28;manager.update(view);assert.equal(stops,before,'Waiting manual order is not replaced by default behavior');
  pending=false;h.state.tick=40;manager.update(view);assert(stops>before,'Normal command resumes after manual waiting finishes');
});
check('focus approaches while cooling down and searches only its last visible observation',()=>{
  const h=harness();h.add('checks:shot','world_combat:attack',{}, {ready:false,range:3});h.threat.point=[8,0,0];
  function focused(issue=''){const frame=h.frame();frame.facts.intent='focus';frame.facts.focus=h.threat.ref;frame.facts.focusIssue=issue;const result=h.agent.tick(frame);h.state.tick+=4;return result;}
  focused();assert.deepEqual(h.state.moves.at(-1).point,[8,0,0]);assert.equal(h.state.casts.length,0);
  h.threat.visible=false;h.threat.point=[15,0,5];focused('target-not-visible');assert.deepEqual(h.state.moves.at(-1).point,[8,0,0],'Hidden fresh coordinates must not become a navigation goal');
  h.state.tick=70;const count=h.state.moves.length;focused('target-not-visible');assert.equal(h.state.moves.length,count,'Search stops when the observed memory expires');
  h.threat.visible=true;h.threat.point=[6,0,2];focused();assert.deepEqual(h.state.moves.at(-1).point,[6,0,2]);
});
check('focus closes distance before target-dependent availability permits a cast',()=>{
  const h=harness();h.threat.point=[18,0,0];h.state.intent='focus';
  h.add('checks:reach','world_combat:attack',{available:(_c,_i,_p,target)=>!target||target.point[0]<=8,accepts:(_c,_i,target)=>!target.friendly},{range:4});
  const f=h.frame();f.facts.focus=h.threat.ref;f.facts.focusIssue='';h.agent.tick(f);
  assert.deepEqual(h.state.moves.at(-1).point,[18,0,0]);assert.equal(h.state.casts.length,0,'Approach must not bypass the use gate');
});
check('a passive buffered input leaves the current behavior task running',()=>{
  const h=harness();h.state.tick=20;let ticks=0,exits=0,memory='{"checks":true}';
  const registry=new h.B.Registry();registry.goal({id:'checks:follow',propose:()=>[{id:'follow',kind:'follow',data:{}}]});
  registry.method({id:'checks:walk',propose:()=>[{id:'walk',data:{}}],create:()=>h.B.step(()=>{ticks++;return h.B.running();},{exit:()=>exits++})});
  const orders=new h.sandbox.PokemonBehaviorHost.Orders();orders.register({id:'follow'});
  const manager=new h.sandbox.PokemonBehaviorHost.Companions({frame:()=>h.frame()},new h.M.Pool(registry),{id:'checks',orders,defaultIntent:'follow',decisionTicks:4,manualGrace:12,settings:{lookRange:15,chaseRange:16}});
  const view={world:()=>h.state.world,actor:h.state.world.source,operation:()=> 'tick',owner:()=>null,intent:()=> 'follow',intentPoint:()=>null,intentTarget:()=>null,chaseRange:()=>16,captureHold:()=>'',lastManual:()=>0,
    pending:()=>true,pendingNavigation:()=>false,preferences:()=> '{}',settings(){},report(){},submitInput(){return 0;},memory(value){if(value!==undefined)memory=value;return memory;}};
  manager.update(view);h.state.tick=24;manager.update(view);assert.equal(ticks,2);assert.equal(exits,0);
});
check('focus death, disappearance and changed allegiance restore the previous station command',()=>{
  for(const ending of ['death','leave','friendly']){
    const h=harness();h.state.tick=20;let memory='{"checks":true}',prefs='{}',intent='stay',at=point([1,0,2]),target=null,operation='tick';
    const orders=new h.sandbox.PokemonBehaviorHost.Orders();orders.register({id:'follow'});orders.register({id:'stay',target:'point',range:32,persistent:true});orders.register({id:'focus',target:'enemy',range:64,attackTarget:true});
    const manager=new h.sandbox.PokemonBehaviorHost.Companions({frame:(...args)=>h.C.frame(...args)},new h.M.Pool(h.C.registry),{id:'checks',orders,defaultIntent:'follow',decisionTicks:4,manualGrace:0,settings:{lookRange:15,chaseRange:16}});
    const view={world:()=>h.state.world,actor:h.state.world.source,operation:()=>operation,owner:()=>null,commandTarget:()=>h.state.world.actor(h.threat.ref),commandPoint:()=>point([1,0,2]),
      intent(id,subject,destination){if(id!==undefined){intent=id;target=subject;at=destination;}return intent;},intentPoint:()=>at,intentTarget:()=>target&&h.state.world.valid(target)?target:null,
      chaseRange:()=>16,captureHold:()=>'',lastManual:()=>0,pending:()=>false,pendingNavigation:()=>false,settings(){},report(){},submitInput(){return 0;},reject:reason=>{throw Error(reason);},
      preferences(value){if(value!==undefined)prefs=value;return prefs;},memory(value){if(value!==undefined)memory=value;return memory;}};
    manager.update(view);h.state.tick+=4;operation='focus';manager.update(view);assert.equal(intent,'focus');
    assert.equal(JSON.parse(prefs).checks.intent,'stay','Pursuit preserves the reload command');
    assert.deepEqual(JSON.parse(prefs).checks.point,[1,0,2]);
    operation='tick';h.state.tick+=4;manager.update(view);
    h.self.point=[50,0,0];
    if(ending==='death')h.threat.health=0;else if(ending==='friendly')h.threat.friendly=true;else h.state.subjects=h.state.subjects.filter(s=>s!==h.threat);
    h.state.tick+=4;manager.update(view);assert.equal(intent,'stay',ending);assert.deepEqual(coordinates(at),[1,0,2]);assert.equal(target,null);
  }
});
console.log(`PASS ${cases} neutral AI dispatch regressions; in-memory output only`);
assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, {
  getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n',
}));
console.log('PASS strict ES5 dependency check');
