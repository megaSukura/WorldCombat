// Isolated, read-only checks for numeric fact scopes, parameter resolution and damage inspection.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const owned = ['content/mechanisms/formula.ts', 'content/mechanisms/action-parameters.ts',
  'content/mechanisms/pokemon-damage.ts', 'content/library/skills/parameters.ts'];
const packages = JSON.parse(read('content/packs.json')).packages, included = new Set(), files = new Set();
function include(id) {
  if (included.has(id)) return;
  included.add(id);
  Object.keys(packages[id].requires || {}).forEach(include);
  (packages[id].sources || []).forEach(file => files.add(file));
}
include('world_combat:skill_runtime');
const sdk = ['sdk/core/index.d.ts', 'sdk/core/world.d.ts', 'sdk/cobblemon/index.d.ts'];
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const options = { ...ts.convertCompilerOptionsFromJson(config.config.compilerOptions, root).options, noEmit: true };
delete options.outFile;
const consumerPath = path.join(root, 'tools/formula-public-entry.check.ts');
const consumer = `
function checkPublicFormulaInputs(world: CombatWorld, action: CombatAction, effect: CombatEffect, pokemon: CombatPokemon): void {
    const node = PokemonSkills.F.actor("healthRatio");
    const registry = new ActionParameters.Registry<PokemonSkills.FactSource>();
    registry.factsOf = PokemonSkills.factsOf;
    registry.define("fixture:parameters", { amount: { value: 0, label: "Amount", formula: node } });
    [world, action, effect].forEach(source => {
        const context: PokemonSkills.FactContext = PokemonSkills.factContext(source);
        const value: number = registry.value("fixture:parameters", "amount", source);
        const explanation = Formula.explain(node, PokemonSkills.factsOf(source));
        PokemonSkills.explanationBinding(explanation, undefined, "Amount");
        PokemonSkills.damageFeatures("fixture", "power", context);
    });
    const native: PokemonSkills.NumberContext = PokemonSkills.parameterContext("fixture", pokemon);
    PokemonSkills.p("fixture", "amount", native);
    // @ts-expect-error Native catalogue contributors require an individual.
    const requiredIndividual: PokemonSkills.NumberContext = PokemonSkills.factContext(world);
}
`;
const host = ts.createCompilerHost(options), getSourceFile = host.getSourceFile;
host.getSourceFile = (file, ...args) => path.resolve(file) === consumerPath
  ? ts.createSourceFile(file, consumer, ts.ScriptTarget.ES5, true) : getSourceFile(file, ...args);
const program = ts.createProgram([...sdk, ...files].map(file => path.join(root, file)).concat(consumerPath), options, host);
const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => !d.file || path.resolve(d.file.fileName) === consumerPath || owned.includes(path.relative(root, d.file.fileName).replaceAll('\\', '/')));
if (diagnostics.length) throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => root, getCanonicalFileName: file => file, getNewLine: () => '\n',
}));
console.log('PASS domain and public-entry type checks (no emit)');

const noop = () => {};
const templates = new Map();
function move(id = 'sample_a', pp = 4, key = 'key-a', metadata = {}) {
  const values = { id, pp, key, maxPp: 8, type: 'fire', category: 'physical', power: 30, priority: 2, critRatio: 1, accuracy: 90,
    basePp: 8, raisedPpStages: 1, number: 12, effectChances: '[15,35]', flags: '{}', metadata: JSON.stringify({ name: id, metric: 6 }), ...metadata };
  return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, () => value]));
}
templates.set('sample_a', move()); templates.set('sample_b', move('sample_b', 20, 'template-b', { category: 'special' }));
let nativeReads = 0;
function nativeSnapshot(actor) {
  assert.equal(String(actor.domain()), 'cobblemon', 'Native reads require the native actor domain'); nativeReads++;
  const values = { ...actor.native }, moves = actor.moves.slice(), stats = { ...actor.stats };
  return {
    id: () => actor.key(), species: () => 'fixture:individual', level: () => 30,
    health: () => values.hp, maxHealth: () => values.maxHp, healthScale: () => values.scale,
    friendship: () => values.friendship, experience: () => 1200, baseExperience: () => 50, weight: () => 100,
    wild: () => false, canEvolve: () => true, ability: () => values.ability || '', heldItem: () => '', heldDescriptionId: () => '',
    stat: id => { assert(id in stats); return stats[id]; }, iv: () => 17, effectiveIv: () => 25, ev: () => 80, evYield: () => 2,
    statIds: () => JSON.stringify(Object.keys(stats)), baseStat: id => id === 'fixture:external' ? null : (stats[id] ?? 0) / 2,
    aspect: name => name === 'sample-aspect', shiny: () => true, scale: () => 1.2, dynamaxLevel: () => 3, gigantamaxFactor: () => false,
    typeCount: () => 1, type: () => 'fire', status: () => '', projectedArmor: () => 0, projectedToughness: () => 0,
    moveSlots: () => moves.length, move: slot => moves[slot] || null,
  };
}
const sandbox = vm.createContext({ console, WorldCombat: { on: noop, effect: noop, effectHandler: noop, event: noop, phase: noop },
  CobblemonCombat: {
    pokemon: nativeSnapshot, moveTemplate: id => { assert(templates.has(id)); return templates.get(id); },
    loadout: noop, registerAction: noop, typeEffectiveness: () => 1,
    data: (_world, actor, key) => actor.storage.get(key) ?? null,
    compareData: (_world, actor, key, expected, value) => {
      assert.equal(actor.storage.get(key) ?? null, expected);
      const data = JSON.parse(value); assert(data && typeof data === 'object' && !Array.isArray(data), 'Native storage has object roots');
      actor.storage.set(key, value); return true;
    },
  },
});
function load(paths) {
  vm.runInContext(ts.transpileModule(paths.map(read).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, alwaysStrict: true },
  }).outputText, sandbox);
}
load(['content/behavior/contributions.ts', 'content/protocols/effects.ts', 'content/traits/composition.ts', 'content/traits/ability-recipes.ts',
  'content/behavior/companion-menus.ts', 'content/preferences/skill-preferences.ts',
  ...['formula', 'action-parameters', 'status-vocabulary', 'combat-status', 'combatant-stats', 'combat-stages', 'native-abilities', 'native-items',
    'native-semantics', 'native-modifiers', 'native-effects', 'world-environment', 'native-rule-values', 'individual-attributes',
    'pokemon-damage', 'native-loadout', 'living-actions', 'native-repertoire'].map(id => `content/mechanisms/${id}.ts`)]);
