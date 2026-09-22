import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Neutral mechanism regression: execute production callbacks, with native events deferred as in MinecraftCombat.
const scripts = ['content/protocols/effects.ts', 'content/mechanisms/mob-effects.ts', 'content/mechanisms/status-contributions.ts']
  .map(file => ({ file, code: ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
  }).outputText }));
const carrier = 'checks:carrier', otherCarrier = 'checks:other_carrier';
const recordDefinition = 'world_combat:status_contribution', managerDefinition = 'world_combat:status_carrier';

function harness() {
  const definitions = new Map(), handlers = new Map(), hooks = new Map(), actors = new Map();
  const effects = new Map(), leases = new Map(), nativeEvents = [], endCalls = [];
  let now = 0, nextEffect = 0, nextNative = 0, nextLease = 0;
  const context = vm.createContext({ WorldCombat: {
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
  function actor(id, x = 0) {
    const value = { id, x, live: true, markers: new Map(), claims: new Map(), key: () => id, ref: () => id };
    actors.set(id, value); return value;
  }
  const a = actor('checks:source_a'), b = actor('checks:source_b', 1);
  const target = actor('checks:target', 2), other = actor('checks:other_target', 3);
  const point = x => ({ minus: value => point(x - value.x()), length: () => Math.abs(x), x: () => x });
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
      key: () => `${value.revision}:${value.expires}:${value.amplifier}`, tags: () => '', tagged: () => false };
  }
  function clear(target, id) {
    if (!target.markers.delete(id)) return false;
    nativeEvents.push({ target, id, topic: 'world_combat:mob_effect_removed' }); return true;
  }
  function marker(target, id, ticks, amplifier) {
    if (ticks === 0) { clear(target, id); return; }
    const old = target.markers.get(id);
    // Same-strength native application preserves a longer remaining clock. Every application retires its old lease.
    const expires = old && old.amplifier >= amplifier ? Math.max(old.expires, now + ticks) : now + ticks;
    target.markers.set(id, { expires, amplifier: Math.max(old?.amplifier ?? 0, amplifier), revision: ++nextNative });
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
      remaining(ticks) { if (ticks !== undefined) { duration(definition, ticks); effect.remaining = ticks; } return effect.remaining; },
      schedule(key, name, ticks, input) {
        duration(definition, ticks); effect.timers.set(key, { name, at: now + ticks, input });
      },
      end: () => end(effect), reject: reason => { throw new Error(reason); },
    });
  }
  function world(source, owner = 0) {
    return { source: () => source, tick: () => now, valid: actor => actor.live,
      actor: ref => actors.get(String(ref))?.live ? actors.get(String(ref)) : null,
      observe: actor => actor.live ? { position: () => point(actor.x) } : null,
      effects: (target, definition) => [...effects.values()].filter(effect => effect.target === target &&
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
        const effect = effects.get(id); if (!effect) return false;
        assert(source.live && live(effect), 'Operations require a live caller and effect');
        assert(Math.abs(source.x - effect.target.x) <= 64, 'Operations require a nearby target');
        invoke(effect, `operation:${operation}`, json, source); return true;
      },
      marker, mobEffect: nativeView,
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
      for (const actor of actors.values()) for (const [id, native] of actor.markers) if (native.expires <= now) clear(actor, id);
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
  return { api, a, b, target, other, world, insert, listed, flush, clear, marker, advance, effects, leases, endCalls,
    nativeView, count, end: id => end(effects.get(id)), definitions };
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
