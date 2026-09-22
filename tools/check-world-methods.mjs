import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// This program deliberately has no Minecraft/Cobblemon SDK or final content globals.
const files = ['content/behavior/composition.ts', 'content/behavior/worksite.ts', 'content/behavior/world-methods.ts'];
const options = { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, strict: true, lib: ['lib.es5.d.ts'], noEmit: true };
const errors = ts.getPreEmitDiagnostics(ts.createProgram(files, options));
assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, {
  getCurrentDirectory: () => process.cwd(), getCanonicalFileName: x => x, getNewLine: () => '\n'
}));
const context = vm.createContext({});
vm.runInContext(ts.transpileModule(files.map(file => fs.readFileSync(file, 'utf8')).join('\n'), { compilerOptions: options }).outputText, context);
const B = context.WorldBehavior, M = context.WorldMethods, W = context.WorldWork;
let checks = 0;
function check(name, test) { test(); checks++; console.log('PASS shared methods: ' + name); }

function repairRobot() {
  const registry = new B.Registry(), library = new M.Library(item => item.data.tool), tasks = new M.Tasks(library);
  const robot = { ref: 'factory:maintenance-arm', point: [0, 0, 0] }; // No HP, PP, move or Pokémon data.
  const pipe = { ref: 'factory:pipe', point: [8, 0, 0], integrity: 20 };
  let now = 0, open = false, completion = -1, inspections = 0, energy = 1;
  const events = [], scopes = [];
  library.register('tool:welder', { protocols: ['factory:repair'], reach: () => 2,
    available: frame => frame.facts.energy > 0 });
  registry.goal({ id: 'factory:jobs', propose: frame => [
    ...(pipe.integrity < 100 ? [{ id: 'repair-pipe', kind: 'factory:repair', data: { ref: pipe.ref } }] : []),
    ...(frame.facts.steam ? [{ id: 'shelter', kind: 'factory:shelter', data: {} }] : [])
  ] });
  tasks.method(registry, { id: 'factory:repair-with-a-tool', protocol: 'factory:repair', purpose: 'repair',
    matches: (_frame, goal) => goal.kind === 'factory:repair', target: M.goalSubject,
    filter: frame => frame.facts.energy > 0,
    compose: (_frame, _choice, use) => B.sequence([B.step(() => { inspections++; return B.success(); }), use]) });
  registry.method({ id: 'factory:shelter', propose: (_frame, goal) => goal.kind === 'factory:shelter' ? [{ id: 'leave-steam', data: {} }] : [],
    create: () => tasks.travel(() => [-2, 0, 0], .1, 'sheltered', false) });
  const pool = new M.Pool(registry, {}, frame => {
    frame.traits = { 'factory:protect-tools': true };
    frame.policies = [{ id: 'factory:steam-safety', decide: (ctx, choices, current) => {
      const shelter = ctx.traits['factory:protect-tools'] && choices.find(choice => choice.goal.kind === 'factory:shelter');
      return shelter ? { key: shelter.key, transition: 'suspend' } : current;
    } }];
  });
  function tick(time, steam = false) {
    now = time; open = true;
    const scope = { valid: true }; scopes.push(scope);
    const live = () => assert(open && scope.valid, 'Expired host service retained by a task');
    if (completion >= 0 && now >= completion) { pipe.integrity = 100; completion = -1; }
    const host = {
      move(destination, within) { live(); if (M.distance(robot.point, destination) <= within) return 'arrived';
        robot.point = destination.slice(); events.push(['move', now]); return 'moving'; },
      stop() { live(); }, face() { live(); }, random: () => .5,
      use(capability, target) { live(); assert.equal(capability.data.tool, 'tool:welder'); assert.equal(target.ref, pipe.ref);
        completion = now + 2; energy--; events.push(['repair', now]); return true; }
    };
    const frame = { actor: robot.ref, tick: now, facts: { self: structuredClone(robot), nearby: [structuredClone(pipe)], energy, steam, busy: completion >= 0 },
      capabilities: [{ id: 'arm-tool', protocols: ['factory:repair'], data: { tool: 'tool:welder' } }], services: { behavior: host } };
    const state = pool.get(frame); const result = state.agent.tick(frame);
    open = false; scope.valid = false; return result;
  }
  return { tick, robot, pipe, events, scopes, get inspections() { return inspections; }, get energy() { return energy; } };
}
check('a non-Pokemon worker uses the production ability-method factory, approach and trait suspension', () => {
  const robot = repairRobot();
  robot.tick(0); assert.equal(robot.inspections, 1);
  assert.equal(robot.tick(1, true).suspended.length, 1);
  robot.tick(2, true);
  for (let tick = 3; tick <= 8; tick++) robot.tick(tick);
  assert.equal(robot.pipe.integrity, 100, 'The observed work result, not a cast count, completes the repair');
  assert.equal(robot.inspections, 1, 'Resuming work must not repeat its preparation');
  assert.equal(robot.energy, 0); assert.equal(robot.events.filter(event => event[0] === 'repair').length, 1);
  assert(robot.scopes.every(scope => !scope.valid));
});
check('new work providers use the same task execution and actual completion inspection', () => {
  const registry = new B.Registry(), library = new M.Library(), tasks = new M.Tasks(library), work = new W.Registry();
  const station = { ref: 'factory:calibrator', point: [5, 0, 0], calibrated: false }, body = { ref: 'factory:drone', point: [0, 0, 0] };
  let uses = 0;
  library.register('tool:calibrate', { protocols: ['factory:calibrate'], reach: () => 1,
    execute: (_frame, _capability, target) => { assert.deepEqual(Array.from(target.point), station.point); station.calibrated = true; uses++; return B.success(); } });
  work.register({ id: 'factory:calibration', discover: () => station.calibrated ? [] : [{ id: 'station', provider: 'factory:calibration', data: { point: station.point } }],
    inspect: () => ({ state: station.calibrated ? 'complete' : 'ready' }),
    perform: (frame, job, progress) => tasks.at(frame, 'calibrator', 'calibrate', job.data.point, progress) });
  registry.goal({ id: 'factory:orders', propose: () => [{ id: 'maintain', kind: 'factory:maintain', data: {} }] });
  registry.method({ id: 'factory:maintain', propose: () => [{ id: 'cycle', data: {} }], create: () => tasks.work(work, 'maintenance') });
  const agent = new B.Agent(registry);
  for (let tick = 0; tick < 6; tick++) agent.tick({ actor: body.ref, tick, facts: { self: body, nearby: [], busy: false },
    capabilities: [{ id: 'calibrator', protocols: ['factory:calibrate'], data: { use: 'tool:calibrate' } }],
    services: { behavior: { move: destination => { body.point = destination.slice(); return 'moving'; }, stop() {}, face() {}, random: () => .5, use() { throw new Error('Registered custom execution was skipped'); } } } });
  assert(station.calibrated); assert.equal(uses, 1);
  assert.equal(JSON.parse(JSON.stringify(agent.memory)).maintenance.completed, 1);
});
check('independent compositions can reuse identical actor and usage IDs without shared state', () => {
  const first = repairRobot(), second = repairRobot();
  for (let tick = 0; tick <= 6; tick++) first.tick(tick);
  assert.equal(first.pipe.integrity, 100); assert.equal(second.pipe.integrity, 20); assert.equal(second.inspections, 0);
  for (let tick = 0; tick <= 6; tick++) second.tick(tick);
  assert.equal(second.pipe.integrity, 100); assert.equal(first.energy, 0); assert.equal(second.energy, 0);
});
function motionTrace(make, start = [0, 0, 0], ticks = 20) {
  const body = { ref: 'factory:scout', point: start.slice() }, memory = {}, moves = [], registry = new B.Registry();
  const tasks = new M.Tasks(new M.Library()), runner = new B.Runner(make(tasks));
  let finished = null;
  for (let tick = 0; tick < ticks; tick++) {
    const frame = { actor: body.ref, tick, facts: { self: structuredClone(body), nearby: [], anchor: [0, 0, 0], escapeDistance: 3 },
      capabilities: [], senses: {}, scratch: {}, memory, registry, active: null, suspended: [], choice: null,
      services: { behavior: { move: (point, within) => {
        if (M.distance(body.point, point) <= within) return 'arrived';
        moves.push({ tick, point: Array.from(point), within }); body.point = Array.from(point); return 'moving';
      }, stop() {}, face() {}, use() {}, random: () => .25 } } };
    const result = runner.tick(frame);
    if (result.state === 'succeeded' && finished === null) finished = tick;
  }
  return { body, moves, finished };
}
check('wander options change the independent scout route, rest time and return threshold', () => {
  const ordinary = motionTrace(tasks => tasks.wander(() => [0, 0, 0], 'survey'), [0, 0, 0], 7);
  assert.equal(ordinary.moves.length, 0, 'The unchanged default begins with its original rest');
  const survey = motionTrace(tasks => tasks.wander(() => [0, 0, 0], 'survey', {
    minRadius: 8, maxRadius: 8, minPauseTicks: 2, maxPauseTicks: 2, returnDistance: 10, within: .2
  }), [0, 0, 0], 7);
  assert.equal(survey.moves[0].tick, 3); assert(Math.abs(Math.hypot(...survey.moves[0].point) - 8) < .001);
  const nearHome = motionTrace(tasks => tasks.wander(() => [0, 0, 0], 'survey', { returnDistance: 4, returnWithin: .5 }), [6, 0, 0], 2);
  assert.deepEqual(nearHome.moves[0], { tick: 0, point: [0, 0, 0], within: .5 });
});
check('withdrawal options and a live fact callback change retreat distance and settling time', () => {
  const danger = () => ({ ref: 'factory:steam', point: [1, 0, 0] });
  const ordinary = motionTrace(tasks => tasks.withdraw(danger, () => null, (_context, point) => point));
  const compact = motionTrace(tasks => tasks.withdraw(danger, () => null, (_context, point) => point, {
    retreatDistance: frame => frame.facts.escapeDistance, within: .2, settleTicks: 1
  }));
  assert.equal(ordinary.moves[0].point[0], -7); assert.equal(compact.moves[0].point[0], -3);
  assert.equal(compact.moves[0].within, .2); assert(compact.finished < ordinary.finished);
});
check('boolean hosts retain optional observation compatibility and explicit submission identity', () => {
  for (const observed of [false, true]) for (const explicit of [false, true]) {
    const library = new M.Library(), tasks = new M.Tasks(library), progress = {};
    const body = { ref: 'checks:actor', point: [0, 0, 0] }; let followed = 0;
    library.register('checks:use', { protocols: ['checks:work'], execute: (_context, _item, _target, state) => {
      if (explicit) state.instance = 17;
      return true;
    }, after: () => { followed++; return B.success(); } });
    const context = { actor: body.ref, tick: 1, facts: { self: body, nearby: [], busy: false }, scratch: {}, memory: {}, active: null, suspended: [],
      choice: { key: 'checks:choice' }, capabilities: [{ id: 'checks:capability', protocols: ['checks:work'], data: { use: 'checks:use', kind: 'self', range: 0 } }],
      services: observed ? { actionInstances: () => [18] } : {} };
    assert.equal(tasks.perform(context, 'checks:capability', 'work', body, progress).state, 'running');
    assert.equal(progress.instance, explicit ? 17 : undefined, 'The host return must not invent or replace an instance');
    context.facts.busy = true;
    const state = tasks.perform(context, 'checks:capability', 'work', body, progress).state;
    assert.equal(state, observed && explicit ? 'succeeded' : 'running');
    if (state === 'running') { context.facts.busy = false; assert.equal(tasks.perform(context, 'checks:capability', 'work', body, progress).state, 'succeeded'); }
    assert.equal(followed, 1);
  }
});
check('in-range placement is reachable once, rather than chasing a moving relative offset', () => {
  const library=new M.Library(),tasks=new M.Tasks(library),progress={},moves=[],body={ref:'checks:worker',point:[0,0,0]},target={ref:'checks:workpiece',point:[3,0,0]};let casts=0;
  library.register('checks:align',{protocols:['checks:work'],reach:()=>8,approach:()=>[body.point[0]+2,0,body.point[2]],execute:()=>{casts++;return 31;}});
  const frame={actor:body.ref,tick:1,facts:{self:body,nearby:[target],busy:false},scratch:{},memory:{},active:null,suspended:[],choice:{key:'checks:align'},
    capabilities:[{id:'tool',protocols:['checks:work'],data:{use:'checks:align',range:8}}],services:{behavior:{move:(point)=>{moves.push(Array.from(point));return 'moving';},stop(){},face(){},random:()=>.5}}};
  assert.equal(tasks.perform(frame,'tool','work',target,progress).state,'running');assert.deepEqual(moves,[[2,0,0]]);assert.equal(casts,0);
  body.point=[2,0,0];frame.tick++;tasks.perform(frame,'tool','work',target,progress);assert.equal(casts,1);assert.equal(moves.length,1,'Reached placement must not advance to another relative offset');
});
check('in-range placement respects station permission and a wait plan blocks casting', () => {
  for(const wait of [false,true]) {
    const library=new M.Library(),tasks=new M.Tasks(library,{mayApproach:()=>false}),body={ref:'checks:station',point:[0,0,0]},target={ref:'checks:target',point:[1,0,0]};let casts=0;
    library.register('checks:use',{protocols:['checks:work'],reach:()=>4,approach:()=>wait?'wait':[2,0,0],execute:()=>{casts++;return 1;}});
    const frame={actor:body.ref,tick:1,facts:{self:body,nearby:[target],busy:false},scratch:{},memory:{},active:null,suspended:[],choice:{key:'checks:use'},
      capabilities:[{id:'tool',protocols:['checks:work'],data:{use:'checks:use',range:4}}],services:{behavior:{stop(){},move(){throw Error('Station left');}}}};
    const result=tasks.perform(frame,'tool','work',target,{});assert.equal(result.state,wait?'running':'failed');assert.equal(casts,0);
  }
});
console.log(`PASS independent world methods: ${checks} checks, no native SDK or final content loaded`);
