import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const noop = () => {};
const context = vm.createContext({ WorldCombat: { on: noop, effect: noop, effectHandler: noop, event: noop, phase: noop },
  CobblemonCombat: { pokemon(actor) { assert(actor.pokemon, 'Ordinary bodies must never enter native Pokemon access'); return actor.pokemon; },
    loadout: noop,
    typeEffectiveness: (attack, defence) => attack === 'ghost' && defence === 'normal' ? 0 : attack === 'grass' && defence === 'water' ? 2 : 1,
  } });
const sources = ['content/protocols/effects.ts', 'content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/traits/composition.ts', 'content/traits/ability-recipes.ts',
  ...['formula', 'combatant-stats', 'combat-stages', 'native-abilities', 'native-items', 'native-semantics', 'native-modifiers', 'native-effects', 'world-environment', 'native-loadout', 'pokemon-damage'].map(id => `content/mechanisms/${id}.ts`)];
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
let count = 0;
function check(name, run) { run(); count++; console.log(`PASS ${name}`); }
function close(actual, expected, message) { assert(Math.abs(actual - expected) < 1e-8, message || `${actual} != ${expected}`); }

check('native facts preserve permanent cultivation, types and stages', () => {
  close(resolve().amount, 54 / 7); // (4 + 80*.04)/(1 + 80*.005), then same type.
  target.native.def = 160; close(resolve().amount, 6); target.native.def = 80;
  source.native.level = 80; close(resolve().amount, 54 / 7, "Level is already represented by actual stats"); delete source.native.level;
  source.native.atk = 160; assert(resolve().amount > 54 / 7); source.native.atk = 80;
  target.native.types = ['water']; close(resolve().amount, 108 / 7); target.native.types = [];
  target.native.types = ['normal']; assert.equal(resolve(target, { type: 'ghost' }).amount, 0); target.native.types = [];
});
check('ordinary target has no invented defence or level and no 30/1000 cap', () => {
  const result = resolve(ordinary), details = JSON.parse(result.metadata);
  close(result.amount, 10.8); assert.equal(details.calculation.defence, 0); assert.equal(details.calculation.defenceAvailable, false);
  assert.equal(details.armorExcluded, 0); assert.equal(details.targetScale, 1);
  const registry = new context.CombatantStats.Registry();
  assert.equal(registry.read(world, ordinary).level, undefined);
  assert.equal(registry.read(world, ordinary).stats.def, undefined);
  ordinary.armor = 30;
  assert.equal(resolve(ordinary).amount, result.amount, 'Armor is settled by MC, not converted to a second script DEF');
  ordinary.armor = 0;
});
check('same contributed facts resolve identically across actor domains', () => {
  const registry = context.PokemonDamage.combatants;
  registry.provide('fixture:actual-stats', ({ actor }, facts) => {
    if (actor !== ordinary) return;
    facts.level = 40; facts.stats = { atk: 80, spa: 80, def: 80, spd: 80 }; facts.types = ['grass'];
  });
  assert.equal(resolve(ordinary).amount, resolve(target).amount);
  assert.equal(resolve(target, {}, ordinary).amount, resolve(target).amount);
  assert(registry.remove('fixture:actual-stats'));
  assert.equal(new context.CombatantStats.Registry().read(world, ordinary).stats.def, undefined);
});
check('world actor can attack with actual attribute and without native APIs', () => {
  const result = resolve(ordinary, { category: 'special' }, ordinary);
  close(result.amount, 4.32); // 4 + 8*.04, no source level.
  assert.equal(JSON.parse(result.metadata).calculation.level, undefined);
  ordinary.attack = 20; close(resolve(ordinary, {}, ordinary).amount, 4.8); ordinary.attack = 8;
});
check('actual strength/weakness scale both target kinds; multiplicative bonuses remain uncapped', () => {
  const baseline = [resolve().amount, resolve(ordinary).amount];
  source.attack = 11; const strong = [resolve().amount, resolve(ordinary).amount];
  source.attack = 4; const weak = [resolve().amount, resolve(ordinary).amount];
  source.attack = 80; const tenfold = resolve(ordinary).amount;
  assert(strong.every((value, i) => value > baseline[i])); assert(weak.every((value, i) => value < baseline[i]));
  close(tenfold, 54, 'Actual attack 800 must not be clipped to the old eightfold ratio'); source.attack = 8;
});
check('physical/special defence and native projection metadata stay distinct', () => {
  target.native.def = 300; target.native.spd = 80; target.native.projectedArmor = 10; target.native.projectedToughness = 3;
  const physical = resolve(), special = resolve(target, { category: 'special' });
  assert(special.amount > physical.amount);
  assert.equal(JSON.parse(physical.metadata).armorExcluded, 10); assert.equal(JSON.parse(special.metadata).toughnessExcluded, 3);
  target.native.def = 80; target.native.projectedArmor = 0; target.native.projectedToughness = 0;
});
check('world health capacity never scales the incoming damage amount', () => {
  const before = resolve().amount;
  target.native.scale = 4;
  const boostedCapacity = resolve(); assert.equal(boostedCapacity.amount, before); assert.equal(JSON.parse(boostedCapacity.metadata).targetScale, 1);
  target.native.scale = .2; assert.equal(resolve().amount, before); delete target.native.scale;
});
check('large legal damage reaches both direct and geometric execution unchanged', () => {
  context.PokemonDamage.apply(world, ordinary, move, { power: 10000, critical: false });
  const first = applied.at(-1); assert(first.amount > 1000);
  let geometric;
  const action = { world: () => world, actor: () => source, id: () => 42, data: () => null,
    hit: (hit, amount, strike, metadata) => { geometric = { target: hit.target(), amount, strike, metadata }; return true; } };
  context.PokemonDamage.hit(action, { target: () => ordinary }, move, { power: 10000, critical: false }, 'wave-2');
  assert.equal(geometric.amount, first.amount); assert.equal(geometric.strike, 'wave-2');
});
check('invalid or zero-force facts cannot become fabricated damage', () => {
  ordinary.attack = 0; assert.equal(resolve(ordinary, {}, ordinary).amount, 0); ordinary.attack = 8;
  assert.throws(() => resolve(ordinary, { power: Infinity }), /finite/);
  assert.throws(() => resolve(ordinary, { power: -1 }), /positive/);
});
check('effect impact protocols preserve large finite values without a numeric balance limit', () => {
  const payload = { amount: 2e6, cause: 'checks:large' };
  assert.equal(JSON.parse(context.EffectProtocols.impact(JSON.stringify(payload))).amount, payload.amount);
  assert.throws(() => context.EffectProtocols.impact('{"amount":-1}'));
});
check('inspection and execution share native move, ability and item critical stages', () => {
  const highCritical = { ...move, critRatio: () => 2 };
  source.native.ability = 'superluck'; source.native.item = 'cobblemon:scope_lens';
  const described = context.PokemonDamage.describe(source.pokemon, highCritical);
  assert.equal(described.critical.baseChance, 1 / 24);
  assert.equal(described.critical.moveStage, 1); assert.equal(described.critical.abilityStage, 1); assert.equal(described.critical.itemStage, 1);
  assert.equal(described.critical.chance, 1); assert.equal(described.nativeCategory, 'physical'); assert.equal(described.nativePower, 40);
  const savedRandom = world.random; world.random = () => .999;
  let data = JSON.parse(context.PokemonDamage.resolve(world, source, target, highCritical).metadata);
  assert.equal(data.critical, true); assert.equal(data.criticalChance, described.critical.chance);
  target.native.ability = 'battlearmor';
  data = JSON.parse(context.PokemonDamage.resolve(world, source, target, highCritical).metadata);
  assert.equal(data.critical, false); assert.equal(data.criticalChance, 0);
  source.native.ability = ''; source.native.item = ''; target.native.ability = ''; world.random = savedRandom;
});
check('critical probability boundaries and species-specific held items use the same profile', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(stage => context.PokemonDamage.criticalChance(stage)), [1 / 24, 1 / 8, .5, 1, 1]);
  assert.equal(context.PokemonDamage.criticalProfile(move, '', 'leek', 'cobblemon:farfetchd').chance, .5);
  assert.equal(context.PokemonDamage.criticalProfile(move, '', 'leek', 'cobblemon:bulbasaur').chance, 1 / 24);
  const savedRandom = world.random;
  world.random = () => 1 / 24 - 1e-8;
  assert.equal(JSON.parse(context.PokemonDamage.resolve(world, source, target, move).metadata).critical, true);
  world.random = () => 1 / 24;
  assert.equal(JSON.parse(context.PokemonDamage.resolve(world, source, target, move).metadata).critical, false);
  world.random = savedRandom;
});
check('STAB and critical multipliers in inspection use the executing constants and trait override', () => {
  const before = resolve().amount, previous = context.PokemonDamage.multipliers.sameType;
  context.PokemonDamage.multipliers.sameType = 2;
  assert.equal(context.PokemonDamage.describe(source.pokemon, move).sameTypeMultiplier, 2);
  close(resolve().amount, before / previous * 2); context.PokemonDamage.multipliers.sameType = previous;
  source.native.ability = 'sniper';
  assert.equal(context.PokemonDamage.describe(source.pokemon, move).critical.multiplier, 2.25);
  close(resolve(target, { critical: true }).amount, before * 2.25); source.native.ability = '';
});
check('explicit damage designs have distinct growth and retain fractional pulse budgets', () => {
  const fixed = { base: 3, coefficient: 0 }, growing = { base: 1, coefficient: .025 };
  close(resolve(ordinary, { damage: fixed }).amount, resolve(ordinary, { damage: growing }).amount);
  source.native.atk = 160;
  assert(resolve(ordinary, { damage: growing }).amount > resolve(ordinary, { damage: fixed }).amount); source.native.atk = 80;
  const pulse = resolve(ordinary, { damage: { base: .2, coefficient: .001 } }).amount;
  assert(pulse > 0 && pulse < 1);
  close(pulse * 8, resolve(ordinary, { damage: { base: 1.6, coefficient: .008 } }).amount);
});
check('independent damage contributions compose as explicit terms and remain instance-local', () => {
  const before = resolve(ordinary).amount;
  context.PokemonDamage.combatants.contributeDamage('fixture:resonance', () => [{ id: 'resonance', label: 'Resonance', amount: 2 }]);
  const result = resolve(ordinary); close(result.amount - before, 3);
  assert.equal(JSON.parse(result.metadata).calculation.contributions[0].amount, 2);
  assert.equal(new context.CombatantStats.Registry().damageContributions({}).length, 0);
  context.PokemonDamage.combatants.removeDamageContributor('fixture:resonance'); close(resolve(ordinary).amount, before);
});
check('explicit fixed, pure attribute and custom formulas do not require a fake positive power', () => {
  close(context.CombatantStats.calculate(0, 0, 0, { base: 3 }).amount, 3);
  close(context.CombatantStats.calculate(0, 5, 0, { coefficient: .2 }).amount, 1);
  close(context.CombatantStats.calculate(0, 0, 0, { base: 0 }, [{ id: 'fixture', label: 'Fixture', amount: 2 }]).amount, 2);
  close(context.CombatantStats.calculate(0, 0, 0, { base: 3, evaluate: terms => terms.beforeDefence * 2 }).amount, 6);
  assert.throws(() => context.CombatantStats.calculate(Infinity, 0, 0, { base: 3 }), /finite/);
});
check('live previews use the executing attributes, stages, held items and effective ability', () => {
  const oldEffects = world.effects;
  source.attack = 11; source.native.item = 'cobblemon:choice_band';
  world.effects = (actor, id) => actor === source && id === 'cobblemon_world_combat:modifier'
    ? [{ id: () => 1, data: () => JSON.stringify({ stages: { atk: 2 }, ability: 'superluck' }) }] : [];
  const facts = context.PokemonDamage.sourceFacts(source.pokemon, world, source), features = { power: 28, critical: false, damage: { base: 2.5, coefficient: .035 } };
  const preview = context.PokemonDamage.preview(world, source, facts, move, features);
  const actual = context.PokemonDamage.resolve(world, source, ordinary, move, features);
  close(preview.calculated.attack, 330); close(preview.amount, actual.amount); close(preview.critical.chance, 1 / 8);
  assert(preview.adjustments.some(entry => entry.label === '当前能力等级' && entry.value === 2));
  world.effects = oldEffects; source.attack = 8; source.native.item = '';
});
check('fixed contact tags participate identically in live preview and execution', () => {
  source.native.ability = 'toughclaws';
  const features = { power: 28, damage: { base: 2.5, coefficient: .035 }, contact: true, critical: false };
  const facts = context.PokemonDamage.sourceFacts(source.pokemon, world, source);
  const preview = context.PokemonDamage.preview(world, source, facts, move, features);
  const actual = context.PokemonDamage.resolve(world, source, ordinary, move, features);
  close(preview.powerFactor, 1.3); close(preview.amount, actual.amount);
  const without = context.PokemonDamage.preview(world, source, facts, move, { ...features, contact: false });
  close(preview.amount / without.amount, 1.3); source.native.ability = '';
});
check('accuracy and evasion use the three-based ladder and default to no randomness', () => {
  close(context.CombatStages.accuracyMultiplier(0), 1);
  close(context.CombatStages.accuracyMultiplier(3), 2);
  close(context.CombatStages.accuracyMultiplier(-3), 0.5);
  close(context.CombatStages.accuracyMultiplier(6), 3);
  close(context.CombatStages.accuracyMultiplier(-6), 1 / 3);
  close(context.CombatStages.hitChance(1, 1), 1, 'untouched stages add no miss chance');
  close(context.CombatStages.hitChance(4 / 3, 5 / 3), 0.8);
});
check('explicit fixed HP damage preserves authored values and type policy across actor domains', () => {
  const D=context.PokemonDamage;
  assert(D.fixed(world,ordinary,move,7.5,{ignoreArmor:true},'none'));
  close(applied.at(-1).amount,7.5);assert.equal(applied.at(-1).data.critical,false);
  const previous=target.native.types;target.native.types=['normal'];
  const ghost={...move,type:()=> 'ghost'};
  assert.equal(D.fixed(world,target,ghost,7.5,{},'immunity'),false);
  assert(D.fixed(world,target,ghost,7.5,{},'none'));close(applied.at(-1).amount,7.5);
  const size=applied.length;assert.equal(D.fixed(world,ordinary,move,0),false);assert.equal(applied.length,size);
  target.native.types=previous;
});
check('ignored defense stages become per-hit additive exclusions for ordinary equipment wearers', () => {
  const effectsBefore = world.effects;
  let stages = { def: 2, spd: 3 };
  world.effects = (actor, definition) => actor === ordinary && definition === context.CombatStages.definition
    ? [{ id: () => 71, remaining: () => 100, data: () => JSON.stringify({ stages }) }] : [];
  context.PokemonDamage.metadata.define({ id: 'fixture:ignore-defence',
    applies: value => value.metadata.move === 'leaf', apply: context.PokemonDamage.ignoreDefenceStages });
  let hit = JSON.parse(resolve(ordinary).metadata);
  assert.equal(hit.armorAddedExcluded, 2 * context.CombatStages.armorPerStage);
  assert.equal(hit.armorExcluded, 0, 'Equipment base is not excluded');
  assert.equal(hit.ignoreDefenceStages, true);
  stages = { def: -2, spd: -1 };
  hit = JSON.parse(resolve(ordinary).metadata);
  assert.equal(hit.armorAddedExcluded, -2 * context.CombatStages.armorPerStage);
  assert.equal(stages.def, -2, 'Ignoring a hit does not rewrite persistent stages');
  context.PokemonDamage.metadata.remove('fixture:ignore-defence');
  world.effects = effectsBefore;
});
console.log(`PASS combatant damage: ${count} scenarios; independent designs, live source previews, contributions and uncapped execution`);
