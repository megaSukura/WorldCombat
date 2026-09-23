import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Neutral mechanism regression: execute production callbacks, with native events deferred as in MinecraftCombat.
const scripts = ['content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/protocols/effects.ts', 'content/mechanisms/mob-effects.ts',
  'content/mechanisms/status-contributions.ts', 'content/mechanisms/status-vocabulary.ts',
  'content/mechanisms/combat-status.ts', 'content/mechanisms/combat-stages.ts',
  'content/mechanisms/native-modifiers.ts', 'content/mechanisms/native-effects.ts']
  .map(file => ({ file, code: ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
  }).outputText }));
const carrier = 'checks:carrier', otherCarrier = 'checks:other_carrier';
const recordDefinition = 'world_combat:status_contribution', managerDefinition = 'world_combat:status_carrier';

function harness() {
  const definitions = new Map(), handlers = new Map(), hooks = new Map(), actors = new Map();
  const effects = new Map(), leases = new Map(), nativeEvents = [], endCalls = [];
  const recipes = new Map(), guards = new Map(), fields = new Map(); let parameters = {};
  let now = 0, nextEffect = 0, nextNative = 0, nextLease = 0;
  const context = vm.createContext({ CobblemonCombat: { pokemon: actor => ({ ability: () => actor.ability || '',
      typeCount: () => (actor.types || []).length, type: index => actor.types[index] }) },
    NativeAbilities: { flag: () => false, apply: (_world, _actor, _hook, value) => value },
    GuardEffects: { register: (id, policy) => guards.set(id, policy) },
    PokemonSkills: { define: value => recipes.set(value.id, value), flag: () => ({}), field: () => ({}), pathOf: key => [key], p: (_id, key) => parameters[key] ?? 12 },
    WorldBodies: { define() {} }, WorldEnvironment: { weatherTag: name => 'checks:weather/' + name },
    WorldFeedback: { emit() {}, keep() {}, text() {} }, WorldEffects: { fieldRule: (id, rule) => fields.set(id, rule), field() {}, categories: { weather: 'checks:weather' } }, WorldCombat: {
    point: (x, y, z) => point(x, y, z),
    event() {}, phase() {},
    effect(id, _schema, maximum, lifetime, normalize) {
      assert(!definitions.has(id), `Duplicate effect ${id}`);
      definitions.set(id, { maximum, lifetime, normalize });
    },
    effectHandler(id, name, callback) {
      assert(!handlers.has(`${id}/${name}`), `Duplicate callback ${id}/${name}`);
      handlers.set(`${id}/${name}`, callback);
    },
    on(id, topic, _after, callback) {
      assert(!hooks.has(id), `Duplicate listener ${id}`);
      hooks.set(id, { topic, callback });
    },
  } });
  for (const { file, code } of scripts) vm.runInContext(code, context, { filename: file });
  const api = context.StatusContributions;
  api.define(carrier); api.define(otherCarrier);
  context.WorldCombat.effect('checks:owner', 1, 1000, 'actor', json => json);
  context.WorldCombat.effectHandler('checks:owner', 'start', () => {});
  function actor(id, x = 0, native = false) {
    const value = { id, x, native, nativeId: -actors.size - 1, state: context.NativeEffects.empty(), live: true,
      markers: new Map(), claims: new Map(), key: () => id, ref: () => id,
      domain: () => native ? 'cobblemon' : 'minecraft' };
    actors.set(id, value); return value;
  }
  const a = actor('checks:source_a'), b = actor('checks:source_b', 1);
  const target = actor('checks:target', 2), other = actor('checks:other_target', 3);
  const point = (x, y = 0, z = 0) => ({ minus: value => point(x - value.x(), y - value.y(), z - value.z()),
    plus: value => point(x + value.x(), y + value.y(), z + value.z()),
    length: () => Math.hypot(x, y, z), x: () => x, y: () => y, z: () => z });
  const live = effect => effects.has(effect.id) && effect.source.live && effect.target.live;
  function view(effect) {
    // Runtime queries return snapshots and filter invalid owners before the next cleanup tick.
    const remaining = effect.remaining, data = effect.data;
    return { id: () => effect.id, definition: () => effect.definition, source: () => effect.source,
      target: () => effect.target, remaining: () => remaining, data: () => data };
  }
  function nativeView(target, id) {
    const value = target.markers.get(id);
    if (!target.live || !value || value.expires <= now) return null;
    return { id: () => id, duration: () => value.expires - now, amplifier: () => value.amplifier,
      key: () => `${value.revision}:${value.expires}:${value.amplifier}`, tags: () => value.tags || '', tagged: tag => (value.tags || '').split(' ').includes(tag) };
  }
  function clear(target, id) {
    if (!target.markers.delete(id)) return false;
    nativeEvents.push({ target, id, topic: 'world_combat:mob_effect_removed' }); return true;
  }
  function marker(target, id, ticks, amplifier) {
    if (target.rejectMarkers) return;
    if (ticks === 0) { clear(target, id); return; }
    const old = target.markers.get(id);
    // Vanilla keeps a weaker, longer application hidden until the current stronger effect ends.
    const weaker = old && old.amplifier > amplifier;
    const expires = weaker ? old.expires : Math.max(old?.expires ?? 0, now + ticks);
    const hidden = weaker && now + ticks > expires ? { expires: now + ticks, amplifier } : old?.hidden;
    target.markers.set(id, { expires, amplifier: Math.max(old?.amplifier ?? 0, amplifier), hidden, revision: ++nextNative });
    nativeEvents.push({ target, id, topic: 'world_combat:mob_effect_added' });
  }
  function owns(lease) {
    // Owner cleanup uses the captured native body even after its actor handle becomes invalid.
    const native = lease.target.markers.get(lease.carrier);
    return lease.target.claims.get(lease.carrier) === lease.token &&
      native && `${native.revision}:${native.expires}:${native.amplifier}` === lease.key;
  }
  function release(owner, token) {
    const lease = leases.get(token);
    if (!lease || lease.owner !== owner) return false;
    const owned = owns(lease); leases.delete(token);
    if (lease.target.claims.get(lease.carrier) === token) lease.target.claims.delete(lease.carrier);
    return owned && clear(lease.target, lease.carrier);
  }
  function end(effect, invalid = false) {
    if (!effects.has(effect.id) || effect.ending) return;
    effect.ending = true;
    if (!invalid && live(effect) && handlers.has(`${effect.definition}/end`)) {
      endCalls.push(effect.id); invoke(effect, 'end');
    }
    effects.delete(effect.id); effect.timers.clear();
    for (const lease of [...leases.values()]) if (lease.owner === -effect.id) release(-effect.id, lease.token);
  }
  function duration(definition, ticks) {
    assert(Number.isInteger(ticks) && ticks >= 1 && ticks <= definition.maximum, 'Managed duration is in declared range');
  }
  function invoke(effect, name, input = '{}', caller = effect.source) {
    assert(live(effect), 'Effect callback requires live source and target');
    const callback = handlers.get(`${effect.definition}/${name}`);
    assert(callback, `Missing effect callback ${effect.definition}/${name}`);
    const definition = definitions.get(effect.definition);
    callback({ id: () => effect.id, source: () => effect.source, target: () => effect.target, caller: () => caller,
      world: () => world(effect.source, -effect.id), input: () => input,
      state(json) { if (json !== undefined) effect.data = definition.normalize(json); return effect.data; },
      copyTo: (source, target, json, ticks) => world(source).effect(effect.definition, target, json, ticks),
      remaining(ticks) { if (ticks !== undefined) { duration(definition, ticks); effect.remaining = ticks; } return effect.remaining; },
      schedule(key, name, ticks, input) {
        duration(definition, ticks); effect.timers.set(key, { name, at: now + ticks, input });
      },
      end: () => end(effect), reject: reason => { throw new Error(reason); },
    });
  }
  function world(source, owner = 0) {
    return { source: () => source, tick: () => now, valid: actor => actor.live, random: () => source.random ?? 0.5,
      actor: ref => actors.get(String(ref))?.live ? actors.get(String(ref)) : null,
      observe: actor => actor.live ? { position: () => point(actor.x), height: () => 1.6, maxHealth: () => 100 } : null,
      effects: (target, definition) => target.native && definition === 'cobblemon_world_combat:individual'
        ? [{ id: () => target.nativeId, data: () => JSON.stringify(target.state) }]
        : [...effects.values()].filter(effect => effect.target === target &&
        (!definition || effect.definition === definition) && live(effect)).map(view),
      effectsOfType: definition => [...effects.values()].filter(effect => effect.definition === definition && live(effect)).map(view),
      effect(definitionId, target, json, ticks) {
        assert(source.live && target.live, 'Effects require valid actors');
        const definition = definitions.get(definitionId); assert(definition, `Unknown effect ${definitionId}`);
        duration(definition, ticks);
        const effect = { id: ++nextEffect, definition: definitionId, source, target,
          data: definition.normalize(json), remaining: ticks, timers: new Map() };
        effects.set(effect.id, effect); invoke(effect, 'start'); return effect.id;
      },
      operation(id, operation, json) {
        if (id < 0) {
          const actor = [...actors.values()].find(value => value.nativeId === id);
          assert(actor?.native && operation === 'cobblemon_world_combat:update');
          actor.state = JSON.parse(json); delete actor.state.layers; return true;
        }
        const effect = effects.get(id); if (!effect) return false;
        assert(source.live && live(effect), 'Operations require a live caller and effect');
        assert(Math.abs(source.x - effect.target.x) <= 64, 'Operations require a nearby target');
        invoke(effect, `operation:${operation}`, json, source); return true;
      },
      marker, mobEffect: nativeView, mobEffects: target => [...target.markers.keys()].map(id => nativeView(target, id)).filter(Boolean), sound() {}, motion() {}, displace() { return 0; },
      removeMobEffect(target, id, key) { return nativeView(target, id)?.key() === key && clear(target, id); },
      leaseMobEffect(target, id, key) {
        assert(owner !== 0, 'Native ownership requires a managed effect or action');
        if (nativeView(target, id)?.key() !== key) return 0;
        const token = ++nextLease; leases.set(token, { token, owner, target, carrier: id, key });
        target.claims.set(id, token); return token;
      },
      mobEffectLeasePresent(token) {
        const lease = leases.get(token);
        return !!lease && source.live && lease.target.live && Math.abs(source.x - lease.target.x) <= 64 && !!owns(lease);
      },
      releaseMobEffectLease: token => release(owner, token),
    };
  }
  function flush() {
    let callbacks = 0;
    while (nativeEvents.length) {
      assert(++callbacks < 100, 'Native events must settle');
      const event = nativeEvents.shift(); if (!event.target.live) continue;
      for (const hook of hooks.values()) if (hook.topic === event.topic) hook.callback({
        world: () => world(event.target), actor: () => event.target, target: () => event.target,
        data: () => JSON.stringify({ id: event.id }),
      });
    }
  }
  function advance(ticks = 1) {
    for (let i = 0; i < ticks; i++) {
      now++;
      for (const actor of actors.values()) for (const [id, native] of actor.markers) if (native.expires <= now) {
        if (native.hidden && native.hidden.expires > now)
          actor.markers.set(id, { ...native.hidden, revision: ++nextNative });
        else clear(actor, id);
      }
      flush();
      for (const effect of [...effects.values()]) {
        if (!effects.has(effect.id)) continue;
        if (!live(effect)) { end(effect, true); continue; }
        if (--effect.remaining <= 0) { end(effect); continue; }
        for (const [key, timer] of [...effect.timers]) if (timer.at <= now && live(effect)) {
          effect.timers.delete(key); invoke(effect, timer.name, timer.input);
        }
      }
    }
  }
  const listed = (actor = target, id = carrier) => Array.from(api.list(world(target), actor, id));
  const count = definition => [...effects.values()].filter(effect => effect.definition === definition).length;
  const insert = (source = a, recipient = target, token = 'checks:first', ticks = 30, payload = { value: 1 }, options) =>
    api.upsert(world(source), recipient, carrier, token, payload, ticks, options);
  function loadSkill(id) {
    if (!recipes.has(id)) vm.runInContext(ts.transpileModule('namespace PokemonSkills { export var define: any, flag: any, field: any, pathOf: any, p: any; }\n'
      + fs.readFileSync(`content/moves/${id}/skill.ts`, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
    }).outputText, context, { filename: `content/moves/${id}/skill.ts` });
  }
  function executeSkill(id, target, values, config = {}) {
    loadSkill(id);
    parameters = values;
    const action = { world: () => world(target), actor: () => target, after: (_ticks, run) => run(action) };
    recipes.get(id).execute(action, {}, config, () => {});
  }
  function guardedSkill(id, target, custom) {
    loadSkill(id);
    guards.get(`world_combat:${id}`).guarded({ id: () => 700, world: () => world(target), target: () => target, end() {} }, custom, 20, {});
  }
  function loadSnow() {
    if (!fields.has('checks:snow')) {
      const declarations = 'namespace PokemonSkills { export const snowscapeField="checks:snow", snowscapeMark="checks:powder", snowscapeScene="checks:snow_scene", snowscapeCrispText="checks:crisp", snowscapeCoverText="checks:cover", snowscapeLockText="checks:lock"; }\n';
      vm.runInContext(ts.transpileModule(declarations + fs.readFileSync('content/moves/snowscape/rules.ts', 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None }
      }).outputText, context);
      context.WorldCombat.effect('world_combat:field', 1, 1200, 'actor', json => json);
      context.WorldCombat.effectHandler('world_combat:field', 'start', () => {});
    }
    return fields.get('checks:snow');
  }
  function loadMemento() {
    const declarations = 'namespace PokemonSkills { export var define: any, p: any; export const mementoId="memento", mementoRemnant="checks:remnant", mementoEffect="checks:grief", mementoScene="checks:grief_scene"; }\n';
    vm.runInContext(ts.transpileModule(declarations + fs.readFileSync('content/moves/memento/skill.ts', 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None }
    }).outputText, context);
    return context.CombatStatus;
  }
  return { api, stages: context.NativeEffects, changes: context.CombatStages.change, actor, a, b, target, other, world, insert, listed, flush, clear, marker, advance, effects, leases, endCalls,
    nativeView, executeSkill, guardedSkill, loadSnow, loadMemento, count, end: id => end(effects.get(id)), definitions };
}

