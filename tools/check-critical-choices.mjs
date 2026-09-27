import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const noop = () => {};
const hooks = new Map(), definitions = new Map(), handlers = new Map(), records = new Map();
let serial = 0, currentReceipt = '', currentBudget = null, randomCalls = 0, metadataCalls = 0;
const context = vm.createContext({ WorldCombat: { on: (id, _topic, _after, callback) => hooks.set(id, callback), effect: (id, _v, _life, _scope, normalize) => definitions.set(id, normalize), effectHandler: (id, name, callback) => handlers.set(id + '/' + name, callback), event: noop, phase: noop }, MobEffects: { validAnchor: () => true, matches: (_w, actor, anchor) => actor.anchor === anchor.key },
  CobblemonCombat: { pokemon(actor) { assert(actor.pokemon, 'Ordinary bodies must never enter native Pokemon access'); return actor.pokemon; },
    loadout: noop,
    typeEffectiveness: (attack, defence) => attack === 'ghost' && defence === 'normal' ? 0 : attack === 'grass' && defence === 'water' ? 2 : 1,
  } });
const sources = ['content/protocols/effects.ts', 'content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/traits/composition.ts', 'content/traits/ability-recipes.ts',
  ...['formula', 'combatant-stats', 'combat-stages', 'native-abilities', 'native-items', 'native-semantics', 'native-modifiers', 'native-effects', 'world-environment', 'native-loadout', 'pokemon-damage', 'damage-budgets', 'native-critical-choice'].map(id => `content/mechanisms/${id}.ts`)];
vm.runInContext(ts.transpileModule(sources.map(path => fs.readFileSync(path, 'utf8')).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
}).outputText, context);
// Trait fixtures exercise critical profiles and source modifier composition.
context.NativeAbilities.define('superluck', { criticalStages: 1 });
context.NativeAbilities.define('battlearmor', { criticalImmune: true });
context.NativeAbilities.define('sniper', { criticalMultiplier: 2.25 });
context.NativeAbilities.define('toughclaws', {}, { move: (_context, data) => { if (data.contact) data.power *= 1.3; } });
context.NativeItems.define('choice_band', { attack: (_context, data) => { if (data.category === 'physical') data.attack *= 1.5; } });
context.NativeItems.define('scope_lens', { critical: (_context, data) => { data.itemStage += 1; } });
context.NativeItems.define('leek', { critical: (context, data) => { if (/farfetchd|sirfetchd/.test(context.species)) data.itemStage += 2; } });

function body(id, native = null, attack = 8, armor = 0) {
  const actor = { id, native, attack, baseAttack: attack, armor, hp: 1e8, data: new Map(),
    domain: () => new String(native ? 'cobblemon' : 'minecraft'), ref: () => id, key: () => id };
  if (native) actor.pokemon = { level: () => native.level ?? 40, stat: stat => native[stat] ?? 80,
    healthScale: () => native.scale ?? 1, projectedArmor: () => native.projectedArmor ?? 0, projectedToughness: () => native.projectedToughness ?? 0,
    species: () => native.species ?? 'cobblemon:bulbasaur', canEvolve: () => false,
    typeCount: () => (native.types ?? []).length, type: i => native.types[i], ability: () => native.ability ?? '', heldTag: () => false, heldItem: () => native.item ?? '',
    status: () => native.status ?? '', heldDescriptionId: () => native.item ? 'item.' + native.item.replace(':', '.') : '', health: () => actor.hp, maxHealth: () => 1e8 };
  return actor;
}
const source = body('source', { types: ['grass'] }), target = body('native-target', {}), ordinary = body('ordinary'), applied = [];
const world = { source: () => source, random: () => 1, effects: () => [], tick: () => 0,
  valid: () => true, observe: () => ({ health: () => 1e8, maxHealth: () => 1e8 }),
  attributeValue: (actor, id) => id === 'minecraft:generic.attack_damage' ? { base: () => actor.baseAttack, value: () => actor.attack }
    : id === 'minecraft:generic.armor' ? { base: () => actor.armor, value: () => actor.armor } : null,
  hurt: (actor, amount, metadata) => { actor.hp -= amount; applied.push({ actor, amount, data: JSON.parse(metadata) }); return true; },
};
const move = { id: () => 'leaf', type: () => 'grass', category: () => 'physical', power: () => 40, accuracy: () => 100, priority: () => 0, critRatio: () => 1 };
const resolve = (actor = target, options = {}, from = source) => context.PokemonDamage.resolve(world, from, actor, move, { critical: false, ...options });

