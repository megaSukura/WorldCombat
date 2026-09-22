import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
}).outputText;
const reactions = compile(fs.readFileSync('content/mechanisms/effect-reactions.ts', 'utf8'));
// Parameter formulas and presentation are outside this regression; retain the production exported identities.
const identities = fs.readFileSync('content/moves/reflect/parameters.ts', 'utf8').match(/export const \w+ = "[^"\r\n]*";/g).join('\n');
const moves = compile(`namespace PokemonSkills {
  ${identities}
  export const define = Fixture.define, flag = Fixture.flag;
  export const damageFeatures = Fixture.damageFeatures, damageSegments = Fixture.damageSegments, damageSpec = Fixture.damageSpec;
}\n` + ['content/library/skills/effects.ts', 'content/moves/reflect/skill.ts', 'content/moves/sharpen/skill.ts']
  .map(file => fs.readFileSync(file, 'utf8')).join('\n'));

function harness(loadMoves = false) {
  const handlers = new Map(), definitions = new Map(), hooks = new Map(), rules = new Map(), effects = new Map();
  const actors = new Map(), hits = [], operations = [], contributions = new Map();
  const actor = (id, team) => { const value = { ref: () => id, key: () => id, team, sharpened: false }; actors.set(id, value); return value; };
  const attacker = actor('checks:attacker', 'attackers'), defender = actor('checks:defender', 'defenders');
  const ally = actor('checks:ally', 'defenders');
  const point = (x = 0, y = 0, z = 0) => ({ x: () => x, y: () => y, z: () => z,
    plus: p => point(x + p.x(), y + p.y(), z + p.z()), minus: p => point(x - p.x(), y - p.y(), z - p.z()),
    length: () => Math.hypot(x, y, z), unit: () => point(1, 0, 0) });
  const context = vm.createContext({
    WorldCombat: { point, effect: (id, _schema, _ticks, _lifetime, normalize) => definitions.set(id, normalize),
      effectHandler(id, operation, callback) { assert(!handlers.has(`${id}/${operation}`)); handlers.set(`${id}/${operation}`, callback); },
      on: (id, _topic, _after, callback) => hooks.set(id, callback) },
    Fixture: { define() {}, flag: () => ({}), damageFeatures: () => ({ damage: {} }), damageSegments: () => ['edge'], damageSpec: () => ({ base: 1 }) },
    EffectProtocols: { unchanged() {} },
    StatusContributions: { define() {}, list: (_world, target) => contributions.get(target) || [] },
    NativeEffects: { incomingRules: { define: rule => rules.set(rule.id, rule.apply) } },
    CombatStatus: { has: (_world, target, status) => status === 'sharpened' && target.sharpened },
    WorldFeedback: { emit() {}, text() {}, keep() {} },
    CobblemonCombat: { moveTemplate: id => ({ id: () => id }) },
    PokemonDamage: { apply: (world, target, move, data) => world.hurt(target, data.power, JSON.stringify({ kind: 'move', move: move.id() })) },
  });
  vm.runInContext(reactions, context, { filename: 'content/mechanisms/effect-reactions.ts' });
  if (loadMoves) vm.runInContext(moves, context, { filename: 'reaction-consumers.ts' });
  function world(source, controller) {
    return { source: () => source, controller, valid: target => actors.get(target.ref()) === target,
      actor: ref => actors.get(String(ref)) || null, observe: () => ({ position: () => point() }),
      allied: (a, b) => a.team === b.team, friendly: target => source.team === target.team,
      effects: (target, definition) => [...effects.values()].filter(effect => effect.target === target && effect.definition === definition)
        .map(effect => ({ id: () => effect.id, data: () => effect.data })),
      operation(id, operation, input) {
        operations.push({ id, operation, input });
        const effect = effects.get(id), callback = effect && handlers.get(`${effect.definition}/operation:${operation}`);
        if (!callback) return false;
        // Mirrors EffectRuntime.operate / EffectContext.world: caller is separate from the stored source/controller.
        callback({ id: () => id, input: () => input, caller: () => source, source: () => effect.source,
          target: () => effect.target, state: () => effect.data, world: () => world(effect.source, effect.controller),
          reject: reason => { throw new Error(reason); } });
        return true;
      },
      hurt(target, amount, metadata) {
        if (source === target || source.team === target.team) return false;
        hits.push({ source, target, controller, amount, data: JSON.parse(metadata) }); return true;
      }, sound() {},
    };
  }
  function effect(id, definition, source = defender, target = defender, data = {}) {
    const json = JSON.stringify(data), normalize = definitions.get(definition);
    effects.set(id, { id, definition, source, target, controller: 'checks:defender-controller', data: normalize ? normalize(json) : json });
  }
  return { api: context.EffectReactions, context, attacker, defender, ally, effects, hits, operations, contributions, rules, hooks, world, effect };
}