test('registration validates carriers; the first native event creates a target-owned manager and lease', () => {
  const h = harness();
  assert.throws(() => h.api.define('invalid carrier'));
  assert.throws(() => h.api.upsert(h.world(h.a), h.target, 'checks:undefined', 'token', {}, 20));
  const id = h.insert(); assert(id > 0);
  assert.equal(h.count(managerDefinition), 0, 'Native Added has not yet been delivered');
  assert.equal(h.listed().length, 1);
  h.flush();
  const managers = [...h.effects.values()].filter(effect => effect.definition === managerDefinition);
  assert.equal(managers.length, 1); assert.equal(managers[0].source, h.target); assert.equal(managers[0].target, h.target);
  assert.equal(h.leases.size, 1); assert.equal([...h.leases.values()][0].owner, -managers[0].id);
});

test('contribution identity isolates sources, targets, carriers and tokens; upsert refreshes only its record', () => {
  const h = harness(), id = h.insert();
  h.insert(h.b); h.insert(h.a, h.target, 'checks:second'); h.insert(h.a, h.other);
  h.api.upsert(h.world(h.a), h.target, otherCarrier, 'checks:first', { value: 7 }, 30);
  h.flush(); h.advance(3);
  assert.equal(h.insert(h.a, h.target, 'checks:first', 50, { value: 9 }), id);
  const records = h.listed(); assert.equal(records.length, 3);
  assert.equal(records.find(record => record.id === id).payload.value, 9);
  assert.equal(records.find(record => record.id === id).remaining, 50);
  assert.equal(records.find(record => record.source === h.b).remaining, 27);
  assert.equal(h.listed(h.other).length, 1); assert.equal(h.listed(h.target, otherCarrier).length, 1);
});

