import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'build/behavior-check');
fs.mkdirSync(directory, { recursive: true });
const output = path.join(directory, 'composition.js');
const program = ts.createProgram([path.join(root, 'content/behavior/composition.ts')], {
  target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, lib: ['lib.es5.d.ts'], strict: true,
  noEmitOnError: true, outFile: output,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n',
}));
assert.equal(program.emit().emitSkipped, false);
const sandbox = vm.createContext({});
vm.runInContext(fs.readFileSync(output, 'utf8'), sandbox);
const B = sandbox.WorldBehavior;
let cases = 0;
function check(name, test) { test(); cases++; console.log('PASS behavior: ' + name); }
function frame(tick, facts = {}, capabilities = [], actor = 'individual-a', services = {}) {
  return { tick, facts, capabilities, actor, services };
}
function context(tick) {
  return { ...frame(tick), senses: {}, scratch: {}, memory: {}, registry: new B.Registry(), active: null, suspended: [], choice: null };
}
function single(node, policies = []) {
  const registry = new B.Registry();
  registry.goal({ id: 'test:goals', propose: () => [{ id: 'test:goal', kind: 'test:new-purpose', data: {} }] });
  registry.method({ id: 'test:method', propose: () => [{ id: 'test:intent', data: {} }], create: () => node });
  policies.forEach(policy => registry.policy(policy));
  return new B.Agent(registry);
}

check('a new noncombat protocol composes multiple abilities and uses fresh callback services', () => {
  const registry = new B.Registry(), events = [], scopes = [];
  registry.extension('test:ingredient-protocol', { usable: capability => capability.data.moisture > 0 });
  // Register in reverse order to exercise explicit observation dependencies.
  registry.sense({ id: 'test:ingredients', after: ['test:weather'], read: ctx => ctx.senses['test:weather'].dryingAllowed ? ctx.facts.ingredients : [] });
  registry.sense({ id: 'test:weather', read: ctx => ({ dryingAllowed: !ctx.facts.rain }) });
  registry.goal({ id: 'test:work', propose: ctx => ctx.senses['test:ingredients'].map(item => ({ id: 'dry:' + item.id, kind: 'test:dry-ingredient', data: item })) });
  registry.method({
    id: 'test:dry-with-air-and-heat',
    propose: (ctx, goal) => {
      if (goal.kind !== 'test:dry-ingredient') return [];
      const air = B.capabilities(ctx, 'test:airflow'), heat = B.capabilities(ctx, 'test:heat');
      return air.flatMap(fan => heat.map(warmer => ({ id: fan.id + ':' + warmer.id,
        capabilities: [fan, warmer], data: { target: goal.data.id, route: ctx.scratch.route } })));
    },
    create: () => B.sequence([
      B.step(ctx => {
        ctx.services.navigate(ctx.choice.offer.data.target, ctx.choice.offer.data.route);
        return ctx.facts.arrived ? B.success() : B.running();
      }, { suspend: ctx => ctx.services.stopMovement(), exit: ctx => ctx.services.stopMovement() }),
      B.waitUntil(ctx => ctx.choice.offer.capabilities.every(capability => capability.data.ready)),
      B.step(ctx => {
        ctx.choice.offer.capabilities.forEach(capability => ctx.services.use(capability.id, ctx.choice.offer.data.target));
        return B.success();
      }),
    ]),
  });
  registry.policy({ id: 'test:body-route', prepare: ctx => { ctx.scratch.route = ctx.facts.canFly ? 'above' : 'ground'; } });
  const agent = new B.Agent(registry);
  function tick(now, arrived, ready, canFly = true) {
    const scope = { valid: true }; scopes.push(scope);
    const capabilities = [
      { id: 'new-pack:gust', protocols: ['test:airflow', 'test:push'], data: { ready, pressure: 3 } },
      { id: 'new-pack:warmth', protocols: ['test:heat'], data: { ready, allowAmbientHeat: true } },
    ];
    const operation = name => (...args) => { assert(scope.valid, 'expired host callback used'); events.push([name, now, ...args]); };
    const report = agent.tick(frame(now, { ingredients: [{ id: 'herb', moisture: 1 }], rain: false, arrived, canFly }, capabilities,
      'individual-a', { navigate: operation('navigate'), stopMovement: operation('stop'), use: operation('use') }));
    scope.valid = false; return report;
  }
  assert.equal(tick(0, false, false).state, 'running');
  assert.equal(tick(1, true, false, false).state, 'running');
  assert.equal(tick(2, true, false).state, 'running');
  assert.equal(tick(3, true, true).state, 'running');
  assert.equal(tick(4, true, true).state, 'succeeded');
  assert.deepEqual(events, [
    ['navigate', 0, 'herb', 'above'], ['navigate', 1, 'herb', 'ground'], ['stop', 1],
    ['use', 4, 'new-pack:gust', 'herb'], ['use', 4, 'new-pack:warmth', 'herb'],
  ]);
  assert(scopes.every(scope => !scope.valid));
  // Runtime bookkeeping retains neither Frame nor any host operation object.
  assert(!Object.values(agent).some(value => value && value.services));
});

