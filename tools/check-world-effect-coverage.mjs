import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Neutral runtime fixture: exercise the real shared native facts and shipped conditional policies.
const listeners = new Map(), handlers = new Map(), skills = new Map(), definitions = new Map();
const damageObservers = new Map();
const fluent = new Proxy(() => fluent, { get: () => fluent });
const noop = () => {};
const point = (x=0,y=0,z=0) => ({x:()=>x,y:()=>y,z:()=>z,plus:p=>point(x+p.x(),y+p.y(),z+p.z())});
const context = vm.createContext({ console, F: fluent, actionParameters: { define: noop },
  formula: noop, seconds: noop, percent: noop, hidden: noop, n: noop, stages: noop, describe: noop, defineFacts: noop,
  defineDamage: noop, flag: noop, field: noop, pathOf: noop, text: x => x, damageSpec: noop,
  define: spec => skills.set(spec.id, spec), p: () => 100, skills: {},
  WorldFeedback: { emit: noop, keep: noop, text: noop, onEffect: noop },
  WorldCombat: { on: (id, topic, _after, callback) => listeners.set(id, { topic, callback }),
    effect: (id, _schema, _maximum, _lifetime, normalize) => definitions.set(id, normalize),
    effectHandler: (id, event, callback) => handlers.set(`${id}/${event}`, callback), event: noop, phase: noop,
    preview: (_id, json) => JSON.parse(json), point },
  NativeEffects: { effectiveStages: (_w, a) => a.stages, lastMove: (_w, a) => a.lastMove || null,
    read: (_w, a) => ({ used: a.lastMove?.id || '' }), ability: () => '',
    boost: () => true, consumePositiveStages: () => 0, resetStages: () => 0, invertStages: () => 0, copyStages: () => ({ changed: 0, total: 0 }) },
  NativeModifiers: {}, NativeAbilities: { flag: () => false },
  NativeLoadout: { facts: move => ({ flags: { contact: move.contact } }) },
  CobblemonCombat: { pokemon: a => a.pokemon, moveTemplate: id => ({ category: () => id === 'guard' ? 'status' : 'physical', contact: id === 'punch' }) },
  PokemonDamage: { metadata: { define: noop }, onDamageApplied(id, listener, filter) {
    assert(!damageObservers.has(id), 'Duplicate damage observer'); damageObservers.set(id, { listener, filter });
  } }, GuardEffects: {}, CompanionBehavior: {},
  WorldGeometry: {}, LivingActions: {}, NumberContext: {}, sound: noop
});
const units = ['alluringvoice', 'burningjealousy', 'punishment', 'powertrip', 'storedpower', 'lashout',
  'haze', 'clearsmog', 'topsyturvy', 'psychup', 'batonpass', 'disable', 'torment', 'eeriespell',
  'worryseed', 'gastroacid', 'grudge', 'imprison', 'encore', 'counter', 'mirrorcoat', 'metalburst', 'comeuppance'];
const sources = ['content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/protocols/effects.ts',
  'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/mechanisms/mob-effects.ts',
  ...units.flatMap(id => ['parameters.ts', 'skill.ts'].map(file => `content/moves/${id}/${file}`)), 'content/moves/worryseed/rules.ts'];
vm.runInContext(ts.transpileModule(sources.map(file => fs.readFileSync(file, 'utf8')).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None }
}).outputText, context);

let now = 100, serial = 0, scheduled = [];
const categories = { 'minecraft:speed': 'beneficial', 'minecraft:strength': 'beneficial', 'minecraft:regeneration': 'beneficial',
  'minecraft:slowness': 'harmful', 'minecraft:weakness': 'harmful', 'minecraft:poison': 'harmful',
  'fixture:visual': 'beneficial', 'fixture:counter': 'harmful' };
const tags = { 'fixture:visual': ['world_combat:status/identity_only'], 'fixture:counter': ['world_combat:status/confusion'],
  'world_combat:disable_lock': ['world_combat:status/disable'], 'world_combat:torment_itch': ['world_combat:status/torment'],
  'world_combat:eerie': ['world_combat:status/eerie'], 'world_combat:imprison_sealed': ['world_combat:status/imprison'],
  'world_combat:grudge_toll': ['world_combat:status/grudge'] };
