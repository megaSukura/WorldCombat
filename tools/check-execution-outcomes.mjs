import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Neutral host receipts drive the shipped tracker. No game, timers or guessed hit deadlines.
const hooks = new Map(), handlers = new Map(), actors = new Map(), origins = new Map();
let now = 0, nextEffect = 1, nextAction = 1;
const context = vm.createContext({
  WorldCombat: {
    on(id, topic, after, handler) { hooks.set(id, { topic, handler }); }, effect() {},
    effectHandler(id, key, handler) { handlers.set(`${id}/${key}`, handler); },
  },
  EffectProtocols: { unchanged: value => value },
  LivingActions: { host: action => action.host || action },
});
function run(file) { vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
}).outputText, context, { filename: file }); }
run('content/behavior/contributions.ts');
context.NativeEffects = { incomingRules: new context.WorldContributions.Registry() };
context.NativeLoadout = { executing: action => action.move };
context.PokemonDamage = { sourceMetadata: (_world, _actor, move) => ({ kind: 'move', category: move.category() }) };
run('content/mechanisms/damage-semantics.ts');
run('content/mechanisms/move-executions.ts');
run('content/mechanisms/execution-outcomes.ts');
const outcomes = context.ExecutionOutcomes;
function actor(name, domain = 'cobblemon') {
  const value = { alive: true, effects: new Map(), ref: () => name, key: () => name, domain: () => domain };
  actors.set(name, value); return value;
}
const self = actor('fixture:source'), other = actor('fixture:other', 'native');
function world(source = self, origin = '', writable = true) {
  if (!origins.has(origin)) origins.set(origin, new Map());
  return { source: () => source, tick: () => now, valid: value => value.alive,
    originInstance: () => origin,
    originData(key, data) {
      if (data !== undefined) { assert(writable, 'read-only origin mutation'); origins.get(origin).set(key, data); }
      return origins.get(origin).get(key) ?? null;
    },
    observe: value => value.alive ? {} : null,
    effects(value, id) { return [...value.effects.values()].filter(effect => effect.definition === id); },
    effect(definition, target, data, ticks) {
      assert(writable, 'read-only effect creation'); const id = nextEffect++;
      let state = data, remaining = ticks;
      const effect = { definition, origin, id: () => id, target: () => target, source: () => source, caller: () => source,
        world: () => world(source, origin), state(value) { if (value !== undefined) state = value; return state; },
        data: () => state, remaining(value) { if (value !== undefined) remaining = value; return remaining; },
        schedule() {},
        end() { handlers.get(`${definition}/end`)?.(effect); target.effects.delete(id); },
      };
      target.effects.set(id, effect); handlers.get(`${definition}/start`)?.(effect); return id;
    },
    operation(id, name) {
      assert(writable, 'read-only operation'); const effect = source.effects.get(id);
      if (!effect) return false; handlers.get(`${effect.definition}/operation:${name}`)?.(effect); return true;
    },
  };
}
function action(category = 'physical', source = self) {
  const id = nextAction++, origin = `execution:${id}`, data = new Map();
  return { origin, source, move: { category: () => category, id: () => 'fixture' },
    id: () => id, content: () => 'fixture:action', actor: () => source,
    world: () => world(source, origin), sense: () => world(source, origin, false),
    data(key, value) { if (value !== undefined) data.set(key, value); return data.get(key) ?? null; },
  };
}
function commit(value) {
  hooks.get('world_combat:execution/commit').handler({ action: () => value, actor: () => value.source, world: value.world });
}
function ended(value, reason = 'finished', committed = true, pendingEffects = 0) {
  const observer = [...value.source.effects.values()].filter(effect => effect.definition === 'world_combat:execution_outcome_memory' && effect.origin === value.origin).length;
  hooks.get('world_combat:execution_outcomes/end').handler({ actor: () => value.source,
    world: () => world(value.source, '', false),
    data: () => JSON.stringify({ instance: value.id(), content: value.content(), reason, committed, originInstance: value.origin,
      pendingEffects: pendingEffects === null ? undefined : pendingEffects + observer }),
  });
}
function damage(value, overrides = {}, target = other) {
  const data = { kind: 'move', category: 'physical', actual: 4, action: value.id(), originInstance: value.origin, ...overrides };
  hooks.get('world_combat:execution_outcomes/hit').handler({ actor: () => value.source, target: () => target,
    world: value.world, data: () => JSON.stringify(data) });
}
function latest() { return outcomes.latest(world(), self); }
function check(name, body) { body(); console.log('PASS execution outcomes: ' + name); }