test('remove and removeSource revoke only the current source and report actual removals', () => {
  const h = harness(); h.insert(); h.insert(h.b); h.insert(h.a, h.other); h.insert(h.a, h.target, 'checks:second'); h.flush();
  assert.equal(h.api.removeSource(h.world(h.a), carrier, 'checks:first'), 2);
  assert.equal(h.api.removeSource(h.world(h.a), carrier, 'checks:first'), 0);
  assert.equal(h.listed().length, 2); assert.equal(h.listed(h.other).length, 0);
  assert.equal(h.api.remove(h.world(h.a), h.target, carrier, 'checks:first'), false);
  assert.equal(h.api.remove(h.world(h.b), h.target, carrier, 'checks:first'), true);
  assert.equal(h.listed().length, 1);
  assert.equal(h.api.remove(h.world(h.a), h.target, carrier, 'checks:second'), true);
  assert.equal(h.nativeView(h.target, carrier), null); h.flush();
  assert.equal(h.count(recordDefinition), 0); assert.equal(h.count(managerDefinition), 0);
});

test('independent clocks expire without removing a longer contribution or its carrier', () => {
  const h = harness(); h.insert(h.a, h.target, 'checks:first', 4); h.insert(h.b, h.target, 'checks:first', 8); h.flush();
  h.advance(4); assert.equal(h.listed().length, 1); assert.equal(h.listed()[0].source, h.b);
  assert(h.nativeView(h.target, carrier)); h.advance(4); h.flush();
  assert.equal(h.listed().length, 0); assert.equal(h.count(recordDefinition), 0);
  assert.equal(h.count(managerDefinition), 0); assert.equal(h.nativeView(h.target, carrier), null);
});

