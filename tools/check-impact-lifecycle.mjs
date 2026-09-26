import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Neutral action/target fixtures: a lethal settlement must not cancel independent aftermath.
const context = vm.createContext({WorldCombat:{on:()=>{}}});
for (const file of ['content/mechanisms/living-actions.ts', 'content/library/skills/effects.ts'])
  vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.None }
  }).outputText, context, { filename: file });
const A = context.LivingActions, P = context.PokemonSkills;
{
  const values = new Map();
  const action = { data(key, value) {
    if (value === undefined) return values.get(key) ?? null;
    const parsed = JSON.parse(value);
    assert(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'host action data requires an object');
    values.set(key, value);
  } };
  assert(A.first(action, 'checks:gate'));
  assert(!A.first(action, 'checks:gate'));
  assert(A.first(action, 'checks:other'));
}
const point = (x,y=0,z=0) => ({ x: () => x, y: () => y, z: () => z });
context.WorldCombat = { point };
context.CobblemonCombat = { moveTemplate: id => id };
context.NativeLoadout = { hitMetadata: (_action, extra) => extra };
context.damageSegments = () => ['primary']; context.damageFeatures = () => ({ damage: {} });

function fixture() {
  const source = { alive: true, x: 0, ref: () => 'source' };
  const target = { alive: true, x: 7, ref: () => 'original' };
  const extra = { alive: true, x: 8, ref: () => 'bystander' };
  let open = true, released = false, cached = point(1), releases = 0;
  function check() { if (!open || !source.alive) throw Error('action-inactive'); }
  const world = {
    valid: who => { check(); return !!who?.alive; },
    friendly: () => false,
    actor: ref => [source, target, extra].find(who => who.ref() === ref && who.alive) ?? null,
    observe: who => { check(); return who?.alive ? { position: () => point(who.x),
      boundsMin:()=>point(who.x-.5,0,-.5),boundsMax:()=>point(who.x+.5,2,.5) } : null; }
  };
  const action = {
    actor: () => source, target: () => target, world: () => world, sense: () => world,
    targetPosition: () => {
      check(); if (!released) { if (!target.alive) throw Error('target-left'); cached = point(target.x); } return cached;
    },
    releaseTarget: () => { check(); if (!released && target.alive) cached = point(target.x); released = true; releases++; },
    nextTick: () => { check(); if (!released && !target.alive) throw Error('target-left'); },
    end: () => { open = false; }
  };
  context.PokemonDamage = {
    apply: (_world, who) => { who.alive = false; return true; },
    hit: (_action, hit) => { hit.target().alive = false; return true; }
  };
  return { source, target, extra, action, world, releases: () => releases };
}

{
  const f = fixture();
  assert(P.impact(f.action, { target: () => f.target, projectile: () => 'flight' }, 'fixture', 1));
  assert.equal(f.action.targetPosition().x(), 7, 'fatal impact retains its last target point');
  f.action.nextTick();
  assert(P.hurt(f.action, f.extra, 'fixture', 1), 'independent second victim still settles');
  assert(!f.extra.alive);
}
{
  const f = fixture();
  assert(P.hurt(f.action, f.extra, 'fixture', 1));
  assert.equal(f.releases(), 0, 'an area victim does not release a living original target');
  f.target.x = 12; assert.equal(f.action.targetPosition().x(), 12, 'living target continues to be followed');
  context.PokemonDamage.hit = () => true;
  assert(P.impact(f.action, { target: () => f.target, projectile: () => '' }, 'fixture', 1));
  assert.equal(f.releases(), 0, 'nonlethal hit retains target dependency');
}
{
  const f = fixture();
  const mapped = A.input(f.action, { target: 'original', point: [2, 0, 0], direction: [1, 0, 0], range: 10 });
  assert(P.hurt(mapped, f.target, 'fixture', 1));
  assert.equal(mapped.targetPosition().x(), 6.5, 'mapped release retains its selected body surface without reading a dead entity');
  assert.equal(f.action.targetPosition().x(), 7, 'the underlying action retains its own last target point');
  f.action.nextTick();
}
for (const invalidation of ['source', 'action']) {
  const f = fixture();
  context.PokemonDamage.apply = () => { if (invalidation === 'source') f.source.alive = false; else f.action.end(); return true; };
  assert.throws(() => P.hurt(f.action, f.target, 'fixture', 1), /action-inactive/, `${invalidation} cancellation propagates`);
}
console.log('Impact lifecycle PASS: fatal aftermath, second victim, live tracking, mapped input, source/action cancellation');
