import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sources = ['content/behavior/composition.ts', 'content/behavior/worksite.ts'];
const program = ts.createProgram(sources.map(file => path.join(root, file)), {
  target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, lib: ['lib.es5.d.ts'], strict: true, noEmit: true,
});
assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
const code = sources.map(file => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
}).outputText).join('\n');
let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS worksite: ' + name); }
function scenario(options = {}) {
  const sandbox = vm.createContext({}); vm.runInContext(code, sandbox);
  const { WorldBehavior: B, WorldWork: W } = sandbox;
  const work = new W.Registry(), registry = new B.Registry(), events = [];
  const targets = options.targets || { first: false, second: false };
  let close = false, resources = true, tick = 0, open = false;
  work.register({ id: 'check:activity', discover: () => Object.keys(targets).filter(id => !targets[id]).map(id => ({ id, provider: 'check:activity', data: { target: id } })),
    inspect: (context, job) => targets[job.id] ? { state: 'complete' } : resources ? { state: 'ready' } : { state: 'waiting', reason: 'no-resource' },
    perform: (context, job, memory) => {
      context.services.check();
      if (options.failFirst && job.id === 'first') return B.failure('no-path');
      if (!close) { context.services.move(job.id); return B.running(); }
      if (!memory.started) {
        context.services.perform(job.id); memory.started = true;
        if (options.leakScope) memory.scope = context.services;
      }
      return B.success();
    }, pause: context => { context.services.check(); events.push(['paused', tick]); },
  });
  registry.goal({ id: 'check:goals', propose: context => [{ id: 'work', kind: 'work', data: {} }, ...(context.facts.danger ? [{ id: 'danger', kind: 'danger', data: {} }] : [])] });
  registry.method({ id: 'check:work', propose: (_, goal) => goal.kind === 'work' ? [{ id: 'cycle', data: {} }] : [],
    create: () => work.cycle('work', { report: (_, stage, reason) => events.push(['report', tick, stage, reason]), stop: context => context.services.check() }),
  });
  registry.method({ id: 'check:safety', propose: (_, goal) => goal.kind === 'danger' ? [{ id: 'avoid', data: {} }] : [], create: () => B.step(() => B.running()) });
  registry.policy({ id: 'check:order', decide: (context, choices) => ({ key: choices.find(choice => choice.goal.kind === (context.facts.danger ? 'danger' : 'work')).key, transition: 'suspend' }) });
  const agent = new B.Agent(registry);
  return { events, targets, agent, work,
    setResources: value => { resources = value; },
    run(now, danger = false) {
      tick = now; open = true; const scope = { valid: true };
      const check = () => assert(open && scope.valid, 'retained host scope');
      try { return agent.tick({ actor: 'a', tick, facts: { danger }, capabilities: [], services: { check,
        move: id => { check(); close = true; events.push(['move', tick, id]); },
        perform: id => { check(); if (!options.noChange) targets[id] = true; events.push(['perform', tick, id]); },
      } }); } finally { open = false; scope.valid = false; }
    },
  };
}
check('discovers successive goals, approaches, acts and verifies real changed facts', () => {
  const scene = scenario();
  for (let tick = 0; tick <= 24; tick += 4) scene.run(tick);
  assert.deepEqual(scene.targets, { first: true, second: true });
  assert.equal(scene.agent.memory.work.completed, 2);
  assert.deepEqual(scene.events.filter(event => event[0] === 'perform').map(event => event[2]), ['first', 'second']);
  assert(scene.events.findIndex(event => event[0] === 'move') < scene.events.findIndex(event => event[0] === 'perform'));
});
check('resources are awaited without freezing the target or spending duplicate actions', () => {
  const scene = scenario({ targets: { first: false } }); scene.setResources(false);
  scene.run(0); scene.run(4); assert(!scene.events.some(event => event[0] === 'perform'));
  scene.setResources(true); scene.run(8); scene.run(12); scene.run(16);
  assert.equal(scene.agent.memory.work.completed, 1);
  assert.equal(scene.events.filter(event => event[0] === 'perform').length, 1);
});
check('danger pauses the current task and safe resumption reuses current services', () => {
  const scene = scenario({ targets: { first: false } });
  scene.run(0); scene.run(4, true); scene.run(8, true);
  assert(!scene.events.some(event => event[0] === 'perform'));
  assert(scene.events.some(event => event[0] === 'paused'));
  scene.run(12); scene.run(16); assert.equal(scene.targets.first, true);
  assert.equal(scene.events.filter(event => event[0] === 'perform').length, 1);
});
check('completion by another worker is observed before another action is spent', () => {
  const scene = scenario({ targets: { first: false } }); scene.run(0); scene.targets.first = true; scene.run(4);
  assert.equal(scene.agent.memory.work.completed, 1);
  assert(!scene.events.some(event => event[0] === 'perform'));
});
check('an unreachable target is avoided while another available task proceeds', () => {
  const scene = scenario({ failFirst: true });
  for (let tick = 0; tick <= 20; tick += 4) scene.run(tick);
  assert.deepEqual(scene.targets, { first: false, second: true });
  assert(scene.events.some(event => event[0] === 'report' && event[3] === 'no-path'));
});
check('a reported cast without its promised change is not counted as completed or spammed', () => {
  const scene = scenario({ targets: { first: false }, noChange: true });
  for (let tick = 0; tick <= 60; tick += 4) scene.run(tick);
  assert.equal(scene.agent.memory.work.completed, 0);
  assert.equal(scene.events.filter(event => event[0] === 'perform').length, 1);
  assert(scene.events.some(event => event[0] === 'report' && event[3] === 'work-no-change'));
});
check('execution memory rejects a host handle instead of retaining it across ticks', () => {
  const scene = scenario({ leakScope: true, targets: { first: false } }); scene.run(0);
  assert.throws(() => scene.run(4), /plain, recoverable data/);
});
console.log(`PASS ${checks} shared worksite lifecycle checks and strict ES5 types`);