sandbox.CompanionRepertoire = { catalogue: sandbox.NativeRepertoire.create({ namespace: 'world_combat' }) };
load(['content/library/skills/catalogue.ts', 'content/library/skills/parameters.ts', 'content/library/skills/effects.ts']);
const { Formula, PokemonSkills: P, PokemonDamage: D } = sandbox, F = Formula.F;
function actor(id, native = false) {
  return { key: () => id, ref: () => id, domain: () => native ? 'cobblemon' : 'minecraft', live: true,
    hp: 40, maximum: 80, attack: 8, wet: false, statuses: [], storage: new Map(), moves: [move()],
    stats: { hp: 50, atk: 90, spa: 60, def: 50, spd: 70, spe: 80 },
    native: { hp: 20, maxHp: 40, scale: 2, friendship: 100 } };
}
const source = actor('source', true), target = actor('target'), player = actor('player');
const world = {
  source: () => source, valid: actor => actor.live, random: () => 1, tick: () => 10, effects: () => [],
  observe: actor => actor.live ? { health: () => actor.hp, maxHealth: () => actor.maximum, width: () => .8, height: () => 1.6,
    movementSpeed: () => .12, wet: () => actor.wet, grounded: () => true, hurtAgo: () => 7 } : null,
  attributeValue: actor => ({ base: () => 8, value: () => actor.attack }),
  mobEffects: actor => actor.statuses.map(id => ({ tagged: tag => tag === 'world_combat:status/' + id, amplifier: () => 0 })),
};
const args = { 'native-slot': '0', 'native-move': 'key-a' };
const action = { sense: () => world, actor: () => source, target: () => target, id: () => 42, range: () => 9,
  argument: key => args[key] ?? null, data: () => null };
const skill = { id: 'sample_a', name: 'Sample', description: '', uses: [], kind: 'aim', range: 9,
  style: 'sample', fields: [], defaults: { factor: 2 }, execute: noop };
const context = { pokemon: nativeSnapshot(source), world, actor: source, skill, action, detail: { values: skill.defaults } };
let count = 0;
function check(name, run) { run(); count++; console.log(`PASS ${name}`); }
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const facts = value => P.factsOf(value);
const evaluate = (node, value = context) => Formula.compile(node)(facts(value));
const allTerms = item => [item, ...(item.terms || []).flatMap(allTerms)];