const actor = (id, domain = 'minecraft') => ({ id, domain: () => domain, ref: () => id, key: () => id, stages: {},
  markers: new Map(), effects: new Map(), modifiers: new Map(), valid: true, attacking: null });
const source = actor('source', 'cobblemon'), ordinary = actor('ordinary'), other = actor('other');
const actors = [source, ordinary, other];
function effectView(a, id) {
  const item = a.markers.get(id); if (!item || item.until !== -1 && item.until <= now) return null;
  return { id: () => id, duration: () => item.until === -1 ? -1 : item.until - now, amplifier: () => item.amplifier,
    key: () => `${id}:${item.revision}`, category: () => categories[id] || 'harmful',
    tagged: tag => (tags[id] || []).includes(tag), tags: () => (tags[id] || []).join(' ') };
}
const world = { tick: () => now, source: () => source, valid: a => a.valid, random: () => 0.2,
  friendly: () => false, actor: id => actors.find(a => a.id === id) || null,
  observe: a => ({ attacking: () => a.attacking, health: () => 20, maxHealth: () => 20, position:()=>point() }),
  effects: (a, definition) => [...a.effects.values()].filter(e => e.definition() === definition && !e.ended),
  mobEffect: effectView, mobEffects: a => [...a.markers.keys()].map(id => effectView(a, id)).filter(Boolean),
  marker(a, id, ticks, amplifier) {
    if (a.refuse) return;
    const old = effectView(a, id);
    if (old && (old.amplifier() > amplifier || old.amplifier() === amplifier && (old.duration() === -1 || ticks !== -1 && old.duration() >= ticks))) return;
    a.markers.set(id, { until: ticks === -1 ? -1 : now + ticks, amplifier, revision: ++serial });
  },
  removeMobEffect(a, id, expected) { if (effectView(a, id)?.key() !== expected) return false; a.markers.delete(id); return true; },
  transferMobEffect(from, to, id, expected) {
    if (from.removeRefuse || to.refuse || effectView(from, id)?.key() !== expected) return false;
    const value = from.markers.get(id), before = effectView(to, id), current = effectView(from, id);
    if (before && (before.amplifier() > current.amplifier() || before.amplifier() === current.amplifier()
      && (before.duration() < 0 || current.duration() >= 0 && before.duration() >= current.duration()))) return false;
    from.markers.delete(id); to.markers.set(id, {...value, revision: ++serial}); return true;
  },
  replaceMobEffect(actor,id,expected,ticks,amplifier) {
    if(actor.refuse||actor.removeRefuse||(effectView(actor,id)?.key()||'')!==expected)return false;
    actor.markers.set(id,{until:ticks===-1?-1:now+ticks,amplifier,revision:++serial});return true;
  },
  attribute(a, id, amount, operation) { a.modifiers.set(activeOwner, { id, amount, operation }); return true; },
  effect(definition, a, data, ticks) {
    const id = ++serial;
    const item = { ended: false, id: () => id, definition: () => definition, target: () => a, source: () => source,
      world: () => world, data: () => data, state: () => data, remaining: next => next === undefined ? ticks : (ticks = next),
      schedule: (_key, event, after) => scheduled.push({ at: now + after, item, event }),
      end: () => { item.ended = true; a.effects.delete(id); a.modifiers.delete(id); } };
    a.effects.set(id, item); activeOwner = id; handlers.get(`${definition}/start`)?.(item); activeOwner = 0; return id;
  },
  operation(id, operation) {
    for (const a of actors) { const item = a.effects.get(id); if (item) { handlers.get(`${item.definition()}/operation:${operation}`)?.(item); return true; } }
    return false;
  }
};
let activeOwner = 0;
const event = (a, target, data) => ({ world: () => world, actor: () => a, target: () => target, data: () => JSON.stringify(data) });
function advance(ticks) {
  for (let i = 0; i < ticks; i++) {
    now++;
    const ready = scheduled.filter(x => x.at <= now); scheduled = scheduled.filter(x => x.at > now);
    ready.forEach(({ item, event }) => { if (!item.ended) { activeOwner = item.id(); handlers.get(`${item.definition()}/${event}`)?.(item); activeOwner = 0; } });
  }
}
function reset() { for (const a of actors) { a.markers.clear(); a.effects.clear(); a.modifiers.clear(); a.stages = {}; a.attacking = null; a.valid = true; a.refuse = false; } scheduled = []; }
const { MobEffects: M, DamageSemantics: D, PokemonSkills: P, CombatStatus: C } = context;
const attack = type => ({ amount: 8, actual: 5, damageType: type, sourceLiving: true, sourceActor: ordinary.id,
  direct: type === 'minecraft:mob_attack', damageTags: type === 'minecraft:arrow' ? ['minecraft:is_projectile'] : [] });
