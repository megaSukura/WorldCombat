import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const upstream = path.join(root, 'build/p4-research/locked-showdown');
const { Dex } = require(path.join(upstream, 'sim/dex.js'));
const dex = Dex.mod('cobblemon');
const raw = require(path.join(upstream, 'data/moves.js')).Moves;
const facts = JSON.parse(fs.readFileSync(path.join(root, 'build/p4-research/native-facts.json'), 'utf8'));
const observed = JSON.parse(fs.readFileSync(path.join(root, 'runs/p4-effects-full-server/native-registry.json'), 'utf8'));
if (!observed.moves || !observed.items) throw new Error('Run the full P4 server check to export current registry facts.');
const canonical = [...new Set(dex.moves.all().map(move => move.id))].sort();
if (canonical.join('\n') !== observed.moves.join('\n')) throw new Error('Source data and the actual native move registry differ.');
if ([...new Set(dex.abilities.all().map(ability => ability.id))].sort().join('\n') !== observed.abilities.join('\n'))
  throw new Error('Source data and the actual native ability registry differ.');
const old = fs.readFileSync(path.join(root, 'manifests/move-ids.txt'), 'utf8').trim().split(/\r?\n/);
function csv(value) { return '"' + String(value).replaceAll('"', '""') + '"'; }
function writeCsv(name, header, rows) {
  fs.writeFileSync(path.join(root, 'manifests', name), [header, ...rows].map(row => row.map(csv).join(',')).join('\n') + '\n');
}
function hints(move) {
  const found = new Set();
  if (move.category !== 'Status') found.add('settlement');
  if (move.status || move.volatileStatus || move.boosts || move.secondary || move.secondaries || move.self) found.add('state');
  if (move.multihit || move.flags?.charge || move.flags?.recharge || move.priority) found.add('timing');
  if (move.heal || move.drain || move.recoil || move.damage || move.ohko) found.add('health-operation');
  if (move.weather || move.terrain || move.pseudoWeather || move.sideCondition) found.add('field');
  if (move.selfSwitch || move.forceSwitch) found.add('switch');
  if (move.isZ || move.isMax) found.add('special-system');
  if (Object.values(move).some(value => typeof value === 'function')) found.add('custom-callback-review');
  return [...found].sort().join(';');
}
const moves = canonical.map(id => dex.moves.get(id));
writeCsv('native-moves.csv', ['id', 'category', 'type', 'declared_learn_sources', 'special_system', 'mechanism_hints'], moves.map(move => [
  move.id, move.category, move.type, (facts.moveOrigins[move.id] || []).join(';'), move.isZ ? 'Z' : move.isMax ? 'Max' : '', hints(move)
]));
writeCsv('native-abilities.csv', ['id', 'declared_species_sources', 'callback_keys'], observed.abilities.map(id => [
  id, (facts.abilityOrigins[id] || []).join(';'), Object.keys(dex.abilities.get(id)).filter(key => typeof dex.abilities.get(id)[key] === 'function').sort().join(';')
]));
const itemIds = new Map(observed.items.map(id => [id.split(':')[1].replaceAll('_', ''), id]));
const specialItemCandidates = new Set(dex.items.all().filter(item => item.megaStone || item.zMove || item.zMoveType).map(item => itemIds.get(item.id)));
writeCsv('native-items.csv', ['showdown_id', 'native_name_candidate', 'callback_keys', 'dependency'], dex.items.all().map(item => [
  item.id, itemIds.get(item.id) || '', Object.keys(item).filter(key => typeof item[key] === 'function').sort().join(';'),
  item.megaStone ? 'Mega' : item.zMove || item.zMoveType ? 'Z' : ''
]));
const summary = { schema: 1, artifact: facts.artifact, showdownVersion: facts.showdownVersion,
  sourceMoveEntries: Object.keys(raw).length, nativeMoveIds: canonical.length,
  oldSnapshotEntries: old.length, addedSourceIds: Object.keys(raw).filter(id => !old.includes(id)).sort(),
  sourceAliases: Object.keys(raw).filter(id => dex.moves.get(id).id !== id).map(id => ({ id, native: dex.moves.get(id).id })),
  nativeAbilities: observed.abilities.length, nativeItems: observed.items.length, referenceItems: dex.items.all().length,
  zMoves: moves.filter(m => m.isZ).length, maxMoves: moves.filter(m => m.isMax).length,
  specialNativeItems: observed.items.filter(id => specialItemCandidates.has(id) || /mega|z_ring|z_power|z_crystal|dynamax|tera_orb|key_stone/.test(id)),
  specialForms: facts.specialForms,
  interpretation: 'Declared data sources and mechanism hints; obtainability and callback semantics require review. Item matches are name candidates.' };
fs.writeFileSync(path.join(root, 'manifests/native-inventory.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ nativeMoves: canonical.length, nativeAbilities: observed.abilities.length, referenceItems: dex.items.all().length,
  specialNativeItems: summary.specialNativeItems }));