check('urgent work suspends a multi-step task and resumes without repeating its preparation', () => {
  const registry = new B.Registry(), events = [];
  registry.goal({ id: 'test:goals', propose: ctx => [
    { id: 'work', kind: 'test:work', data: {} },
    ...(ctx.facts.danger ? [{ id: 'shelter', kind: 'test:shelter', data: {} }] : []),
  ] });
  registry.method({ id: 'test:work-method', propose: (_, goal) => goal.kind === 'test:work' ? [{ id: 'job', data: {} }] : [],
    create: () => B.sequence([
      B.step(() => { events.push('prepare'); return B.success(); }),
      B.step(ctx => { events.push('work:' + ctx.tick); return ctx.facts.done ? B.success() : B.running(); }, {
        suspend: () => events.push('work:pause'), resume: () => events.push('work:resume'), exit: (_, reason) => events.push('work:end:' + reason),
      }),
    ]),
  });
  registry.method({ id: 'test:shelter-method', propose: (_, goal) => goal.kind === 'test:shelter' ? [{ id: 'shelter', data: {} }] : [],
    create: () => B.step(() => { events.push('shelter'); return B.success(); }),
  });
  registry.policy({ id: 'test:protect', decide: (ctx, choices, decision) => {
    const urgent = choices.find(choice => choice.goal.kind === 'test:shelter');
    return urgent ? { key: urgent.key, transition: 'suspend' } : decision;
  } });
  const agent = new B.Agent(registry);
  agent.tick(frame(0)); agent.tick(frame(1));
  assert.equal(agent.tick(frame(2, { danger: true })).suspended.length, 1);
  assert.equal(agent.tick(frame(3, { done: true })).state, 'succeeded');
  assert.deepEqual(events, ['prepare', 'work:1', 'work:pause', 'shelter', 'work:resume', 'work:3', 'work:end:succeeded']);
});