function remember(a = ordinary, type = 'minecraft:mob_attack', extra = {}) {
  listeners.get('world_combat:native_attack_memory').callback(event(a, source, { ...attack(type), ...extra }));
}
const policy = (id, a, metadata) => {
  const result = { world, actor: a, phase: 'damage', move: null, metadata, blocked: {}, failures: {}, detail: {} };
  C.actions.apply(result); return result;
};
let checks = 0;
function test(label, run) { reset(); run(); checks++; console.log(`PASS ${label}`); }
test('native beneficial facts preserve level 20 and exclude identity-only visual markers', () => {
  world.marker(ordinary, 'minecraft:strength', 200, 19); world.marker(ordinary, 'fixture:visual', 200, 80);
  assert.equal(M.levels(world, ordinary, 'beneficial'), 20);
});
test('copy keeps duration and strength; refusal does not erase source', () => {
  world.marker(ordinary, 'minecraft:speed', 90, 2);
  assert.equal(M.copy(world, ordinary, other, 'beneficial', 40), 1); assert.equal(effectView(other, 'minecraft:speed').duration(), 40);
  other.refuse = true; other.markers.clear(); assert.equal(M.transferOne(world, ordinary, other, effectView(ordinary, 'minecraft:speed')), false);
  assert(effectView(ordinary, 'minecraft:speed'));
});
test('transfer moves one exact effect within budget and rejects stale observations', () => {
  world.marker(ordinary, 'minecraft:speed', 90, 2); const stale = effectView(ordinary, 'minecraft:speed');
  world.marker(ordinary, 'minecraft:speed', 120, 3); assert.equal(M.transferOne(world, ordinary, other, stale), false);
  assert.equal(M.transfer(world, ordinary, other, 3), 0); assert.equal(M.transfer(world, ordinary, other, 4), 4);
  assert.equal(effectView(ordinary, 'minecraft:speed'), null); assert.equal(effectView(other, 'minecraft:speed').duration(), 120);
});
test('source removal veto cannot create a transferred copy', () => {
  world.marker(ordinary, 'minecraft:speed', 90, 2); ordinary.removeRefuse = true;
  assert.equal(M.transferOne(world, ordinary, other, effectView(ordinary, 'minecraft:speed')), false);
  assert(effectView(ordinary, 'minecraft:speed')); assert.equal(effectView(other, 'minecraft:speed'), null);
  ordinary.removeRefuse = false;
});
test('exact replacement refusal retains the old native application', () => {
  world.marker(ordinary,'minecraft:speed',90,2);const previous=effectView(ordinary,'minecraft:speed').key();
  ordinary.refuse=true;assert.equal(M.set(world,ordinary,'minecraft:speed',20,0),null);
  assert.equal(effectView(ordinary,'minecraft:speed').key(),previous);ordinary.refuse=false;
  assert.equal(M.set(world,ordinary,'minecraft:speed',20,0).amplifier(),0);
});
test('paired reversal preserves simultaneous opposite effects and their clocks', () => {
  world.marker(ordinary, 'minecraft:speed', 90, 2); world.marker(ordinary, 'minecraft:slowness', 45, 0);
  world.marker(ordinary, 'minecraft:regeneration', 120, 1); assert.equal(M.invert(world, ordinary, false), 2);
  assert.equal(effectView(ordinary, 'minecraft:slowness').amplifier(), 2); assert.equal(effectView(ordinary, 'minecraft:slowness').duration(), 90);
  assert.equal(effectView(ordinary, 'minecraft:speed').duration(), 45); assert(effectView(ordinary, 'minecraft:regeneration'));
});
test('limited cleansing lowers an actual harmful effect by exactly one level', () => {
  world.marker(ordinary, 'minecraft:poison', 150, 2); assert.equal(M.reduce(world, ordinary, 'harmful', 1), 1);
  assert.equal(effectView(ordinary, 'minecraft:poison').amplifier(), 1); assert.equal(effectView(ordinary, 'minecraft:poison').duration(), 150);
});
test('native attack memory retains pre-armor and actual damage, expires by age and ignores copied attacks', () => {
  remember(); const seen = D.recentAttack(world, ordinary); assert.equal(seen.amount, 8); assert.equal(seen.actual, 5);
  advance(81); assert.equal(D.recentAttack(world, ordinary, 80), null);
  remember(ordinary, 'minecraft:arrow', { scripted: true, kind: 'move' }); assert.equal(D.recentAttack(world, ordinary, 80), null);
});
test('all four return-damage ledgers expire for ordinary and Pokemon actors', () => {
  for (const move of ['counter', 'mirrorcoat', 'metalburst', 'comeuppance']) {
    for (const subject of [source, ordinary]) {
      P[`${move}Remember`](world, subject, other, 9);
      assert.equal(P[`${move}Record`](world, subject).amount, 9);
      advance(101); assert.equal(P[`${move}Record`](world, subject), null);
    }
  }
});
test('alluring voice triggers against an unboosted pursuer and a recently attacking player', () => {
  assert.equal(P.alluringVoiceBoost(world, ordinary), 0); ordinary.attacking = source;
  assert.equal(P.alluringVoiceBoost(world, ordinary), 1); ordinary.attacking = null; remember();
  assert.equal(P.alluringVoiceBoost(world, ordinary), 1); advance(81); assert.equal(P.alluringVoiceBoost(world, ordinary), 0);
  world.marker(ordinary, 'minecraft:strength', 120, 2); assert.equal(P.alluringVoiceBoost(world, ordinary), 3);
});
test('native potion levels contribute to shipped empowerment and clearing mechanics', () => {
  world.marker(ordinary, 'minecraft:strength', 120, 1);
  assert.equal(P.burningJealousyBoost(world, ordinary), 2); assert.equal(P.punishmentBoosts(world, ordinary), 2);
  assert.equal(P.powertripBoosts(world, ordinary), 2); assert.equal(P.storedpowerBoosts(world, ordinary), 2);
  assert.equal(P.hazeErase(world, ordinary), 2); assert.equal(effectView(ordinary, 'minecraft:strength'), null);
});
test('disable blocks the recorded native method and permits a different method', () => {
  world.marker(ordinary, 'world_combat:disable_lock', 100, 0);
  world.effect(P.disableMark, ordinary, JSON.stringify({ move: 'minecraft:mob_attack', native: true,
    max:100,caster:source.ref(),carrier:effectView(ordinary,'world_combat:disable_lock').key() }), 100);
  assert.equal(policy('', ordinary, attack('minecraft:mob_attack')).blocked.disabled, true);
  assert.equal(policy('', ordinary, attack('minecraft:arrow')).blocked.disabled, undefined);
});
test('torment requires a pause between matching ordinary attacks and leaves another method available', () => {
  world.marker(ordinary, 'world_combat:torment_itch', 200, 0); remember();
  assert.equal(policy('', ordinary, attack('minecraft:mob_attack')).blocked.tormented, true);
  assert.equal(policy('', ordinary, attack('minecraft:arrow')).blocked.tormented, undefined);
  advance(31); assert.equal(policy('', ordinary, attack('minecraft:mob_attack')).blocked.tormented, undefined);
});
test('eerie chance applies to native attacks while scripted damage is not rolled twice', () => {
  world.marker(ordinary, 'world_combat:eerie', 100, 25);
  assert.equal(policy('', ordinary, attack('minecraft:arrow')).failures.eerie, .25);
  assert.equal(policy('', ordinary, { ...attack('minecraft:arrow'), kind: 'move', scripted: true }).failures.eerie, undefined);
});
test('encore blocks switching native methods and permits the named method', () => {
  world.marker(ordinary, P.encoreEffect, 100, 0); world.effect(P.encoreLoop, ordinary, JSON.stringify({ id: 'minecraft:arrow', native: true }), 100);
  assert.equal(policy('', ordinary, attack('minecraft:mob_attack')).blocked.encored, true);
  assert.equal(policy('', ordinary, attack('minecraft:arrow')).blocked.encored, undefined);
});
test('imprison consumes its native attack category and grudge its killing method', () => {
  world.marker(ordinary, 'world_combat:imprison_sealed', 100, 0);
  world.effect(P.imprisonBrand, ordinary, JSON.stringify({ moves: ['native:contact'], caster: source.id }), 100);
  assert.equal(policy('', ordinary, attack('minecraft:mob_attack')).blocked.imprisoned, true);
  assert.equal(policy('', ordinary, attack('minecraft:arrow')).blocked.imprisoned, undefined);
  world.marker(other, 'world_combat:grudge_toll', 100, 0);
  world.effect('world_combat:grudge_debt', other, JSON.stringify({ type: 'minecraft:arrow' }), 100);
  assert.equal(policy('', other, attack('minecraft:arrow')).blocked.grudged, true);
});
test('worry seed rejects sleep for an ordinary marked body', () => {
  world.marker(ordinary, P.worryseedMark, 100, 0);
  const result = C.gate.apply({ world, actor: ordinary, name: 'sleep', allowed: true });
  assert.equal(result.allowed, false);
});
test('fixed attribute windows stay at 12 percent across amplifier changes and clean up on cure and invalidation', () => {
  M.fixedAttributes('fixture:fixed-slow', 'fixture:counter', [{ id: 'minecraft:generic.movement_speed', amount: -.12, operation: 'add_multiplied_total' }]);
  const update = () => listeners.get('fixture:fixed-slow/added').callback(event(ordinary, ordinary, { id: 'fixture:counter' }));
  world.marker(ordinary, 'fixture:counter', 200, 25); update(); assert.equal([...ordinary.modifiers.values()][0].amount, -.12);
  world.marker(ordinary, 'fixture:counter', 200, 80); update(); assert.equal(ordinary.modifiers.size, 1); assert.equal([...ordinary.modifiers.values()][0].amount, -.12);
  ordinary.markers.clear(); advance(1); assert.equal(ordinary.modifiers.size, 0);
  world.marker(ordinary, 'fixture:counter', 100, 80); update(); ordinary.valid = false; advance(1); assert.equal(ordinary.modifiers.size, 0);
  ordinary.valid = true; listeners.get('fixture:fixed-slow/bind').callback(event(ordinary, ordinary, {}));
  assert.equal(ordinary.modifiers.size, 1); advance(100); assert.equal(ordinary.modifiers.size, 0);
});
test('attribute factories sample each native application and share its resource lifetime', () => {
  let sampled = 0, started = 0;
  M.fixedAttributes('fixture:sampled', 'fixture:sampled-carrier', (_world, actor, carrier) => {
    assert.equal(actor, other); sampled++;
    return [{ id: 'fixture:physical', amount: carrier.amplifier() / 100, operation: 'add_value' }];
  }, effect => { assert.equal(effect.target(), other); started++; });
  const update = () => listeners.get('fixture:sampled/added').callback(event(other, other, { id: 'fixture:sampled-carrier' }));
  world.marker(other, 'fixture:sampled-carrier', 100, 40); update(); advance(4);
  assert.equal(sampled, 1); assert.equal(started, 1); assert.equal([...other.modifiers.values()].some(value => value.amount === .4), true);
  world.marker(other, 'fixture:sampled-carrier', 100, 60); update();
  assert.equal(sampled, 2); assert.equal(started, 2); assert.equal([...other.modifiers.values()].some(value => value.amount === .4), false);
  other.markers.clear(); advance(1); assert.equal(other.modifiers.size, 0);
});
test('dynamic attribute projection recomputes in its own live carrier scope and stops on removal', () => {
  let amount = .2;
  context.MobEffects.dynamicAttributes('checks:live-attributes', 'checks:live-carrier', () =>
    [{ id: 'minecraft:generic.movement_speed', amount, operation: 'add_multiplied_total' }], 2);
  world.marker(other, 'checks:live-carrier', 60, 0);
  listeners.get('checks:live-attributes/added').callback(event(other, other, {id:'checks:live-carrier'}));
  advance(2); assert([...other.modifiers.values()].some(value => value.amount === .2));
  amount = .6; advance(2); assert([...other.modifiers.values()].some(value => value.amount === .6));
  assert(![...other.modifiers.values()].some(value => value.amount === .2));
  other.markers.clear(); advance(2); assert.equal(other.modifiers.size, 0);
});
console.log(`PASS world effect coverage: ${checks} neutral checks`);