test('source and target invalidation are visible before effect cleanup and do not rely on end callbacks', () => {
  const h = harness(); const first = h.insert(); h.insert(h.b); h.flush();
  h.a.live = false; assert.equal(h.listed().length, 1); assert.equal(h.listed()[0].source, h.b);
  h.advance(); assert(!h.effects.has(first)); assert(!h.endCalls.includes(first)); assert(h.nativeView(h.target, carrier));
  h.b.live = false; assert.equal(h.listed().length, 0); h.advance(); h.flush();
  assert.equal(h.nativeView(h.target, carrier), null);
  h.a.live = true; h.insert(); h.flush(); h.target.live = false;
  assert.equal(h.listed().length, 0); h.advance(); assert.equal(h.effects.size, 0);
  assert.equal(h.target.markers.size, 0, 'Invalidation releases native ownership without an end callback');
});

test('owner identity is exact and ending the owner immediately filters the contribution', () => {
  const h = harness(), owner = h.world(h.a).effect('checks:owner', h.a, '{}', 40);
  const reference = { id: owner, definition: 'checks:owner', target: h.a.ref() };
  h.insert(h.a, h.target, 'checks:owned', 30, { value: 2 }, { owner: reference }); h.insert(h.b); h.flush();
  assert.equal(h.listed().length, 2);
  h.insert(h.a, h.target, 'checks:wrong-definition', 30, {}, { owner: { ...reference, definition: 'checks:absent' } });
  h.insert(h.a, h.target, 'checks:wrong-target', 30, {}, { owner: { ...reference, target: h.other.ref() } });
  assert.equal(h.listed().length, 2);
  h.end(owner); assert.equal(h.listed().length, 1); assert.equal(h.listed()[0].source, h.b);
  h.api.remove(h.world(h.b), h.target, carrier, 'checks:first'); h.flush();
  assert.equal(h.nativeView(h.target, carrier), null); assert.equal(h.count(recordDefinition), 0);
});

