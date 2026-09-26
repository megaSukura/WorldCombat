// Read-only content choreography checks. Native collision geometry is checked by BodySweepChecks.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

class Point {
  constructor(x, y, z) { this.values = [x, y, z]; }
  x() { return this.values[0]; } y() { return this.values[1]; } z() { return this.values[2]; }
  plus(p) { return new Point(this.x() + p.x(), this.y() + p.y(), this.z() + p.z()); }
  minus(p) { return new Point(this.x() - p.x(), this.y() - p.y(), this.z() - p.z()); }
  scale(n) { return new Point(this.x() * n, this.y() * n, this.z() * n); }
  length() { return Math.hypot(...this.values); }
  unit() { return this.length() ? this.scale(1 / this.length()) : this; }
}
const definitions = new Map();
let active;
const fixture = {
  define: skill => definitions.set(skill.id, skill),
  parameter: (_id, key) => ({ charge: 3, runSpeed: 0.6, collisionRadius: 0.42, power: 40, push: 0.2, carry: 0.8,
    minimumMove: 0.01, dash: 3, pace: 1.1, strike: 40, streak: 16 })[key],
  impact: (action, hit) => {
    assert(active.lastMove?.hit, 'impact needs an authoritative reached contact');
    assert.equal(action.origin().x(), active.lastMove.x, 'impact settles after movement');
    active.events.push({ kind: 'hit', tick: active.tick, at: action.origin() });
    return true;
  },
};
const prelude = `namespace PokemonSkills {
  export const quickattackId = "quickattack", quickattackScene = "world_combat:move_quickattack";
  export const quickattackHitText = "fixture.hit", quickattackMissText = "fixture.miss";
  export function define(value: any) { Fixture.define(value); }
  export function p(id: string, key: string, source: any) { return Fixture.parameter(id, key); }
  export function damageSpec(...args: any[]) { return {}; }
  export function impact(...args: any[]) { return Fixture.impact(...args); }
}`;
const sources = ['content/library/skills/actions.ts', 'content/moves/tackle/skill.ts', 'content/moves/quickattack/skill.ts'];
const sandbox = vm.createContext({ Fixture: fixture,
  WorldCombat: { point: (x, y, z) => new Point(x, y, z) },
  WorldFeedback: {
    emit: (_world, scene, _version, at, data, ticks) => active.events.push({ kind: 'visual', scene, at, data, ticks }),
    text: () => {},
  },
});
vm.runInContext(ts.transpileModule(prelude + sources.map(file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8')).join('\n'),
  { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText, sandbox);

function run(id, { wall = Infinity, contact = 1.5 } = {}) {
  const actor = { ref: () => 'actor' }, target = { ref: () => 'target' };
  let at = new Point(0, 0.5, 0), victim = new Point(2, 0.5, 0), ended = false;
  const tasks = [];
  active = { tick: 0, events: [], lastMove: null };
  const record = active;
  const world = {
    source: () => actor, tick: () => record.tick, valid: () => true, friendly: () => false,
    observe: who => ({ position: () => who === actor ? at : victim, width: () => 1, height: () => 1,
      velocity: () => new Point(0.2, -0.08, 0.2) }),
    freeSpace: () => true, sound: () => {},
    motion: (who, velocity) => record.events.push({ kind: 'motion', who, velocity }),
    displace: (who, delta) => {
      if (who === actor) { at = at.plus(delta); record.events.push({ kind: 'carry', tick: record.tick, delta }); }
      else victim = victim.plus(delta);
      return delta.length();
    },
    hitDisplace(who, delta) { assert.notEqual(who,actor,'a received shove targets the actual victim');return this.displace(who,delta); },
    hitImpulse(who, delta) { assert.notEqual(who,actor,'a received impulse targets the actual victim');this.motion(who,delta);return true; },
  };
  const action = {
    actor: () => actor, world: () => world, origin: () => at, targetPosition: () => victim,
    direction: () => new Point(1, 0, 0), releaseTarget: () => {}, stopMovement: () => {},
    present: (_key, _scene, _version, point, json) => record.events.push({ kind: 'present', data: JSON.parse(json), point }),
    trace: () => { throw Error('A body advance uses the native sweep receipt'); },
    after: (ticks, callback) => tasks.push({ tick: record.tick + ticks, callback }),
    moveSweep: (delta, _radius) => {
      const next = at.x() + delta.x(), endpoint = Math.min(next, contact, wall);
      at = at.plus(delta.scale(delta.x() ? Math.max(0, endpoint - at.x()) / delta.x() : 0));
      const hit = next >= contact && contact < wall;
      record.lastMove = { hit, x: at.x() };
      record.events.push({ kind: 'move', tick: record.tick, at, hit });
      return { hitEntity: () => hit, blocked: () => next >= wall, target: () => hit ? target : null,
        position: () => new Point(endpoint, 0.5, 0) };
    },
  };
  definitions.get(id).execute(action, {}, {}, () => { ended = true; });
  for (let guard = 0; tasks.length && guard < 100; guard++) {
    tasks.sort((a, b) => a.tick - b.tick);
    const task = tasks.shift(); record.tick = task.tick; task.callback(action);
  }
  assert(ended, id + ' finishes');
  assert.equal(tasks.length, 0, id + ' leaves no motion callbacks');
  return { ...record, at };
}

const quick = run('quickattack');
assert.equal(quick.events.filter(e => e.kind === 'hit').length, 1);
assert.equal(quick.events.filter(e => e.kind === 'carry').length, 0, 'Quick Attack stops at contact');
assert.equal(quick.at.x(), 1.5);
assert(quick.events.some(e => e.kind === 'motion' && e.velocity.x() === 0 && e.velocity.z() === 0), 'Quick Attack clears horizontal inertia');
for (const event of quick.events.filter(e => e.kind === 'visual' && e.data.moment === 'segment')) {
  assert(event.ticks <= 5, 'speed strokes drain promptly');
  assert(event.data.path[1][0] <= 1.5, 'speed strokes show the applied path');
}
const tackle = run('tackle'), hit = tackle.events.find(e => e.kind === 'hit');
const carry = tackle.events.filter(e => e.kind === 'carry');
assert.equal(carry.length, 4, 'Tackle follows contact with four decelerating beats');
assert(carry.every(e => e.tick > hit.tick && Math.abs(e.delta.z()) > 0), 'Tackle carries to the side after impact');
assert(carry[0].delta.length() > carry[3].delta.length(), 'Tackle settles its momentum');
assert(tackle.events.some(e => e.kind === 'present' && e.data.lifecycle?.reason === 'settled'), 'the motion emitter stops at settlement');
for (const id of ['tackle', 'quickattack']) {
  const blocked = run(id, { wall: 0.4 });
  assert.equal(blocked.events.filter(e => e.kind === 'hit').length, 0, id + ' cannot hit beyond the applied path');
  assert.equal(blocked.at.x(), 0.4);
}
const result = sandbox.PokemonSkills.sweepStep({ origin: () => new Point(0, 0, 0), moveSweep: () => ({}) }, new Point(1, 0, 0), 0.4);
assert.equal(result.moved, 0, 'blocked movement preserves the unspent distance');
assert.equal(result.remaining.length(), 1);
let partialAt = new Point(0, 0, 0);
const partial = sandbox.PokemonSkills.sweepStep({ origin: () => partialAt,
  moveSweep: () => { partialAt = new Point(0.3, 0, 0); return { position: () => new Point(9, 9, 9) }; }
}, new Point(1, 0, 0), 0.4);
assert.equal(partial.moved, 0.3, 'travel comes from the body, not the impact point');
assert.equal(partial.remaining.length(), 0.7, 'a continuing cast spends only the unused part of the step');

sandbox.WorldCombat.effect = () => {};
sandbox.WorldCombat.effectHandler = () => {};
sandbox.EffectProtocols = { unchanged: () => {} };
vm.runInContext(ts.transpileModule(fs.readFileSync(new URL('../content/mechanisms/world-feedback.ts', import.meta.url), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText, sandbox);
const scenes = sandbox.WorldFeedback.actionScenes('fixture:motion'), entries = [];
const sceneAction = {
  origin: () => new Point(1, 0, 0), sense: () => ({ tick: () => 17 }),
  present: (key, _scene, _version, at, json) => entries.push({ key, point: [at.x(), at.y(), at.z()], data: JSON.parse(json) }),
};
const payload = { moment: 'run', target: 'fixture:target', path: [[0, 0, 0], [1, 0, 0]] };
scenes.show(sceneAction, 'run', sceneAction.origin(), payload);
const latestPoint = new Point(4, 2, -3);
scenes.show(sceneAction, 'run', latestPoint, payload);
assert.equal(entries[0].key, entries[1].key, 'updates retain the current phase identity');
payload.target = 'changed-outside-the-scene';
latestPoint.values[0] = 99;
scenes.stop(sceneAction, 'run');
scenes.stop(sceneAction, 'run');
assert.equal(entries.length, 3, 'phase stop is idempotent');
assert.equal(entries[2].data.target, 'fixture:target', 'stop preserves the last payload snapshot');
assert.deepEqual(entries[2].data.path, [[0, 0, 0], [1, 0, 0]]);
assert.equal(entries[2].data.lifecycle.reason, 'settled');
assert.deepEqual(entries[2].point, [4, 2, -3], 'stop keeps a snapshot of the latest show point instead of the current actor origin');
scenes.show(sceneAction, 'run', sceneAction.origin(), { moment: 'run' });
assert.notEqual(entries[3].key, entries[0].key, 'a restarted phase gets a fresh identity');
scenes.show(sceneAction, 'wake', sceneAction.origin(), { moment: 'wake' });
let done = false;
scenes.finish(sceneAction, () => {
  assert.equal(entries.filter(entry => entry.data.lifecycle).length, 3, 'finish stops every active phase before completion');
  done = true;
});
assert(done);
scenes.stop(sceneAction);
assert.equal(entries.length, 7, 'completed phases cannot send duplicate releases');
console.log('PASS body-sweep content sequencing, stop/carry distinction and action-scene lifecycle (no game or native geometry execution)');