check('long flight remains pending until its real host ends; no six-tick inference', () => {
  const cast = action(); commit(cast); now += 200;
  assert.equal(latest().status, 'pending'); ended(cast);
  assert.equal(latest().status, 'miss'); assert.equal(latest().ended, now);
});
check('status aim, declarations of support and uncommitted cancellation do not invent misses', () => {
  const prior = latest().origin, support = action('status'); commit(support); ended(support);
  assert.equal(latest().origin, prior);
  const prepared = action(); ended(prepared, 'input-stopped', false); assert.equal(latest().origin, prior);
  context.ExecutionOutcomes.intentions.define({ id: 'fixture:support', applies: value => value.action?.id() === prepared.id(),
    apply: value => { value.offensive = false; } });
  commit(prepared); ended(prepared); assert.equal(latest().origin, prior);
});
check('the next commitment captures the prior result before its own hit', () => {
  const cast = action(); commit(cast); assert.equal(outcomes.previous(cast, 110).status, 'miss');
  damage(cast); assert.equal(latest().status, 'hit'); assert.equal(outcomes.previous({ host: cast }, 110).status, 'miss');
  now += 130; assert.equal(outcomes.previous(cast, 110).status, 'miss', 'committed eligibility stays frozen');
  ended(cast); assert.equal(latest().status, 'hit');
});
check('overlapping actions, old fields and residuals cannot settle a newer execution', () => {
  const first = action(); commit(first); const second = action(); commit(second);
  damage(first); ended(first); assert.equal(latest().origin, second.origin); assert.equal(latest().status, 'pending');
  damage(second, { indirect: true }); damage(second, { kind: 'residual' }); damage(second, { calculation: { mode: 'residual' } });
  damage(second, {}, self); damage(second, { originInstance: first.origin });
  assert.equal(latest().status, 'pending'); ended(second); assert.equal(latest().status, 'miss');
  damage(first); damage(second); assert.equal(latest().status, 'miss', 'ended hosts reject later carriers');
});
check('zero/rejected damage is not a hit; technical errors remain unknown', () => {
  const cast = action(); commit(cast); damage(cast, { actual: 0 }); assert.equal(latest().status, 'pending');
  ended(cast, 'script-error'); assert.equal(latest().status, 'unknown');
});
check('native delivery is unknown until actual damage, never an inferred native air-swing', () => {
  const scope = world(self, 'native:delivery'), data = { damageType: 'minecraft:mob_attack', direct: true,
    sourceLiving: true, sourceActor: self.ref(), category: 'physical' };
  context.NativeEffects.incomingRules.apply({ world: scope, source: self, target: other, data });
  assert.equal(latest().status, 'unknown');
  damage({ source: self, id: () => 0, origin: 'native:delivery', world: () => scope }, { ...data, kind: undefined });
  assert.equal(latest().status, 'hit');
});
check('surviving or unreported carriers prevent a host-ended miss until explicit origin settlement', () => {
  const cast = action(); commit(cast); ended(cast, 'finished', true, 1);
  assert.equal(latest().status, 'unknown'); assert(outcomes.settle(cast.world())); assert.equal(latest().status, 'miss');
  const oldHost = action(); commit(oldHost); ended(oldHost, 'finished', true, null); assert.equal(latest().status, 'unknown');
  damage(oldHost); assert.equal(latest().status, 'hit', 'same-origin direct delayed hit resolves uncertainty');
  assert(outcomes.settle(oldHost.world())); assert.equal(latest().status, 'hit');
});
check('external completion stays pending even without a remaining carrier; explicit misses and hits are separate', () => {
  context.ExecutionOutcomes.intentions.define({ id: 'fixture:external', applies: value => value.action?.external,
    apply: value => { value.completion = 'external'; } });
  const cast = action(); cast.external = true; commit(cast); ended(cast); now += 150;
  assert.equal(latest().status, 'pending'); assert(outcomes.settle(cast.world())); assert.equal(latest().status, 'miss');
  const hit = action(); hit.external = true; commit(hit); ended(hit, 'finished', true, 1); damage(hit);
  assert.equal(latest().status, 'hit'); assert(outcomes.settle(hit.world())); assert.equal(latest().status, 'hit');
  const superseded = action(); superseded.external = true; commit(superseded); ended(superseded, 'finished', true, 1);
  const latestCast = action(); commit(latestCast); damage(superseded); assert(!outcomes.settle(superseded.world()));
  assert.equal(latest().status, 'pending'); ended(latestCast);
});
check('late support selection restores the actual prior outcome and cannot erase real damage', () => {
  const first = action(); commit(first); const gift = action(); commit(gift); ended(first);
  assert(outcomes.settle(gift.world(), 'support')); assert.equal(latest().origin, first.origin); assert.equal(latest().status, 'miss');
  const hit = action(); commit(hit); damage(hit); assert(!outcomes.settle(hit.world(), 'support')); ended(hit);
  const delayed = action(); delayed.external = true; commit(delayed); ended(delayed);
  assert(outcomes.settle(delayed.world(), 'support')); assert.equal(latest().origin, hit.origin);
});
check('actor carrier lifecycle releases pending records and stale endings cannot restore them', () => {
  const cast = action(); commit(cast);
  [...self.effects.values()].forEach(effect => effect.end()); assert.equal(latest(), null);
  ended(cast); assert.equal(latest(), null);
  const next = action(); commit(next); assert.equal(outcomes.previous(next), null); ended(next);
  now += 111; assert.equal(outcomes.latest(world(), self, 110), null);
});