test('native clear immediately removes gameplay facts; deferred cleanup settles and later upsert recovers', () => {
  const h = harness(); h.insert(); h.insert(h.b); h.flush();
  h.clear(h.target, carrier); assert.equal(h.listed().length, 0);
  h.flush(); assert.equal(h.count(recordDefinition), 0); assert.equal(h.count(managerDefinition), 0);
  h.insert(h.a, h.target, 'checks:restored', 20); h.flush();
  assert.equal(h.listed().length, 1); assert.equal(h.listed()[0].token, 'checks:restored');
});

test('upsert before a queued native removal is delivered restores its token without reviving cleared contributors', () => {
  for (const established of [false, true]) {
    const h = harness(); h.insert(); h.insert(h.b); if (established) h.flush();
    h.clear(h.target, carrier); assert.equal(h.listed().length, 0);
    h.insert(h.a, h.target, 'checks:first', 20, { value: 8 }); h.flush();
    assert.equal(h.listed().length, 1, `Cleared source B must not reappear (manager established: ${established})`);
    assert.equal(h.listed()[0].source, h.a); assert.equal(h.listed()[0].payload.value, 8);
  }
});

test('same-tick native reapplication retires the old lease; manager rebind protects the current carrier', () => {
  const h = harness(); h.insert(); h.flush();
  const original = [...h.leases.values()][0];
  h.insert(h.b); assert.equal(h.world(h.target).mobEffectLeasePresent(original.token), false);
  assert.equal(h.world(h.target, original.owner).releaseMobEffectLease(original.token), false);
  assert(h.nativeView(h.target, carrier)); h.flush();
  assert.equal(h.listed().length, 2);
  h.api.remove(h.world(h.a), h.target, carrier, 'checks:first'); assert(h.nativeView(h.target, carrier));
  h.api.remove(h.world(h.b), h.target, carrier, 'checks:first'); assert.equal(h.nativeView(h.target, carrier), null);
});

for (const native of [false, true]) {
  const domain = native ? 'native' : 'ordinary';
  test(`${domain} stage refresh accumulates to the cap and ends once without deducting a later base gain`, () => {
    const h = harness(), target = native ? h.actor('checks:native', 2, true) : h.target;
    const world = h.world(h.a), id = 'checks:stage_carrier', source = 'checks:stage_grant';
    const stage = () => h.stages.effectiveStage(world, target, 'atk');
    const refresh = (amount, ticks) => {
      const previous = h.nativeView(target, id);
      h.marker(target, id, ticks, 0);
      const current = h.nativeView(target, id);
      return h.stages.boostWindow(world, target, { atk: amount }, current.duration(), source, current, previous);
    };
    h.stages.boost(world, target, 'atk', 1, true);
    h.stages.boostWindow(h.world(h.b), target, { atk: 1 }, 100, 'checks:independent');
    const first = refresh(2, 4); assert.equal(stage(), 4);
    h.advance(2);
    const second = refresh(2, 10); assert.equal(stage(), 6); assert(!h.effects.has(first));
    const third = refresh(2, 6); assert.equal(stage(), 6); assert(!h.effects.has(second));
    assert.equal(JSON.parse(h.effects.get(third).data).stages.atk, 4, 'Capped refresh does not store hidden extra gains');
    h.stages.boost(world, target, 'atk', 1, true);
    const expires = h.nativeView(target, id).duration();
    h.advance(expires - 1); assert.equal(stage(), 6); assert(h.nativeView(target, id));
    h.advance(); assert.equal(stage(), 3); assert.equal(h.nativeView(target, id), null);
    assert.equal(h.stages.read(world, target).stages.atk, 2, 'Persistent baseline kept both independent writes');
    assert(!h.effects.has(third)); h.advance(2); assert.equal(stage(), 3, 'Deferred removal cannot deduct again');
  });

  test(`${domain} stage refresh matches actor, contribution name and previous native instance`, () => {
    const h = harness(), target = native ? h.actor('checks:native', 2, true) : h.target;
    const world = h.world(h.a), id = 'checks:stage_carrier', other = 'checks:independent_carrier';
    h.stages.boost(world, target, 'atk', 1, true);
    h.marker(target, other, 50, 0);
    h.stages.boostWindow(world, target, { atk: 1 }, 50, 'checks:main', h.nativeView(target, other));
    h.marker(target, id, 20, 0);
    const previous = h.nativeView(target, id);
    h.stages.boostWindow(world, target, { atk: 1 }, 20, 'checks:main', previous);
    h.stages.boostWindow(world, target, { atk: 1 }, 20, 'checks:other_contribution', previous);
    h.stages.boostWindow(h.world(h.b), target, { atk: 1 }, 20, 'checks:main', previous);
    assert.equal(h.stages.effectiveStage(world, target, 'atk'), 5);
    h.marker(target, id, 30, 0);
    const current = h.nativeView(target, id);
    h.stages.boostWindow(world, target, { atk: 1 }, 30, 'checks:main', current, previous);
    assert.equal(h.stages.effectiveStage(world, target, 'atk'), 4, 'Only the matching contribution was renewed');
    h.advance(); assert.equal(h.stages.effectiveStage(world, target, 'atk'), 4); assert(h.nativeView(target, other));
    h.clear(target, id); assert.equal(h.stages.effectiveStage(world, target, 'atk'), 2);
    h.advance(); assert.equal(h.stages.effectiveStage(world, target, 'atk'), 2);
  });

  test(`${domain} unchanged native application keys support normal cumulative refresh`, () => {
    const h = harness(), target = native ? h.actor('checks:native', 2, true) : h.target;
    const world = h.world(h.a), id = 'checks:stable_carrier';
    h.marker(target, id, 20, 0);
    const observed = h.nativeView(target, id);
    h.stages.boostWindow(world, target, { atk: 1 }, 20, 'checks:main', observed, null);
    h.stages.boostWindow(world, target, { atk: 1 }, 20, 'checks:main', observed, observed);
    assert.equal(h.stages.effectiveStage(world, target, 'atk'), 2);
    assert(h.nativeView(target, id), 'Replacing a window must preserve its same-key carrier');
    h.advance(20); assert.equal(h.stages.effectiveStage(world, target, 'atk'), 0);
    assert.equal(h.nativeView(target, id), null);
  });
}

