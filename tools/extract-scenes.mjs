// Extracts every WorldCombatParticles.scene definition from a built client profile into JSON files,
// one per scene, for DefinitionBatchChecks (gradle particleChecks).
// Usage: node tools/extract-scenes.mjs [profile=play] [outDir=build/p5-scenes]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const profile = process.argv[2] || 'play';
const outDir = path.resolve(root, process.argv[3] || 'build/p5-scenes');
const clientJs = path.join(root, 'build/content/profiles', profile, 'client.js');
if (!fs.existsSync(clientJs)) throw new Error('Build the content first: ' + clientJs);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Only scene registration matters here; every other client global is an inert stand-in.
const scenes = {};
const inert = new Proxy(function () {}, {
  get: (target, key) => key === Symbol.toPrimitive ? () => '' : inert,
  apply: () => inert, construct: () => inert
});
const sandbox = { WorldCombatParticles: { scene: (id, version, def) => { scenes[id] = def; } }, console };
// Identifiers the built profile touches at load time besides scene registration; builtins stay real.
for (const name of ['WorldCombatClient', 'UiSurfaces', 'Java', 'Platform', 'Client', 'ClientEvents', 'NetworkEvents', 'ItemEvents', 'WorldCombatUi']) sandbox[name] = inert;
vm.createContext(sandbox);
let stopped = '';
try { vm.runInContext(fs.readFileSync(clientJs, 'utf8'), sandbox, { filename: clientJs }); }
catch (e) { stopped = e.message; }
for (const [id, def] of Object.entries(scenes)) {
  fs.writeFileSync(path.join(outDir, id.replace(/[:/]/g, '_') + '.json'), JSON.stringify(def, null, 1));
}
console.log(`profile ${profile}: ${Object.keys(scenes).length} scene(s) -> ${path.relative(root, outDir)}${stopped ? ' (evaluation stopped after registration: ' + stopped + ')' : ''}`);
for (const [id, def] of Object.entries(scenes)) console.log(' ', id, Object.keys(def.moments || {}).join(','));
