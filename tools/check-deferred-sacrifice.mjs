import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const file = 'content/mechanisms/deferred-sacrifice.ts';
const hooks = new Map();
let serial = 0, checks = 0, latest;
const context = vm.createContext({
  WorldCombat: { on: (id, _topic, _after, callback) => hooks.set(id, callback) },
  WorldBodies: {
    spawn(world, _at, _config, _definition, state) {
      if (world.spawnFails) throw new Error('fixture unavailable');
      let json = JSON.stringify(state);
      const id = ++serial, record = { id, ended: false, scheduled: 0 };
      record.brain = { id: () => id, world: () => world, state(value) {
        if (value !== undefined) json = value;
        return json;
      }, schedule() { record.scheduled++; }, end() { record.ended = true; D.forget(record.brain); } };
      latest = record;
      return record;
    },
    info: (_world, record) => ({ brain: record.id })
  }
});
vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None }
}).outputText, context);
const D = context.DeferredSacrifice;
function fixture(paid = 10, expires = true) {
  let tick = 100, invalid = false, callback;
  const world = { spawnFails: false, observe: () => ({ health: () => 10 }), tick: () => tick,
    payHealth(amount, cause, floor) {
      assert.equal(amount, 10); assert.equal(cause, 'checks:cost'); assert.equal(floor, 0);
      invalid = expires; return paid;
    } };
  const action = { actor: () => ({ ref: () => 'fixture-entity/7' }), world() {
    assert.equal(invalid, false, 'no expired action access'); return world;
  }, after(delay, fn) { assert.equal(invalid, false); assert.equal(delay, 1); callback = fn; } };
  let finished = false;
  return { world, action, next: value => tick = value, done: () => finished = true,
    finished: () => finished, callback: () => callback,
    arm: () => D.arm(action, {}, 'checks:body', { payload: 'fixture' }, 20, () => finished = true, 'checks:cost') };
}
function death(change = {}) {
  return { victim: 'fixture-entity/7', entity: 'fixture-entity', sourceEntity: 'fixture-entity',
    tick: 100, cause: 'checks:cost', damageType: 'world_combat_core:health_cost', deathId: 'death:fixture', ...change };
}
function check(name, run) { run(); checks++; console.log('PASS ' + name); }

check('fatal payment returns without touching its expired action and confirms once', () => {
  const f = fixture(); assert(f.arm()); f.next(101);
  assert.equal(f.finished(), false); assert.equal(D.confirm(latest.brain, death()).payload, 'fixture');
  assert.equal(D.confirm(latest.brain, death()), null); assert.equal(D.waiting(latest.brain), false);
});
for (const paid of [0, 4, 9]) check('partial/refused payment ' + paid + ' has no payload', () => {
  const f = fixture(paid, false); assert(f.arm()); f.next(101);
  assert.equal(D.confirm(latest.brain, death()), null); assert.equal(D.waiting(latest.brain), true);
  assert.equal(latest.ended, true); f.callback()(f.action); assert.equal(f.finished(), true);
});
for (const change of [{ victim: 'fixture-entity/8' }, { entity: 'other' }, { sourceEntity: 'other' },
  { cause: 'checks:other' }, { tick: 99 }, { damageType: 'minecraft:generic' }]) {
  check('unrelated death cannot activate ' + JSON.stringify(change), () => {
    const f = fixture(); assert(f.arm()); f.next(101);
    assert.equal(D.confirm(latest.brain, death(change)), null);
    f.next(107); assert.equal(D.waiting(latest.brain), true); assert.equal(latest.ended, true);
  });
}
check('totem, cancelled death, or unload with no final death expires inert', () => {
  const f = fixture(); f.arm(); f.next(101); assert(D.waiting(latest.brain));
  assert.equal(latest.ended, false); f.next(107); assert(D.waiting(latest.brain)); assert(latest.ended);
});
check('a removed or reloaded pending body cannot activate from saved payment state', () => {
  const f = fixture(); f.arm(); D.forget(latest.brain); f.next(101);
  assert.equal(D.confirm(latest.brain, death()), null); assert(D.waiting(latest.brain)); assert(latest.ended);
});
check('spawn refusal pays no health and leaves the caller in control', () => {
  const f = fixture(); f.world.spawnFails = true; assert.equal(f.arm(), false); assert.equal(f.finished(), false);
});
check('post-death hurt accepts only its own positive settled HP receipt', () => {
  const f = fixture(); f.arm(); const world = f.world;
  for (const [actual, expected] of [[0, false], [3, true]]) {
    world.hurt = (_target, _amount, json) => {
      const data = JSON.parse(json); data.actual = actual; data.settled = true;
      hooks.get('world_combat:deferred_sacrifice/settlement')({ data: () => JSON.stringify(data) });
      return true;
    };
    assert.equal(D.hurt(latest.brain, {}, 5, '{}'), expected);
  }
  world.hurt = () => true;
  assert.equal(D.hurt(latest.brain, {}, 5, '{}'), false);
});
console.log('Deferred sacrifice: ' + checks + ' neutral checks passed.');