for (const [id, effectId, parameters, config, stat, gain] of [
  ['acidarmor', 'world_combat:acidarmor_slick', { gift: 2, window: 80 }, { slick: true }, 'def', 2],
  ['amnesia', 'world_combat:amnesia_blank', { poise: 2, blank: 120 }, { deep: true }, 'spd', 2],
  ['calmmind', 'world_combat:calm_focus', { insight: 1, poise: 1, stillness: 120 }, { deep: false }, 'spa', 1],
]) {
  test(`${id} preserves native amplifier on refresh instead of hiding a weaker longer effect`, () => {
    const h = harness(), subject = h.actor('checks:recipient'), control = h.other;
    h.executeSkill(id, subject, parameters, config);
    const first = h.nativeView(subject, effectId), duration = first.duration();
    assert.equal(first.amplifier(), gain);
    h.marker(control, effectId, duration, first.amplifier()); h.advance(5);
    h.marker(control, effectId, duration, 0);
    assert.equal(h.nativeView(control, effectId).duration(), duration - 5, 'A weaker application does not refresh the active stronger clock');
    assert(control.markers.get(effectId).hidden, 'The longer weaker effect waits in the native hidden slot');

    h.executeSkill(id, subject, parameters, config);
    const refreshed = h.nativeView(subject, effectId);
    assert.equal(refreshed.amplifier(), first.amplifier());
    assert.equal(refreshed.duration(), duration, 'The real move refreshed the active clock for the full authored duration');
    assert.equal(subject.markers.get(effectId).hidden, undefined);
    assert.equal(h.stages.effectiveStage(h.world(subject), subject, stat), gain * 2);
    h.advance(duration - 1);
    assert.equal(h.stages.effectiveStage(h.world(subject), subject, stat), gain * 2);
    h.advance(); assert.equal(h.nativeView(subject, effectId), null);
    assert.equal(h.stages.effectiveStage(h.world(subject), subject, stat), 0);
  });
}