run('content/mechanisms/formula.ts');
let stompFacts, stompParameters;
Object.assign(context, {
  F: context.Formula.F, formula: node => node, seconds: node => node, text: key => key,
  defineFacts: (_id, provider) => { stompFacts = provider; },
  actionParameters: { define(_id, parameters) { stompParameters = parameters; } },
  defineDamage() {}, stages() {}, describe() {},
});
context.NativeLoadout.hasEquipped = () => false;
run('content/moves/stompingtantrum/parameters.ts');
check('the shipped stomp formula, cue eligibility and AI reader share the frozen prior result', () => {
  const miss = action(); commit(miss); ended(miss); const stomp = action();
  const power = () => {
    const facts = stompFacts({ world: stomp.sense(), actor: self, action: stomp });
    return context.Formula.compile(stompParameters.tremor)({ read(id) {
      const custom = facts.read(id); if (custom !== undefined) return custom;
      return ({ 'stat.attack': 60, 'body.weight': 50, level: 30, 'pref.deep': false })[id];
    } });
  };
  assert.equal(context.PokemonSkills.stompWhiffed(world(), self), true); assert.equal(power(), 150);
  commit(stomp); damage(stomp);
  assert.equal(context.PokemonSkills.stompWhiffed(world(), self), false); assert.equal(power(), 150);
  ended(stomp); const next = action();
  assert.equal(context.PokemonSkills.stompWhiffed(next.sense(), self, next), false);
});

// Check the new package source and the changed content against real SDK declarations, without emitting files.
const packages = JSON.parse(fs.readFileSync('content/packs.json', 'utf8')).packages, files = new Set(), visited = new Set();
function include(id) { if (visited.has(id)) return; visited.add(id); const entry = packages[id];
  Object.keys(entry.requires || {}).forEach(include); (entry.sources || []).forEach(file => files.add(file)); }
include('world_combat:skill_runtime'); include('world_combat:companion_runtime');
['parameters.ts', 'skill.ts', 'ai.ts'].forEach(file => files.add('content/moves/stompingtantrum/' + file));
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const options = { ...ts.convertCompilerOptionsFromJson(config.config.compilerOptions, process.cwd()).options, noEmit: true };
delete options.outFile;
const program = ts.createProgram([...files, 'sdk/core/index.d.ts', 'sdk/core/world.d.ts', 'sdk/cobblemon/index.d.ts'], options);
const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.file && /(?:execution-outcomes\.ts|moves\/stompingtantrum\/)/.test(d.file.fileName.replaceAll('\\', '/')));
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => process.cwd(), getCanonicalFileName: value => value, getNewLine: () => '\n',
}));
console.log('PASS execution outcomes: package and consumer type checks');