check('policies change goals, routes, steps and stop conditions without species-by-skill cases', () => {
  const registry = new B.Registry(), events = [];
  registry.goal({ id: 'test:goals', propose: () => [] });
  registry.method({ id: 'test:approach', propose: (_, goal) => goal.kind === 'test:observe' ? [{ id: 'approach', data: {} }] : [],
    create: () => B.step(ctx => { events.push(ctx.actor + ':approach:' + ctx.scratch.route); return B.running(); },
      { exit: (ctx, reason) => events.push(ctx.actor + ':stop:' + reason) }),
  });
  registry.policy({ id: 'test:curiosity', applies: ctx => ctx.facts.curiosity,
    goals: (ctx, goals) => goals.concat({ id: 'observe:' + ctx.facts.interesting, kind: 'test:observe', data: {} }),
  });
  registry.policy({ id: 'test:caution', applies: ctx => ctx.facts.cautious,
    prepare: ctx => { ctx.scratch.route = ctx.facts.hasCover ? 'cover' : 'wide'; },
    wrap: (_, choice, node) => B.sequence([
      B.step(ctx => { events.push(ctx.actor + ':look'); return B.success(); }),
      B.guard(ctx => ctx.facts.safe ? null : 'unsafe', node),
    ]),
  });
  const agent = new B.Agent(registry), capabilities = [{ id: 'pack:any-skill', protocols: ['test:new-purpose'], data: {} }];
  const facts = { curiosity: true, cautious: true, safe: true, interesting: 'item', hasCover: false };
  agent.tick(frame(0, facts, capabilities));
  agent.tick(frame(1, facts, capabilities));
  agent.tick(frame(2, { ...facts, hasCover: true }, capabilities));
  assert.equal(agent.tick(frame(3, { ...facts, safe: false }, capabilities)).state, 'failed');
  assert.deepEqual(events, ['individual-a:look', 'individual-a:approach:wide', 'individual-a:approach:cover', 'individual-a:stop:failed']);
  assert.equal(new B.Agent(registry).tick(frame(0, { curiosity: false })).state, 'idle');
});

check('each skill retains its own configuration and changes affect an existing intent', () => {
  const registry = new B.Registry(), log = [];
  registry.goal({ id: 'test:goals', propose: () => [{ id: 'work', kind: 'test:work', data: {} }] });
  registry.method({ id: 'test:use', propose: ctx => B.capabilities(ctx, 'test:work').map(capability => ({ id: capability.id, data: {}, capabilities: [capability] })),
    create: () => B.guard(ctx => ctx.choice.offer.capabilities[0].data.canWork ? null : 'individual-disabled',
      B.step(ctx => { log.push(ctx.choice.offer.capabilities[0].data.ownField); return B.running(); })),
  });
  const first = new B.Agent(registry), second = new B.Agent(registry);
  const skill = (canWork, ownField) => [{ id: 'test:unique-skill', protocols: ['test:work'], data: { canWork, ownField } }];
  assert.equal(first.tick(frame(0, {}, skill(true, 'first'))).state, 'running');
  assert.equal(second.tick(frame(0, {}, skill(false, 'second'), 'individual-b')).state, 'failed');
  assert.equal(first.tick(frame(1, {}, skill(false, 'changed'))).result.reason, 'individual-disabled');
  assert.deepEqual(log, ['first']);
});

check('a vanished target cancels entered work and releases resources once', () => {
  const registry = new B.Registry(), log = [];
  registry.goal({ id: 'test:goals', propose: ctx => ctx.facts.target ? [{ id: 'target:' + ctx.facts.target, kind: 'any', data: {} }] : [] });
  registry.method({ id: 'test:method', propose: () => [{ id: 'method', data: {} }], create: () => B.step(() => B.running(), {
    enter: ctx => log.push('enter:' + ctx.choice.goal.id), exit: (ctx, reason) => log.push(reason + ':' + ctx.choice.goal.id),
  }) });
  const agent = new B.Agent(registry);
  agent.tick(frame(0, { target: 'a' }));
  assert.equal(agent.tick(frame(1)).state, 'idle');
  agent.stop('removed');
  assert.deepEqual(log, ['enter:target:a', 'unavailable:target:a']);
});

check('default selection keeps a valid intent while a content selector can replace it', () => {
  const registry = new B.Registry(), events = [];
  registry.goal({ id: 'test:goals', propose: ctx => ctx.facts.jobs.map(id => ({ id, kind: 'any', data: {} })) });
  registry.method({ id: 'test:method', propose: () => [{ id: 'use', data: {} }], create: () => B.step(ctx => { events.push(ctx.choice.goal.id); return B.running(); },
    { exit: (ctx, reason) => events.push(ctx.choice.goal.id + ':' + reason) }) });
  const agent = new B.Agent(registry, { decide: (ctx, choices, decision) => ctx.facts.replace ? { key: choices[0].key } : decision });
  agent.tick(frame(0, { jobs: ['a', 'b'] }));
  agent.tick(frame(1, { jobs: ['b', 'a'] }));
  agent.tick(frame(2, { jobs: ['b', 'a'], replace: true }));
  assert.deepEqual(events, ['a', 'a', 'a:replaced', 'b']);
  assert.throws(() => agent.stop('removed'), /fresh frame/);
  agent.stop('removed', frame(3));
});