for (const native of [false, true]) {
  test(`${native ? 'native' : 'ordinary'} cotton guard at the cap never deducts an ungranted stage`, () => {
    const h = harness(), subject = h.actor('checks:cotton', 0, native), world = h.world(subject);
    h.stages.boost(world, subject, 'def', 6, true);
    h.executeSkill('cottonguard', subject, { gift: 3, coatTicks: 120 }, { cocoon: 1 });
    h.advance(130);
    assert.equal(h.stages.effectiveStage(world, subject, 'def'), 6);
    assert.equal(h.nativeView(subject, 'world_combat:cotton_slow'), null);
  });
  test(`${native ? 'native' : 'ordinary'} dragon dance tracks Attack and Speed separately and ends only its own gains`, () => {
    const h = harness(), subject = h.actor('checks:dance', 0, native), world = h.world(subject);
    h.stages.boost(world, subject, 'atk', 6, true);
    h.executeSkill('dragondance', subject, { gift: 1, span: 80, turns: 2, beat: 4, gyre: .7, lift: 0 }, { soar: false });
    assert.equal(h.stages.effectiveStage(world, subject, 'atk'), 6);
    assert.equal(h.stages.effectiveStage(world, subject, 'spe'), 1);
    h.stages.boost(world, subject, 'spe', 1, true);
    h.clear(subject, 'world_combat:dragondance_airy'); h.advance();
    assert.equal(h.stages.effectiveStage(world, subject, 'atk'), 6);
    assert.equal(h.stages.effectiveStage(world, subject, 'spe'), 1);
  });
  test(`${native ? 'native' : 'ordinary'} rejected coat or dance carriers never write persistent gains`, () => {
    const h = harness(), subject = h.actor('checks:rejected', 0, native), world = h.world(subject);
    subject.rejectMarkers = true;
    h.executeSkill('cottonguard', subject, { gift: 3, coatTicks: 120 }, { cocoon: 1 });
    h.executeSkill('dragondance', subject, { gift: 1, span: 80 }, { soar: false });
    for (const stat of ['atk', 'def', 'spe']) assert.equal(h.stages.effectiveStage(world, subject, stat), 0);
  });
  test(`${native ? 'native' : 'ordinary'} detect opening expires independently of later stage gains`, () => {
    const h = harness(), subject = h.actor('checks:opening', 0, native), world = h.world(subject);
    h.guardedSkill('detect', subject, { stat: 'spe', boost: 2, opening: 24, radius: 1.2 });
    assert.equal(h.stages.effectiveStage(world, subject, 'spe'), 2);
    h.stages.boost(world, subject, 'spe', 1, true);
    h.advance(24); assert.equal(h.stages.effectiveStage(world, subject, 'spe'), 1);
  });
  test(`${native ? 'native' : 'ordinary'} inversion edits all layers in place and expiry restores only the inverted base`, () => {
    const h = harness(), target = h.actor('checks:inverted', 2, native), world = h.world(h.a);
    h.stages.boost(world, target, 'atk', 1, true);
    const id = h.stages.boostWindow(h.world(h.b), target, { atk: 2, def: 1 }, 10, 'checks:window');
    const before = h.effects.get(id);
    assert.equal(h.stages.invertStages(world, target), 2);
    assert.equal(h.stages.effectiveStage(world, target, 'atk'), -3);
    assert.equal(h.effects.get(id).source, h.b); assert.equal(h.effects.get(id).remaining, 10);
    h.advance(10); assert.equal(h.stages.effectiveStage(world, target, 'atk'), -1);
    assert.equal(h.stages.effectiveStage(world, target, 'def'), 0);
  });
  test(`${native ? 'native' : 'ordinary'} transfer preserves a window owner across domains and native removal revokes it`, () => {
    const h = harness(), from = h.actor('checks:from', 2, native), to = h.actor('checks:to', 3, !native), world = h.world(h.a);
    h.marker(from, 'checks:boost', 20, 0);
    const id = h.stages.boostWindow(h.world(h.b), from, { atk: 2 }, 20, 'checks:owned', h.nativeView(from, 'checks:boost'));
    h.advance(3);
    assert.equal(h.stages.transferStage(world, from, to, 'atk', 1), 1);
    assert.equal(h.stages.effectiveStage(world, from, 'atk'), 1); assert.equal(h.stages.effectiveStage(world, to, 'atk'), 1);
    const moved = [...h.effects.values()].find(effect => effect.target === to && JSON.parse(effect.data).owner);
    assert.equal(moved.source, h.b); assert.equal(moved.remaining, 17); assert.equal(JSON.parse(moved.data).owner.id, id);
    h.clear(from, 'checks:boost');
    assert.equal(h.stages.effectiveStage(world, to, 'atk'), 0, 'Owner removal is observed immediately');
    h.advance(); assert.equal(h.stages.effectiveStage(world, to, 'atk'), 0);
  });
  test(`${native ? 'native' : 'ordinary'} full transfer keeps its empty parent until natural expiry and reset counts windows`, () => {
    const h = harness(), from = h.actor('checks:from', 2, native), to = h.actor('checks:to', 3, !native), world = h.world(h.a);
    h.stages.boostWindow(world, from, { atk: 2 }, 5, 'checks:owned');
    assert.equal(h.stages.transferStage(world, from, to, 'atk', 2), 2);
    assert.equal(h.stages.effectiveStage(world, from, 'atk'), 0); assert.equal(h.stages.effectiveStage(world, to, 'atk'), 2);
    h.advance(5); assert.equal(h.stages.effectiveStage(world, to, 'atk'), 0);
    h.stages.boostWindow(world, from, { def: 3 }, 10, 'checks:reset');
    assert.equal(h.stages.resetStages(world, from, true), 3);
    assert.equal(h.stages.effectiveStage(world, from, 'def'), 0);
  });
  test(`${native ? 'native' : 'ordinary'} stage-loss policy stops new negative windows while positive-window expiration stays natural`, () => {
    const h = harness(), target = h.actor('checks:protected', 2, native), world = h.world(h.a);
    h.changes.define({ id: 'checks:loss-ward', apply: change => { if (change.amount < 0 && !change.options.ignoreAbility) change.allowed = false; } });
    h.stages.boostWindow(world, target, { atk: 2 }, 5, 'checks:good');
    assert.equal(h.stages.boostWindow(world, target, { atk: -1 }, 8, 'checks:bad'), 0);
    assert.equal(h.stages.boost(world, target, 'atk', -1), 0);
    h.advance(5); assert.equal(h.stages.effectiveStage(world, target, 'atk'), 0);
  });
}