const B = context.DamageBudgets, P = context.PokemonDamage;
world.damageReceipt = () => currentReceipt;
world.effects = (actor, definition) => {
  if (definition === 'cobblemon_world_combat:individual') return [{ id: () => -1,
    data: () => JSON.stringify({ ...context.NativeEffects.empty(), stages: actor.stages || {} }) }];
  return [...records.values()].filter(r => r.active && r.actor === actor && r.definition === definition)
    .map(r => ({ id: () => r.id, data: () => r.data, remaining: () => 100 }));
};
function end(record) {
  if (!record.active) return;
  record.active = false; handlers.get(record.definition + '/end')?.(record.effect);
}
world.effect = (definition, actor, json) => {
  const record = { id: ++serial, actor, definition, data: definitions.get(definition)(json), active: true };
  record.effect = { id: () => record.id, target: () => actor, world: () => world,
    state: () => record.data, remaining: () => 100, schedule: noop, end: () => end(record) };
  records.set(record.id, record); handlers.get(definition + '/start')?.(record.effect); return record.id;
};
world.operation = id => { const record = records.get(id); if (record) end(record); return !!record; };
P.criticalOffers.define({ id: 'fixture:finite-edge', apply: hit => {
  const value = currentBudget && B.read(world, currentBudget);
  if (value && value.available > 0) hit.offers.push({ actor: source.ref(), id: currentBudget.id });
} });
P.metadata.define({ id: 'fixture:count-source-power', apply: () => metadataCalls++ });
function open(options = {}) { currentBudget = B.open(world, source, 100, { payload: { fixture: true }, ...options }); return currentBudget; }
function generate(features = {}) { return P.resolve(world, source, target, move, features); }
function select(receipt, result) {
  const before = currentReceipt; currentReceipt = receipt;
  try {
    const data = JSON.parse(result.metadata); data.amount = result.amount; data.receiptId = receipt;
    data.sourceEntity = 'native-source';
    let json = JSON.stringify(data);
    hooks.get('world_combat:critical_choices/resolution')({ world: () => world, actor: () => source, target: () => target,
      data(value) { if (value !== undefined) json = value; return json; } });
    return JSON.parse(json);
  } finally { currentReceipt = before; }
}
function settle(receipt, actual, extra = {}) {
  let json = JSON.stringify({ receiptId: receipt, settled: true, actual, ...extra });
  hooks.get(B.settledHook)({ world: () => world, data(value) { if (value !== undefined) json = value; return json; } });
  return JSON.parse(json);
}
let count = 0;
function close(actual, expected) { assert(Math.abs(actual - expected) < 1e-8, actual + ' != ' + expected); }
function check(name, run) {
  [...records.values()].forEach(end); currentBudget = null; currentReceipt = ''; randomCalls = metadataCalls = 0;
  source.stages = {}; target.stages = {}; source.native.ability = ''; target.native.ability = ''; source.anchor = 'v1';
  world.random = () => { randomCalls++; return .8; };
  P.criticalGuards.remove('fixture:ward');
  run(); count++; console.log('PASS ' + name);
}
check('a preview never offers or reserves a finite use', () => {
  const h = open();
  P.preview(world, source, P.combatants.read(world, source), move, {});
  assert.equal(B.read(world, h).available, 1); assert.equal(randomCalls, 0);
});
check('two complete branches retain negative attack and positive defence in only the ordinary hit', () => {
  source.stages = { atk: -3 }; target.stages = { def: 4 }; const h = open();
  const result = generate(), data = JSON.parse(result.metadata);
  close(result.amount, 3.6);
  close(data.criticalChoice.forced.amount, (4 + 80 * .04) / (1 + 80 * .005) * 1.5 * 1.5);
  assert(data.criticalChoice.forced.amount > result.amount * 3);
  assert.equal(randomCalls, 1); assert.equal(metadataCalls, 1); assert.equal(B.read(world, h).available, 1);
  const incoming = select('first', result);
  close(incoming.amount, data.criticalChoice.forced.amount); assert.equal(incoming.critical, true);
  assert.equal(incoming.receiptId, 'first'); assert.equal(incoming.sourceEntity, 'native-source');
  assert.equal(B.read(world, h).available, 0); settle('first', 1); assert.equal(B.read(world, h).remaining, 0);
});
check('custom evaluators survive both shallow calculation branches', () => {
  open(); let evaluated = 0;
  const result = generate({ power: 0, damage: { base: 3, evaluate: terms => { evaluated++; return terms.beforeDefence * 2; } } });
  assert.equal(evaluated, 2); close(result.amount, 9); close(JSON.parse(result.metadata).criticalChoice.forced.amount, 13.5);
});
check('a zero ordinary custom branch still requires a real reservation for its positive critical branch', () => {
  source.stages = { atk: -3 }; const h = open();
  const result = generate({ damage: { evaluate: terms => terms.attack > 50 ? 6 : 0 } });
  assert.equal(JSON.parse(result.metadata).criticalChoice.ordinaryAmount, 0); assert(result.amount > 0);
  assert(select('first-positive', result).amount > 0);
  const sibling = select('unreserved-zero', result); assert.equal(sibling.amount, 0); assert.equal(sibling.critical, false);
  settle('unreserved-zero', 0); settle('first-positive', 1); assert.equal(B.read(world, h).remaining, 0);
});
check('an already-natural critical reserves and consumes without doubling', () => {
  const h = open(); world.random = () => { randomCalls++; return 0; };
  const result = generate(); const incoming = select('natural', result);
  close(incoming.amount, result.amount); assert.equal(incoming.critical, true); assert.equal(randomCalls, 1);
  settle('natural', 2); assert.equal(B.read(world, h).remaining, 0);
});
check('nested and precomputed sibling hits cannot borrow the outer pending use', () => {
  source.stages = { atk: -3 }; target.stages = { def: 4 }; const h = open();
  const outer = generate(), sibling = generate();
  assert(select('outer', outer).critical);
  const nested = select('nested', sibling); assert.equal(nested.critical, false); close(nested.amount, 3.6);
  settle('nested', 2); assert.equal(B.read(world, h).remaining, 1); assert.equal(B.read(world, h).available, 0);
  settle('outer', 2); assert.equal(B.read(world, h).remaining, 0);
});
for (const outcome of ['cancelled', 'absorbed', 'zero', 'refused', 'blocked', 'error']) {
  check(outcome + ' returns the reservation for another hurt in the same tick', () => {
    const h = open(); select('failed', generate()); settle('failed', 0, { outcome });
    assert.equal(B.read(world, h).available, 1); assert(select('retry', generate()).critical);
    settle('retry', 1); assert.equal(B.read(world, h).remaining, 0);
  });
}
check('critical immunity and a new live ward leave the ordinary full calculation intact', () => {
  const h = open(); target.native.ability = 'battlearmor';
  assert.equal(JSON.parse(generate().metadata).criticalChoice, undefined); assert.equal(B.read(world, h).available, 1);
  target.native.ability = ''; const result = generate();
  P.criticalGuards.define({ id: 'fixture:ward', apply: hit => hit.allowed = false });
  const incoming = select('warded', result); assert.equal(incoming.critical, false); close(incoming.amount, result.amount);
  assert.equal(B.read(world, h).available, 1);
});
check('carrier replacement invalidates a precomputed offer before native hurt', () => {
  open({ anchor: { id: 'checks:carrier', key: 'v1' } }); const result = generate(); source.anchor = 'v2';
  const incoming = select('old-carrier', result); assert.equal(incoming.critical, false); close(incoming.amount, result.amount);
});
check('native player preparation needs an active real receipt and retains an existing multiplier', () => {
  const h = open(), run = (receipt, critical, multiplier) => {
    let json = JSON.stringify({ receiptId: receipt, prepared: true, critical, multiplier, category: 'physical',
      sourceLiving: true, sourceActor: source.ref(), direct: true, damageType: 'minecraft:player_attack' });
    hooks.get('world_combat:critical_choices/native')({ world: () => world, actor: () => source, target: () => target,
      data(value) { if (value !== undefined) json = value; return json; } });
    return JSON.parse(json);
  };
  assert.equal(run('unopened', false, 1).critical, false); assert.equal(B.read(world, h).available, 1);
  currentReceipt = 'prepared'; let decision = run('prepared', true, 2.25);
  assert.equal(decision.criticalPrepared, true); assert.equal(decision.multiplier, 2.25);
  settle('prepared', 0, { outcome: 'native-critical-veto' });
  currentReceipt = 'retry'; decision = run('retry', false, 1);
  assert.equal(decision.critical, true); assert.equal(decision.multiplier, 1.5);
  settle('retry', 3); assert.equal(B.read(world, h).remaining, 0); currentReceipt = '';
});
console.log('Critical choices: ' + count + ' neutral checks passed.');