test('issued reactions retain the attacker caller and use the established effect source/controller', () => {
  const h = harness(); h.effect(1, 'checks:reaction');
  let received;
  h.api.register('checks:reaction', 'checks:react', (effect, facts) => {
    received = { caller: effect.caller(), world: effect.world(), facts };
  });
  const world = h.world(h.attacker, 'checks:attacker-controller'), facts = { nested: { value: 4 } };
  assert.equal(h.api.invoke(world, 1, 'checks:react', facts), true);
  assert.equal(received.caller, h.attacker); assert.equal(received.world.source(), h.defender);
  assert.equal(received.world.controller, 'checks:defender-controller'); assert.equal(received.facts.nested.value, 4);
  received.facts.nested.value = 8; assert.equal(facts.nested.value, 4, 'Receipt facts are copied plain data');
  assert.throws(() => world.operation(1, 'checks:react', '{"receipt":999}'), /reaction-not-issued/);
  assert.throws(() => world.operation(1, 'checks:react', h.operations[0].input), /reaction-not-issued/);
});

test('a receipt cannot be replayed during its own reaction callback', () => {
  const h = harness(); h.effect(1, 'checks:reaction');
  const world = h.world(h.attacker, 'checks:attacker-controller'); let calls = 0, refused = false;
  h.api.register('checks:reaction', 'checks:react', () => {
    if (++calls !== 1) return;
    try { world.operation(1, 'checks:react', h.operations[0].input); }
    catch (error) { assert.match(error.message, /reaction-not-issued/); refused = true; }
  });
  h.api.invoke(world, 1, 'checks:react', {});
  assert.equal(calls, 1); assert.equal(refused, true);
});

test('reflect counters for a protected ally from the field caster and marks reflected damage against recursion', () => {
  const h = harness(true), state = { cut: .5, rebound: .4, radius: 4, plates: 6 };
  h.effect(7, 'world_combat:reflect_mark', h.defender, h.defender, state);
  h.contributions.set(h.ally, [{ token: '7', source: h.defender, payload: state }]);
  const incoming = h.rules.get('world_combat:move_reflect/plates');
  const data = { amount: 20, category: 'physical', contact: true, type: 'normal' };
  const world = h.world(h.attacker, 'checks:attacker-controller');
  incoming({ world, source: h.attacker, target: h.ally, data });
  assert.equal(data.amount, 10); assert.equal(h.hits.length, 1);
  const hit = h.hits[0]; assert.equal(hit.source, h.defender); assert.equal(hit.target, h.attacker);
  assert.equal(hit.controller, 'checks:defender-controller'); assert.equal(hit.amount, 4);
  assert.equal(hit.data.kind, 'reflection'); assert.equal(hit.data.reflected, true);
  const reflected = { amount: 4, category: 'physical', contact: true, ...hit.data };
  incoming({ world, source: h.attacker, target: h.ally, data: reflected });
  assert.equal(h.hits.length, 1); assert.equal(reflected.amount, 4);
});

test('sharpen applied-damage callback reaches the production hurt helper with its mark owner as source', () => {
  const h = harness(true); h.defender.sharpened = true;
  h.effect(8, 'world_combat:sharpen_mark', h.defender, h.defender, { gift: 1, edge: 12, spikes: 10, spread: 1, window: 100 });
  h.hooks.get('world_combat:move_sharpen/cut')({ world: () => h.world(h.attacker, 'checks:attacker-controller'),
    actor: () => h.attacker, target: () => h.defender, data: () => JSON.stringify({ actual: 10, kind: 'move', contact: true }) });
  assert.equal(h.hits.length, 1); const hit = h.hits[0];
  assert.equal(hit.source, h.defender); assert.equal(hit.target, h.attacker);
  assert.equal(hit.controller, 'checks:defender-controller'); assert.equal(hit.data.move, 'sharpen'); assert.equal(hit.amount, 12);
});