for (const native of [false, true]) {
  test(`${native ? 'native' : 'ordinary'} retiring-owner handoff adopts only the remaining window and retains provenance`, () => {
    const h = harness(), from = h.actor('checks:retiring', 2, native), to = h.actor('checks:successor', 3, !native), world = h.world(from);
    h.marker(from, 'checks:boost', 12, 0);
    h.stages.boostWindow(world, from, { atk: 2 }, 12, 'checks:gift', h.nativeView(from, 'checks:boost'));
    h.advance(3);
    assert.equal(h.stages.transferStage(world, from, to, 'atk', 2, true), 2);
    const adopted = [...h.effects.values()].find(effect => effect.target === to && JSON.parse(effect.data).origin);
    assert.equal(adopted.source, to); assert.equal(adopted.remaining, 9);
    assert.equal(JSON.parse(adopted.data).origin, from.ref());
    from.live = false; h.advance(1);
    assert.equal(h.stages.effectiveStage(h.world(to), to, 'atk'), 2);
    h.advance(8); assert.equal(h.stages.effectiveStage(h.world(to), to, 'atk'), 0);
  });
}

test('snow field windows leave a capped persistent Defence unchanged even under a stage-loss ward', () => {
  const h = harness(), rule = h.loadSnow(), subject = h.actor('checks:ice', 1, true), world = h.world(h.a);
  subject.types = ['ice'];
  h.stages.boost(world, subject, 'def', 6, true);
  h.changes.define({ id: 'checks:loss-ward', apply: change => { if (change.amount < 0) change.allowed = false; } });
  const owner = world.effect('world_combat:field', h.a, '{}', 40), field = { id: owner, remaining: 40, data: {}, position: [0, 0, 0], radius: 4 };
  rule.enter(world, subject, field); rule.stay(world, subject, field);
  assert.equal(h.stages.effectiveStage(world, subject, 'def'), 6);
  rule.leave(world, subject, field);
  assert.equal(h.stages.effectiveStage(world, subject, 'def'), 6);
  assert.equal(subject.state.stages.def, 6, 'No ungranted stage was deducted from the persistent ladder');
});

test('overlapping snow fields own independent windows and field end removes only its contribution', () => {
  const h = harness(), rule = h.loadSnow(), subject = h.actor('checks:ice', 1, true);
  subject.types = ['ice'];
  const a = h.world(h.a), b = h.world(h.b), make = (world, owner) => ({
    id: world.effect('world_combat:field', owner, '{}', 40), remaining: 40, data: {}, position: [0, 0, 0], radius: 4
  });
  const first = make(a, h.a), second = make(b, h.b);
  rule.enter(a, subject, first); rule.stay(a, subject, first); rule.enter(b, subject, second);
  assert.equal(h.stages.effectiveStage(a, subject, 'def'), 2, 'Each field adds once despite enter/stay in the same scan');
  h.stages.boost(a, subject, 'def', 1, true);
  rule.leave(a, subject, first);
  assert.equal(h.stages.effectiveStage(a, subject, 'def'), 2);
  h.end(second.id);
  assert.equal(h.stages.effectiveStage(a, subject, 'def'), 1, 'The ending field cannot hold a stage window alive');
  h.advance(); assert.equal(h.stages.effectiveStage(a, subject, 'def'), 1);
});

test('snow re-entry and changing away from Ice rebuild only the current field window', () => {
  const h = harness(), rule = h.loadSnow(), subject = h.actor('checks:ice', 1, true), world = h.world(h.a);
  subject.types = ['ice'];
  const field = { id: world.effect('world_combat:field', h.a, '{}', 12), remaining: 12, data: {}, position: [0, 0, 0], radius: 4 };
  rule.enter(world, subject, field); rule.leave(world, subject, field); rule.enter(world, subject, field);
  assert.equal(h.stages.effectiveStage(world, subject, 'def'), 1);
  subject.types = ['normal']; rule.stay(world, subject, field);
  assert.equal(h.stages.effectiveStage(world, subject, 'def'), 0);
  subject.types = ['ice']; rule.stay(world, subject, field);
  assert.equal(h.stages.effectiveStage(world, subject, 'def'), 1);
  h.advance(12); assert.equal(h.stages.effectiveStage(world, subject, 'def'), 0);
});

test('Memento grief rolls on native melee/projectile attacks and commit, but never twice on scripted damage', () => {
  const h = harness(), status = h.loadMemento(), actor = h.actor('checks:grieving'), world = h.world(actor);
  actor.random = 0.1;
  h.marker(actor, 'checks:grief', 20, 0); actor.markers.get('checks:grief').tags = 'world_combat:status/grieving';
  const policy = (phase, metadata = {}) => status.actionPolicy(world, actor, null, null, phase, metadata);
  const melee = { damageType: 'minecraft:mob_attack', sourceActor: actor.ref(), sourceLiving: true, direct: true, damageTags: [] };
  const arrow = { ...melee, direct: false, damageType: 'minecraft:arrow', damageTags: ['minecraft:is_projectile'] };
  assert.equal(status.attemptReason(policy('commit')), 'grieving');
  assert.equal(status.attemptReason(policy('damage', melee)), 'grieving');
  assert.equal(status.attemptReason(policy('damage', arrow)), 'grieving');
  assert.equal(status.attemptReason(policy('damage', { ...melee, scripted: true, kind: 'move' })), '');
  assert.equal(status.attemptReason(policy('damage', { damageType: 'minecraft:lava' })), '');
  assert.equal(status.attemptReason(policy('available')), '');
});