check('unary arithmetic, conditional dependency trees and single-scope reads', () => {
  const formula = F.when(F.var('threshold', 'Threshold').gt(3), F.var('input', 'Input').div(3).floor(), F.const(-2));
  let reads = 0;
  const values = { read: id => { reads++; return { threshold: 5, input: 14 }[id]; } };
  assert.equal(Formula.compile(formula)(values), 4);
  reads = 0;
  const explained = Formula.explain(formula, values);
  assert.equal(explained.value, 4); assert.equal(reads, 2);
  assert(allTerms(explained).some(term => term.label === 'Threshold'));
  const unknown = Formula.explain(F.when(F.status('sample_mark'), F.const(3), F.const(1)), facts({}));
  assert.equal(unknown.value, 1); assert.deepEqual(Array.from(unknown.unavailable), ['status.sample_mark']);
  assert.match(JSON.stringify(unknown), /worldcombat.value.unknown/);
  assert.equal(Formula.compile(F.when(F.const(1), F.const(7), F.custom(() => { throw Error('unselected'); }, 'Unused')))(values), 7);
});
check('native HP compatibility, world-unit health and cultivation facts', () => {
  assert.equal(evaluate(F.stat('hp')), 20); assert.equal(evaluate(F.stat('maxHp')), 40);
  assert.equal(evaluate(F.actor('health')), 40); assert.equal(evaluate(F.actor('maxHealth')), 80);
  assert.equal(evaluate(F.actor('healthRatio')), .5); assert.equal(evaluate(F.stat('hpRatio')), .5);
  for (const [name, expected] of Object.entries({ friendship: 100, experience: 1200, baseExperience: 50,
    'stat.attack': 90, 'iv.hp': 17, 'effectiveIv.speed': 25, 'ev.specialAttack': 80, 'evYield.defence': 2 }))
    assert.equal(evaluate(F.individual(name)), expected);
  source.native.hp = 10; source.hp = 20; source.native.friendship = 140;
  assert.equal(evaluate(F.stat('hp')), 10); assert.equal(evaluate(F.individual('friendship')), 140);
  assert.equal(evaluate(F.actor('healthRatio')), .25);
  assert.equal(facts(context).read('stat.toString'), undefined); assert.equal(facts(context).read('individual.iv.constructor'), undefined);
  assert.equal(facts({ ...context, sourceFacts: { stats: {}, data: {} } }).read('stat.attack'), undefined);
  source.native.hp = 20; source.hp = 40; source.native.friendship = 100;
});
check('ordinary actors and absent bodies keep native-only facts unavailable', () => {
  const before = nativeReads, scope = { world, actor: player };
  assert.equal(evaluate(F.actor('healthRatio'), scope), .5);
  assert.equal(evaluate(F.actor('healthRatio'), { action: { ...action, actor: () => player } }), .5);
  assert.equal(evaluate(F.stat('attack'), scope), 8);
  assert.equal(facts(scope).read('individual.friendship'), undefined);
  assert.equal(facts(scope).read('stat.defence'), undefined);
  assert.equal(facts(scope).read('level'), undefined);
  assert.equal(nativeReads, before);
  player.live = false; assert.equal(facts(scope).read('actor.health'), undefined); player.live = true;
  player.maximum = 0; assert.equal(facts(scope).read('actor.healthRatio'), undefined); player.maximum = 80;
  player.maximum = Infinity; assert.equal(facts(scope).read('actor.healthRatio'), undefined); player.maximum = 80;
});
check('status identity and stored state have distinct authorities and target scopes', () => {
  source.statuses = ['sample_mark']; target.statuses = [];
  assert.equal(evaluate(F.status('sample_mark')), 1);
  assert.equal(evaluate(F.target('status.sample_mark')), 0);
  assert.equal(evaluate(F.target('actor.healthRatio'), { ...context, target: { actor: target } }), .5);
  assert.equal(facts({ ...context, target: null }).read('target.actor.health'), undefined);
  assert.equal(facts({ pokemon: nativeSnapshot(source) }).read('status.sample_mark'), undefined);
  assert.equal(evaluate(F.state('sample_mark'), { ...context, state: () => 6 }), 6);
  source.wet = true; assert.equal(evaluate(F.state('wet')), 1); source.wet = false;
  target.live = false; assert.equal(facts(context).read('target.status.sample_mark'), undefined); target.live = true;
});
check('object state leaves observe same-scope writes and recalled inspection readers', () => {
  const node = F.state('sample_record', 'Stored count', 'nested.count');
  P.setState(world, source, 'sample_record', { nested: { count: 3 } }); assert.equal(evaluate(node), 3);
  P.setState(world, source, 'sample_record', { nested: { count: 9 } }); assert.equal(evaluate(node), 9);
  const recalled = { pokemon: nativeSnapshot(source), state: id => JSON.parse(source.storage.get('world_combat:state/' + id) || '{}') };
  assert.equal(Formula.explain(node, facts(recalled)).value, 9);
  assert.equal(facts(context).read('state.sample_record'), undefined);
});
check('caller variables and providers preserve false, zero, unavailable and expansions', () => {
  const scope = { ...context, variables: { 'individual.friendship': 0, custom: false, missing: undefined, invalid: NaN, text: '4' },
    facts: { read: id => id === 'provided' ? 12 : id === 'individual.friendship' ? 99 : undefined,
      expand: () => ({ value: 12, terms: [{ label: 'Input', value: 12, terms: [] }] }) } };
  assert.equal(facts(scope).read('individual.friendship'), 0); assert.equal(facts(scope).read('custom'), false);
  for (const id of ['missing', 'invalid', 'text', 'toString']) assert.equal(facts(scope).read(id), undefined);
  const result = Formula.explain(F.var('provided', 'Provided'), facts(scope));
  assert.equal(result.value, 12); assert.equal(result.terms[0].label, 'Input');
  assert.equal(facts({ variables: Object.create({ inherited: 8 }) }).read('inherited'), undefined);
});
check('equipped PP, resource identity, templates and recalled slots stay distinct', () => {
  assert.equal(evaluate(F.move('pp')), 4); assert.equal(evaluate(F.resource('ppRatio')), .5);
  assert.equal(evaluate(F.move('priority')), 2); assert.equal(evaluate(F.action('range')), 9);
  assert.equal(evaluate(F.move('pp'), { action }), 4);
  source.moves[0] = move('sample_a', 3);
  assert.equal(evaluate(F.move('pp')), 3);
  const borrowed = { ...context, move: templates.get('sample_b') };
  assert.equal(facts(borrowed).read('move.pp'), undefined); assert.equal(evaluate(F.resource('pp'), borrowed), 3);
  args['native-move'] = 'old'; assert.equal(facts(context).read('resource.pp'), undefined); args['native-move'] = 'key-a';
  assert.equal(facts({ ...context, action: null, detail: { slot: -1 } }).read('move.pp'), undefined);
  assert.equal(evaluate(F.move('pp'), { pokemon: nativeSnapshot(source), skill }), 3);
  source.moves.push(move('sample_a', 2, 'key-duplicate'));
  assert.equal(facts({ pokemon: nativeSnapshot(source), skill }).read('move.pp'), undefined);
  source.moves.pop(); source.moves[0] = move();
});
check('public individual attributes retain explained contributions', () => {
  sandbox.IndividualAttributes.define('fixture:capacity', { label: 'Capacity', base: 6, valid: value => value >= 0, writable: true });
  const stored = new Map(), attributes = { pokemon: nativeSnapshot(source), world: null, actor: null,
    storage: { read: id => stored.get(id) ?? null, compare: (id, _expected, value) => { stored.set(id, value); return true; } } };
  sandbox.IndividualAttributes.update(attributes, 'fixture:capacity', () => 11);
  const result = Formula.explain(F.attribute('fixture:capacity'), facts({ attributes }));
  assert.equal(result.value, 11); assert(result.terms.length);
  assert.equal(facts({}).read('attribute.fixture:capacity'), undefined);
});
check('value, scope.read, inspection, growth and runtime modifiers share one result', () => {
  P.defineFacts(skill.id, scope => ({ read: id => id === 'custom.factor' ? scope.detail.values.factor : undefined }));
  P.actionParameters.define(skill.id, { power: P.formula(F.base(10).plus(F.individual('iv.attack')).times(F.pref('factor')), 'Power'),
    provided: P.formula(F.var('custom.factor', 'Provided factor').times(4), 'Provided'),
    chained: { value: 0, label: 'Chained', evaluate: scope => scope.read(skill.id + '/power') + 1 } });
  P.stages(skill.id, [{ level: 20, values: { power: 12 } }]);
  P.defineDamage(skill.id, 'power', {});
  P.describe(skill.id, [{ key: 'description', values: ['power', 'provided'] }]);
  P.define(skill);
  P.actionParameters.rules.contribute(skill.id + '/power', 'fixture:adjustment', (scope, value) => value + scope.term('fixture:term', 'Adjustment', 5));
  const current = P.parameterContext(skill.id, action);
  // The no-facts design is zero; the level stage contributes twelve on top of the current inputs.
  assert.equal(P.p(skill.id, 'power', current), 71);
  assert.equal(P.actionParameters.evaluate(skill.id, 'power', current).value, P.p(skill.id, 'power', current));
  assert.equal(P.p(skill.id, 'chained', current), P.p(skill.id, 'power', current) + 1);
  assert.equal(Number(P.parameterBinding(current, 'power').value), P.p(skill.id, 'power', current));
  assert.equal(P.p(skill.id, 'provided', current), 8);
  assert.equal(evaluate(F.var('custom.factor'), { ...context, facts: { read: () => 7 } }), 7);
  source.stats.atk = 120; assert.equal(P.sourceSnapshot(current).stats.atk, 120);
  source.stats.atk = 90; assert.equal(P.sourceSnapshot(current).stats.atk, 90);
  P.preferences.update(skill.id, source.key(), { factor: 3 }, P.storage(world, source));
  assert.equal(P.p(skill.id, 'power', current), 98);
  assert.equal(P.p(skill.id, 'provided', current), 12);
  source.storage.delete('world_combat:preferences/sample_a');
  assert.throws(() => { const registry = new sandbox.ActionParameters.Registry(); registry.factsOf = () => ({ read: () => undefined });
    registry.define('fixture', { value: { value: 0, label: '', formula: F.const(1).div(0) } }); registry.value('fixture', 'value', {}); }, /Invalid value/);
});
check('damage metadata resolvers share source facts, defaults and source-side settlement', () => {
  const metadata = { category: 'special', type: 'water', power: 45 }, calls = [];
  const features = { critical: false, resolve: scope => { calls.push(scope); return metadata; } };
  const snapshot = D.sourceFacts(nativeSnapshot(source), world, source), template = templates.get('sample_a');
  const preview = D.preview(world, source, snapshot, template, features);
  const explained = D.explain(world, source, snapshot, template, features, { value: 30 });
  const settled = D.resolve(world, source, target, template, features);
  close(preview.amount, settled.amount); close(explained.amount, settled.amount); close(explained.explanation.value, settled.amount);
  assert.equal(explained.category, 'special'); assert.equal(explained.type, 'water');
  const data = JSON.parse(settled.metadata); assert.equal(data.power, 45); assert.equal(data.priority, 2); assert(!('resolve' in data));
  assert(calls[0].preview && calls[0].target === null); assert.equal(calls.at(-1).target, target);
  const deferred = D.explain(world, source, snapshot, template, { category: 'physical', resolve: () => ({ category: undefined, deferred: ['target.actor.health'] }) }, { value: 30 });
  assert.equal(deferred.category, 'physical'); assert(deferred.deferred.includes('target.actor.health'));
});
check('damage descriptions resolve registered metadata through the same feature object', () => {
  let selected = 'physical';
  P.defineDamage(skill.id, 'other', {}, { resolve: () => ({ category: selected }) });
  P.actionParameters.define('sample_b', { power: P.power(30) });
  const features = P.damageFeatures(skill.id, 'other'), snapshot = D.sourceFacts(nativeSnapshot(source), world, source);
  const first = D.explain(world, source, snapshot, templates.get(skill.id), features, { value: 30 });
  selected = 'special';
  const next = D.explain(world, source, snapshot, templates.get(skill.id), features, { value: 30 });
  assert.notEqual(first.amount, next.amount); assert.equal(next.category, 'special');
  const output = skill.inspect(nativeSnapshot(source), { values: skill.defaults, ppCost: 1 }, { full: true, world, actor: source, state: () => ({}), attributes: context.attributes });
  assert.equal(Number(output.description.bindings.provided.value), P.p(skill.id, 'provided', context));
  close(Number(output.description.bindings.power.value), Math.round(D.explain(world, source, snapshot, templates.get(skill.id), P.damageFeatures(skill.id),
    { value: P.p(skill.id, 'power', context) }).amount * 1000) / 1000);
});
check('registered metadata receives the execution and recalled inspection formula scopes', () => {
  const amount = Formula.compile(F.pref('factor').plus(F.state('sample_record', 'Stored count', 'nested.count')));
  P.defineDamage(skill.id, 'scoped', { base: 1 }, { resolve: scope => ({ damage: { base: amount(scope.facts) } }) });
  const snapshot = D.sourceFacts(nativeSnapshot(source), world, source), template = templates.get(skill.id);
  const live = D.resolve(world, source, target, template, P.damageFeatures(skill.id, 'scoped'));
  const liveScope = P.parameterContext(skill.id, action);
  close(D.preview(world, source, snapshot, template, P.damageFeatures(skill.id, 'scoped', liveScope)).amount, live.amount);
  const inspection = { pokemon: nativeSnapshot(source), skill, detail: { values: skill.defaults },
    state: id => JSON.parse(source.storage.get('world_combat:state/' + id) || '{}') };
  const preview = D.explain(null, null, D.sourceFacts(inspection.pokemon), template, P.damageFeatures(skill.id, 'scoped', inspection), { value: 30 });
  close(live.amount, 16.5); close(preview.amount, live.amount); close(preview.explanation.value, live.amount);
});
check('custom damage evaluation and zero source force have truthful previews', () => {
  const template = templates.get('sample_a'), snapshot = D.sourceFacts(nativeSnapshot(source), world, source);
  const features = { damage: { base: 2, evaluate: terms => terms.amount * 3 }, critical: false };
  const explained = D.explain(world, source, snapshot, template, features, { value: 0 });
  close(explained.amount, 9); close(explained.explanation.value, 9);
  close(D.resolve(world, source, target, template, features).amount, 9);
  const zero = { ...snapshot, stats: { atk: 0, spa: 0 } };
  const result = D.explain(null, null, zero, template, {}, { value: 30 });
  assert.equal(result.amount, 0); assert.equal(result.explanation.value, 0);
  sandbox.NativeAbilities.define('fixture_flat', {}, { damage: (_context, data) => { assert(data.calculation); data.amount += 2; } });
  source.native.ability = 'fixture_flat';
  const flat = D.explain(world, source, D.sourceFacts(nativeSnapshot(source), world, source), template, { damage: { base: 0 } }, { value: 0 });
  assert.equal(flat.amount, 2); assert.equal(flat.explanation.value, 2); source.native.ability = '';
});
check('ordered metadata contributions cover ordinary sources and explicit damage specs', () => {
  const before = nativeReads, scopes = [], template = templates.get(skill.id), features = { damage: { base: 2 }, critical: false };
  D.metadata.define({ id: 'fixture:metadata', apply: scope => { scopes.push(scope); scope.metadata.power *= 2; scope.metadata.category = 'special'; } });
  const snapshot = D.combatants.read(world, player);
  const preview = D.explain(world, player, snapshot, template, features, { value: 30 });
  const settled = D.resolve(world, player, target, template, features);
  close(preview.amount, 4); close(preview.explanation.value, 4); close(settled.amount, 4);
  assert.equal(scopes[0].preview, true); assert.equal(scopes[0].target, null); assert.equal(scopes[1].target, target);
  assert.equal(nativeReads, before); assert(D.metadata.remove('fixture:metadata'));
});
check('native metadata and stat discovery remain numeric facts with explicit absence', () => {
  source.stats['fixture:external'] = 33;
  assert.equal(evaluate(F.individual('stat.fixture:external')), 33);
  assert.equal(evaluate(F.individual('iv.fixture:external')), 17);
  assert.equal(facts(context).read('individual.baseStat.fixture:external'), undefined);
  assert.equal(evaluate(F.individual('baseStat.attack')), 45);
  assert.equal(facts(context).read('individual.stat.fixture:absent'), undefined);
  assert.equal(evaluate(F.individual('aspect.sample-aspect')), 1);
  assert.equal(facts(context).read('individual.aspect.absent'), false);
  for (const [key, value] of Object.entries({ shiny: true, scale: 1.2, dynamaxLevel: 3, gigantamaxFactor: false }))
    assert.equal(facts(context).read('individual.' + key), value);
  for (const [key, value] of Object.entries({ basePp: 8, raisedPpStages: 1, number: 12, 'effectChances.1': 35, 'metadata.metric': 6 }))
    assert.equal(evaluate(F.move(key)), value);
  assert.equal(facts(context).read('move.metadata.name'), undefined);
  assert.equal(facts(context).read('move.effectChances.9'), undefined);
  assert.equal(facts(context).read('move.flags.absent'), false);
  assert.equal(facts({ move: move('sample_a', 4, 'key', { metadata: '{}', flags: '{}' }) }).read('move.flags.absent'), undefined);
  delete source.stats['fixture:external'];
});
check('native, contributed, policy, authored and dynamic flags have consistent precedence', () => {
  const template = move('sample_flags', 8, 'template:sample_flags', { flags: '{"contact":1,"sound":0,"slicing":1}' });
  templates.set('sample_flags', template);
  sandbox.NativeLoadout.map('sample_flags', 'fixture:flags', () => 1);
  sandbox.NativeLoadout.metadata.define({ id: 'fixture:flags', apply: info => {
    if (info.move.id() === 'sample_flags') { info.flags.contact = false; info.flags.pulse = true; }
  } });
  sandbox.NativeLoadout.configure('sample_flags', { flags: { contact: true, sound: true, pulse: false } });
  const supplied = Object.freeze({ contact: false, sound: false }), dynamic = Object.freeze({ slicing: false });
  const ordinaryAction = { ...action, actor: () => player };
  const features = { actionContext: ordinaryAction, action: 999, contact: true, flags: supplied, critical: false,
    resolve: scope => { assert.equal(scope.moveFacts.flags.contact, true); return { contact: true, flags: dynamic }; } };
  const calls = [];
  D.metadata.define({ id: 'fixture:inspect-flags', applies: scope => scope.move.id() === 'sample_flags', apply: scope => {
    const data = scope.metadata;
    assert.equal(data.action, 42); assert.equal(data.move, 'sample_flags'); assert.equal(scope.action, ordinaryAction);
    assert.equal(data.flags.contact, true); assert.equal(data.contact, true);
    assert.equal(data.sound, false); assert.equal(data.slice, false); assert.equal(data.pulse, false);
    data.flags.contact = false; assert.equal(data.contact, false);
    data.contact = true; assert.equal(data.flags.contact, true);
    calls.push(scope.preview);
  } });
  const snapshot = D.combatants.read(world, player);
  const preview = D.preview(world, player, snapshot, template, features);
  const settled = D.resolve(world, player, target, template, features);
  close(preview.amount, settled.amount);
  const payload = JSON.parse(settled.metadata);
  assert.equal(payload.flags.contact, payload.contact); assert.equal(payload.flags.sound, false);
  assert.equal(payload.action, 42); assert(!('resolve' in payload)); assert(!('actionContext' in payload));
  assert.deepEqual(calls, [true, false]); assert.equal(supplied.contact, false); assert.equal(dynamic.slicing, false);
  assert.equal(facts({ move: template }).read('move.flags.pulse'), false);
  D.metadata.remove('fixture:inspect-flags'); sandbox.NativeLoadout.metadata.remove('fixture:flags');
});
check('invocation owns the paying slot while move facts follow the executed definition', () => {
  source.moves.push(move('sample_a', 6, 'key-payer'));
  const invocation = { source: 'sample_a', slot: 1, key: 'key-payer', design: 'sample_b', selection: 'layer', executing: 'sample_b',
    chain: ['sample_b'], policyMove: 'sample_a' };
  const invoked = { ...action, world: () => world, data: key => key === 'cobblemon_world_combat:invocation' ? JSON.stringify(invocation) : null };
  const scope = { ...context, action: invoked };
  assert.equal(evaluate(F.move('power'), scope), templates.get('sample_b').power());
  assert.equal(facts(scope).read('move.pp'), undefined); assert.equal(evaluate(F.resource('pp'), scope), 6);
  source.moves[1] = move('sample_a', 5, 'key-payer'); assert.equal(evaluate(F.resource('pp'), scope), 5);
  const savedHurt = world.hurt; let payload;
  world.hurt = (_actor, _amount, data) => { payload = JSON.parse(data); return true; };
  const features = { ...P.damageFeatures(skill.id, 'power', scope), critical: false };
  D.apply(world, target, templates.get('sample_b'), features);
  assert.equal(payload.eligibilityMove, 'sample_a'); assert.equal(payload.action, 42); assert.equal(payload.move, 'sample_b');
  world.hurt = savedHurt;
  invocation.executing = 'sample_a'; assert.equal(evaluate(F.move('pp'), scope), 5);
  source.moves[1] = move('sample_b', 5, 'key-payer'); assert.equal(facts(scope).read('resource.pp'), undefined);
  source.moves[1] = move('sample_a', 5, 'key-replaced'); assert.equal(facts(scope).read('resource.pp'), undefined);
  source.moves.pop();
  assert.equal(facts({ ...context, resource: move('sample_a', 8, 'template:sample_a') }).read('resource.pp'), undefined);
});
check('effective selection identifies a unique paying resource without an invocation', () => {
  const savedEffects = world.effects;
  world.effects = (actor, id) => actor === source && id === 'cobblemon_world_combat:modifier'
    ? [{ id: () => 1, data: () => '{"moves":{"0":"sample_b"}}' }] : [];
  const scope = { pokemon: nativeSnapshot(source), world, actor: source, skill: { ...skill, id: 'sample_b' } };
  assert.equal(evaluate(F.resource('pp'), scope), 4); assert.equal(facts(scope).read('move.pp'), undefined);
  assert.equal(facts({ ...context, action: null, detail: { slot: 0 } }).read('move.pp'), undefined);
  assert.equal(evaluate(F.move('power'), { action }), templates.get('sample_b').power());
  world.effects = savedEffects;
});
check('inspection carries data-driven sources, unavailable damage and known zero separately', () => {
  const sample = { ...skill, id: 'sample_output' }; templates.set(sample.id, move(sample.id));
  P.actionParameters.define(sample.id, {
    legacy: { value: 20, label: 'Legacy', evaluate: scope => {
      scope.fact('fixture:origin', 'Origin', 'fixture'); return scope.fact('fixture:measured', 'Measured', 30);
    } },
    pending: P.formula(F.target('actor.health'), 'Pending'), zero: P.formula(F.const(0), 'Zero'),
  });
  P.defineDamage(sample.id, 'legacy', {}); P.defineDamage(sample.id, 'pending', {}); P.defineDamage(sample.id, 'zero', { base: 0 });
  P.describe(sample.id, [{ key: 'description', values: ['legacy', 'pending', 'zero'] }]); P.define(sample);
  const scope = { pokemon: nativeSnapshot(source), skill: sample, world, actor: source, detail: { values: sample.defaults } };
  const bindings = P.describeSkill(scope).bindings;
  assert.match(JSON.stringify(bindings.legacy), /Measured/); assert.match(JSON.stringify(bindings.legacy), /Origin/);
  assert.match(JSON.stringify(bindings.legacy), /fixture/);
  assert.equal(bindings.pending.available, false); assert.equal(bindings.pending.value, '0');
  assert(bindings.pending.unavailable.includes('target.actor.health'));
  assert.equal(bindings.zero.available, true); assert.equal(bindings.zero.value, '0');
  // A known zero power is a zero result, not an error; only a negative power stays invalid.
  const zeroPower = D.preview(world, source, D.sourceFacts(scope.pokemon, world, source), templates.get(sample.id), { power: 0 });
  assert.equal(zeroPower.amount, 0); assert.equal(zeroPower.calculated.amount, 0);
  assert.throws(() => D.preview(world, source, D.sourceFacts(scope.pokemon, world, source), templates.get(sample.id), { power: -1 }), /positive/);
});
check('nested unavailable facts and scaled result bindings retain their explanations', () => {
  const explanation = Formula.explain(F.var('derived', 'Derived').times(2), {
    read: () => 7, expand: () => ({ value: 7, terms: [], unavailable: ['world.sample'] }),
  });
  assert(explanation.unavailable.includes('world.sample'));
  const binding = P.resultBinding({ value: 14, sources: [], unknown: [], explanation }, 'Scaled', .5);
  assert.equal(binding.value, '7'); assert(binding.formula.includes('×')); assert(binding.unavailable.includes('world.sample'));
});
check('recalled and live source hooks share settlement and nonnegative outgoing normalization', () => {
  sandbox.NativeAbilities.define('fixture_source', {}, { move: (_scope, data) => { data.power *= 1.2; }, attack: (_scope, data) => { data.attack *= 2; } });
  source.native.ability = 'fixture_source'; const pokemon = nativeSnapshot(source), template = templates.get(skill.id);
  const live = D.preview(world, source, D.sourceFacts(pokemon, world, source), template, { critical: false });
  const recalled = D.preview(null, null, D.sourceFacts(pokemon), template, { critical: false });
  close(live.amount, 15.12); close(recalled.amount, live.amount);
  sandbox.NativeAbilities.define('fixture_floor', {}, { damage: (_scope, data) => { data.amount -= 10; } });
  source.native.ability = 'fixture_floor'; const changed = nativeSnapshot(source), features = { critical: false, damage: { base: 1 } };
  assert.equal(D.preview(null, null, D.sourceFacts(changed), template, features).amount, 0);
  assert.equal(D.explain(world, source, D.sourceFacts(changed, world, source), template, features, { value: 30 }).explanation.value, 0);
  assert.equal(D.resolve(world, source, target, template, features).amount, 0); source.native.ability = '';
});
check('per-resolution damage and flag writes do not mutate reusable authored input', () => {
  const spec = Object.freeze({ base: 2 }), flags = Object.freeze({ contact: true });
  const features = Object.freeze({ damage: spec, flags, critical: false });
  D.metadata.define({ id: 'fixture:local-data', apply: scope => { scope.metadata.damage.base += 2; scope.metadata.flags.contact = false; } });
  const template = templates.get(skill.id), snapshot = D.combatants.read(world, player);
  close(D.preview(world, player, snapshot, template, features).amount, 4);
  close(D.resolve(world, player, target, template, features).amount, 4);
  assert.equal(spec.base, 2); assert.equal(flags.contact, true); D.metadata.remove('fixture:local-data');
});
check('skill hit wrappers preserve per-flag overrides across authored feature layers', () => {
  const sample = { ...skill, id: 'sample_layers' }; templates.set(sample.id, move(sample.id));
  P.actionParameters.define(sample.id, { power: P.power(20) });
  P.defineDamage(sample.id, 'power', {}, { flags: { contact: true, sound: true } }); P.define(sample);
  let payload; const savedHurt = world.hurt, savedFriendly = world.friendly;
  world.friendly = () => false;
  world.hurt = (_actor, _amount, data) => { payload = JSON.parse(data); return true; };
  P.hurt(world, target, sample.id, 20, { contact: false, critical: false });
  assert.equal(payload.flags.contact, false); assert.equal(payload.flags.sound, true);
  const current = { ...action, world: () => world, hit: (_impact, _amount, _strike, data) => { payload = JSON.parse(data); return true; } };
  P.impact(current, { target: () => target, projectile: () => '' }, sample.id, 20, { flags: { sound: false }, critical: false });
  assert.equal(payload.flags.contact, true); assert.equal(payload.flags.sound, false);
  assert.equal(P.damageFeatures(sample.id).flags.sound, true);
  world.hurt = savedHurt; world.friendly = savedFriendly;
});
check('metadata finalization precedes damage-category validation in both paths', () => {
  const template = move('sample_category', 5, 'template:sample_category', { category: 'status', power: 0 });
  const features = { damage: { base: 2 }, critical: false };
  D.metadata.define({ id: 'fixture:category', applies: scope => scope.move.id() === 'sample_category', apply: scope => { scope.metadata.category = 'special'; } });
  const preview = D.preview(world, player, D.combatants.read(world, player), template, features);
  const settled = D.resolve(world, player, target, template, features);
  close(preview.amount, 2); close(settled.amount, 2); assert.equal(preview.category, 'special');
  D.metadata.remove('fixture:category');
});
function ordinaryInputs() {
  const access = { ...world, source: () => player, friendly: () => false };
  const current = { ...action, sense: () => access, world: () => access, actor: () => player };
  const effect = { world: () => access, source: () => player, target: () => target };
  return { access, current, effect };
}
check('public value and inspection entrypoints accept ordinary world, action and effect handles', () => {
  const { access, current, effect } = ordinaryInputs(), before = nativeReads;
  const node = F.actor('healthRatio').plus(F.stat('attack').div(10)).plus(F.status('sample_mark'));
  const registry = new sandbox.ActionParameters.Registry(); registry.factsOf = P.factsOf;
  registry.define('fixture:ordinary', { amount: { value: 0, label: 'Amount', formula: node } });
  registry.rules.contribute('fixture:ordinary/amount', 'fixture:offset', (scope, value) => value + scope.term('offset', 'Offset', 1));
  const previous = player.statuses; player.statuses = ['sample_mark'];
  for (const source of [access, current, effect]) {
    assert.equal(P.factContext(source).pokemon, undefined);
    close(Formula.compile(node)(P.factsOf(source)), 2.3);
    close(registry.value('fixture:ordinary', 'amount', source), 3.3);
    const result = registry.evaluate('fixture:ordinary', 'amount', source);
    assert.equal(P.resultBinding(result, 'Amount').value, '3.3');
    const missing = P.explanationBinding(Formula.explain(F.individual('friendship'), P.factsOf(source)), undefined, 'Individual fact');
    assert(missing.unavailable.includes('individual.friendship'));
    assert.equal(P.factsOf(source).read('move.pp'), undefined);
  }
  assert.equal(P.factsOf(current).read('target.actor.health'), target.hp);
  assert.equal(P.factsOf(effect).read('target.actor.health'), target.hp);
  player.statuses = previous; assert.equal(nativeReads, before);
});
check('native catalogue entrypoints guard their individual boundary and retain native behavior', () => {
  const { access, current, effect } = ordinaryInputs(), before = nativeReads;
  for (const source of [access, current, effect]) {
    assert.throws(() => P.parameterContext(skill.id, source), /Native skill parameters require/);
    assert.throws(() => P.p(skill.id, 'power', source), /Native skill parameters require/);
  }
  assert.equal(nativeReads, before);
  const native = P.parameterContext(skill.id, action);
  assert.equal(P.p(skill.id, 'power', native), 71);
  assert.equal(P.parameterBinding(native, 'power').value, '71');
  const domain = source.domain, reads = nativeReads;
  source.domain = () => 'minecraft';
  assert.throws(() => native.pokemon, /Native skill parameters require/);
  assert.equal(nativeReads, reads); source.domain = domain;
});
check('numeric conditional branches, boolean combinators and known gating share one scope', () => {
  const values = { read: () => undefined };
  assert.equal(Formula.compile(F.when(F.const(1), 5, 9))(values), 5);
  assert.equal(Formula.compile(F.and(F.const(1), F.const(0)))(values), 0);
  assert.equal(Formula.compile(F.or(F.const(1), F.const(0)))(values), 1);
  assert.equal(Formula.compile(F.not(F.const(0)))(values), 1);
  const previous = source.statuses; source.statuses = ['sample_mark'];
  assert.equal(Formula.compile(F.known(F.status('sample_mark')))(facts(context)), 1);
  source.statuses = [];
  assert.equal(Formula.compile(F.known(F.status('sample_mark')))(facts(context)), 1, 'Observed absence is known false, distinct from an unavailable target');
  source.statuses = previous;
  // An unknown target reads as not-known rather than a known zero, and the detail reports the missing fact.
  const gate = Formula.known(F.target('actor.health'));
  assert.equal(Formula.compile(gate)(facts({})), 0);
  assert.equal(Formula.explain(gate, facts({})).unavailable.includes('target.actor.health'), true);
});
check('named string choices and preference labels resolve through the skill scope', () => {
  const scope = { ...context, detail: { values: { mode: 'a' } } };
  assert.equal(Formula.compile(F.choice('mode', 'a'))(facts(scope)), 1);
  assert.equal(Formula.compile(F.choice('mode', 'b'))(facts(scope)), 0);
  assert.equal(Formula.explain(F.choice('mode', 'a'), facts(scope)).value, 1);
  assert.equal(Formula.compile(F.known(F.choice('mode', 'b')))(facts(scope)), 1);
  assert.equal(Formula.compile(F.known(F.choice('missing', 'b')))(facts(scope)), 0);
  assert.equal(Formula.compile(F.choice('factor', 2))(facts(context)), 1);
  assert.equal(Formula.explain(F.pref('factor'), facts(context)).label.key, 'worldcombat.skill.sample_a.preference.factor');
  assert.equal(P.damageFeatures(skill.id, 'other').segment, 'other');
});
check('explicit attack and defence stats and ordered effectiveness rewrite the same resolve', () => {
  const template = templates.get('sample_a');
  const plain = D.resolve(world, source, target, template, { critical: false }).amount;
  const defended = D.resolve(world, source, target, template, { damage: { attackStat: 'def' }, critical: false }).amount;
  assert(defended > 0 && defended < plain);
  D.effectiveness.define({ id: 'fixture:grounding', applies: scope => scope.moveType === 'fire',
    apply: scope => { scope.effectiveness = scope.effectiveness * 0.5; } });
  close(D.resolve(world, source, target, template, { critical: false }).amount, plain * 0.5);
  D.effectiveness.remove('fixture:grounding');
});
check('registered damage executes and previews ordinary public fact contexts without native access', () => {
  const sample = { ...skill, id: 'sample_public' }; templates.set(sample.id, move(sample.id));
  const node = F.actor('healthRatio').times(4).plus(F.pref('factor')).plus(F.var('provided.factor', 'Provided factor'));
  P.defineFacts(sample.id, scope => ({ read: id => id === 'provided.factor' ? scope.detail.values.factor : undefined }));
  P.actionParameters.define(sample.id, { power: P.power(0) });
  P.defineDamage(sample.id, 'power', { base: 0 }, { resolve: scope => ({ damage: { base: Formula.compile(node)(scope.facts) } }) });
  P.define(sample);
  const { access, current, effect } = ordinaryInputs(), before = nativeReads;
  let applied;
  access.hurt = (_actor, amount) => { applied = amount; return true; };
  for (const source of [access, current, effect]) {
    const features = P.damageFeatures(sample.id, 'power', P.factContext(source)); features.critical = false;
    assert(P.hurt(access, target, sample.id, 0, features)); close(applied, 6);
    const result = D.explain(access, player, D.combatants.read(access, player), templates.get(sample.id), features, { value: 0 });
    close(result.amount, applied); close(result.explanation.value, applied); assert.equal(result.available, true);
  }
  assert.equal(nativeReads, before);
});
console.log(`PASS formula/context: ${count} scenarios; no emitted files or game processes`);