check('suspended waits count active time and entered nodes clean up exactly once', () => {
  let exits = 0;
  const node = B.waitTicks(5), original = node.exit;
  node.exit = (ctx, reason) => { exits++; original?.(ctx, reason); };
  const runner = new B.Runner(node);
  assert.equal(runner.tick(context(0)).state, 'running');
  assert.equal(runner.tick(context(2)).state, 'running');
  runner.suspend(context(2)); runner.resume(context(100));
  assert.equal(runner.tick(context(102)).state, 'running');
  assert.equal(runner.tick(context(103)).state, 'succeeded');
  runner.end(context(104), 'late-cancel');
  assert.equal(exits, 1);
});

check('parallel reducers and fallback methods perform real lifecycle cleanup', () => {
  const events = [];
  const parallel = new B.Runner(B.parallel([
    B.step(() => B.running(), { exit: (_, reason) => events.push('ongoing:' + reason) }),
    B.step(() => B.success(), { exit: (_, reason) => events.push('winner:' + reason) }),
  ], results => results.find(result => result.state === 'succeeded') || B.running()));
  assert.equal(parallel.tick(context(0)).state, 'succeeded');
  assert.deepEqual(events, ['winner:succeeded', 'ongoing:succeeded']);
  const fallback = new B.Runner(B.fallback([
    B.step(() => B.failure('path-blocked'), { exit: (_, reason) => events.push('route:' + reason) }),
    B.step(() => B.success('other-route')),
  ]));
  assert.equal(fallback.tick(context(1)).state, 'running');
  assert.equal(fallback.tick(context(2)).data, 'other-route');
  assert(events.includes('route:failed'));
});

check('errors and explicit stop clean all entered resources even when one exit throws', () => {
  const events = [];
  const agent = single(B.parallel([
    B.step(() => B.running(), { exit: () => { events.push('a'); throw new Error('cleanup-a'); } }),
    B.step(() => B.running(), { exit: () => events.push('b') }),
  ], () => B.running()));
  agent.tick(frame(0));
  assert.throws(() => agent.stop('removed', frame(1)), /cleanup-a/);
  assert.deepEqual(events, ['a', 'b']);
  agent.stop('again');
  const broken = single(B.step(() => { throw new Error('task-error'); }, { exit: () => events.push('task-error-cleanup') }));
  assert.throws(() => broken.tick(frame(0)), /task-error/);
  assert.equal(events.at(-1), 'task-error-cleanup');
});

check('invalid selection, duplicate components and sensor cycles fail with cleanup', () => {
  let cleaned = 0;
  const agent = single(B.step(() => B.running(), { exit: () => cleaned++ }), [{ id: 'test:decision',
    decide: (ctx, choices, decision) => ctx.tick ? { key: 'unknown' } : decision }]);
  agent.tick(frame(0));
  assert.throws(() => agent.tick(frame(1)), /unavailable choice/);
  assert.equal(cleaned, 1);
  const registry = new B.Registry();
  registry.extension('test:custom', 1);
  assert.throws(() => registry.extension('test:custom', 2), /duplicate/);
  registry.sense({ id: 'a', after: ['b'], read: () => 1 });
  registry.sense({ id: 'b', after: ['a'], read: () => 2 });
  assert.throws(() => new B.Agent(registry).tick(frame(0)), /cycle/);
});

console.log(`PASS ${cases} open behavior integration checks; strict ES5 script compilation`);
