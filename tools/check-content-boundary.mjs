import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { loadContentManifest } from './content-manifest.mjs';

// Foundation profiles remain independently usable without installing a concrete repertoire.
const manifest = loadContentManifest();
for (const [id, pkg] of Object.entries(manifest.packages)) {
  for (const file of [...pkg.sources, ...(pkg.clientSources || [])]) {
    assert(!/\bVerdant\w*\b/.test(fs.readFileSync(file,'utf8')), `${id} uses the former family service: ${file}`);
    if (!pkg.unit) assert(!file.startsWith('content/skills/'), `${id} directly owns a final skill`);
  }
}
for (const profile of ['core', 'base']) {
  const calls = [];
  const api = name => new Proxy({}, { get: (_, method) => (...args) => calls.push({ name, method, args }) });
  const context = vm.createContext({ WorldCombat: api('core'), WorldCombatClient: api('client') });
  if (profile === 'base') context.CobblemonCombat = api('native');
  const directory = `build/content/profiles/${profile}`;
  for (const file of ['p1_demo.js', 'client.js']) vm.runInContext(fs.readFileSync(`${directory}/${file}`, 'utf8'), context);
  assert(calls.some(call => call.method === 'effect'), `${profile}: expected reusable effects`);
  assert(!calls.some(call => ['register', 'registerAction', 'tactics'].includes(call.method) || call.name === 'client'), `${profile}: sample gameplay registered`);
  const installed = JSON.parse(fs.readFileSync(`${directory}/content-profile.json`, 'utf8'));
  for (const id of Object.keys(installed.packages)) assert(Object.hasOwn(manifest.packages, id), `test package in ${profile}: ${id}`);
}

// The playable default must actually install the authored repertoire, while library profiles stay independent.
const installed = JSON.parse(fs.readFileSync('build/content/content-profile.json', 'utf8'));
assert.equal(installed.profile, manifest.defaultProfile);
assert(Object.hasOwn(installed.packages, 'world_combat:play'), 'default distribution omitted the formal repertoire');
for (const id of Object.keys(installed.packages)) assert(Object.hasOwn(manifest.packages, id), `fixture in default: ${id}`);
const registrations = [];
const api = name => new Proxy({}, { get: (_, method) => (...args) => registrations.push({ name, method, args }) });
vm.runInNewContext(fs.readFileSync('build/content/p1_demo.js', 'utf8'), { WorldCombat: api('core'), CobblemonCombat: api('native') });
// New formal units may register actions. Source ownership above keeps foundations separate.
assert(registrations.some(call => call.method === 'tactics'), 'default has no companion behavior');
assert(registrations.some(call => call.method === 'effectHandler' && call.args[0] === 'world_combat:wild/clock' && call.args[1] === 'decide'), 'default has no wild behavior');

// Geometry fixtures remain useful independently of the retired modal UI.
const scenes = {};
const context = vm.createContext({ WorldCombatClient: { scene: (id, version, handler) => {
  const key = `${id}@${version}`; assert(!scenes[key]); scenes[key] = handler;
} } });
vm.runInContext(fs.readFileSync('build/test-content/profiles/workshop/client.js', 'utf8'), context);
function run(id, data) {
  scenes[id + '@1']({ data: () => JSON.stringify(data),
    line: (...args) => assert(args.every(Number.isFinite)), ring: (...args) => assert(args.every(Number.isFinite)) });
}
run('p4:field', { position: [1,2,3], data: { radius: 2, charged: true } });
run('p4:beam', { data: { origin: [1,2,3], point: [4,5,6], arcs: [[7,8,9]] } });
run('p4:echo', { position: [1,2,3], data: { phase: 10 } });
run('p4:insulation', { position: [1,2,3], data: {} });
console.log('PASS content boundaries: independent foundations and companion/wild behavior; archived skills excluded; isolated scene fixtures');
