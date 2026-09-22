import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { loadContentManifest, resolvePackages as resolveGraph, contentResources } from './content-manifest.mjs';
import { buildLocalization } from './build-localization.mjs';
import { buildUnitData } from './build-unit-data.mjs';
import { buildUnitAssets } from './build-unit-assets.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const testing = process.argv.includes('--tests');
// Integrator refresh after an already-checked baseline: profile type checks and all collision/resource checks still run.
const assembleOnly = process.argv.includes('--assemble-only');
function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw Error('Missing value for ' + name);
  return value;
}
// Each author selects its own units and output. Concurrent tasks never write the shared play build.
const requested = argument('--units'), selectionFile = argument('--selection'), destination = argument('--output');
if (requested && selectionFile) throw Error('Use --units or --selection');
if ((requested || selectionFile) && (!destination || testing)) throw Error('Selected unit builds need --output and production content');
if (destination && !requested && !selectionFile) throw Error('--output requires --units or --selection');
const selectedReferences = requested ? requested.split(',').filter(Boolean) : selectionFile ? JSON.parse(fs.readFileSync(path.resolve(root, selectionFile), 'utf8').replace(/^\uFEFF/, '')).units : null;
const fixtures = (argument('--fixtures') || '').split(',').filter(Boolean);
if (fixtures.length && !selectedReferences) throw Error('--fixtures requires an explicit --units or --selection build');
if ((requested || selectionFile) && (!Array.isArray(selectedReferences) || !selectedReferences.length || !selectedReferences.every(id => typeof id === 'string'))) throw Error('Selection needs a nonempty units array');
// A smoke build adds the units' scenario.ts files on top of the smoke stage (content/smoke) as one synthetic package.
// Several units may share one build (`--units a,b --scenario a/scenario.ts,b/scenario.ts`); the stage runs them in turn.
const scenario = argument('--scenario');
const production = loadContentManifest('content/packs.json', root, null, selectedReferences
  ? { units: [...new Set([...selectedReferences, ...fixtures])], additional: scenario ? ['world_combat:smoke'] : [] } : null);
const manifest = testing ? loadContentManifest('tests/content/packs.json', root, production) : production;
const selectedUnits = selectedReferences ? [...production.profiles.authoring] : null;
if (scenario) {
  const files = scenario.split(',').filter(Boolean);
  if (!selectedUnits || !selectedUnits.length || files.length !== selectedReferences.length) throw Error('--scenario needs one scenario file per primary unit in --units (fixtures do not run scenarios)');
  const sources = files.map(file => {
    const relative = path.relative(root, path.resolve(root, file)).replaceAll('\\', '/');
    if (!relative.startsWith('content/') || !relative.endsWith('.ts') || !fs.existsSync(path.join(root, relative))) throw Error('Scenario must be a .ts file inside content/: ' + file);
    return relative;
  });
  const requires = { 'world_combat:smoke': '0.1' };
  for (const id of selectedUnits) requires[id] = manifest.packages[id].version;
  manifest.packages['world_combat:smoke_scenario'] = { version: '0.1', sources, clientSources: [], startupSources: [], resources: [], requires };
  selectedUnits.push('world_combat:smoke_scenario');
}
const output = destination ? path.resolve(root, destination) : path.join(root, testing ? 'build/test-content' : 'build/content');
if (destination) {
  const relative = path.relative(path.join(root, 'build'), output);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || ['content', 'test-content'].includes(relative.split(path.sep)[0])) throw Error('Author output must use a separate directory inside build');
}
const selectedClosure = selectedUnits ? resolveGraph(manifest, selectedUnits) : null;
const profiles = selectedUnits ? { authoring: selectedUnits } : manifest.profiles;
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const converted = ts.convertCompilerOptionsFromJson(config.config.compilerOptions, root);
if (converted.errors.length) throw new Error(converted.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
const options = converted.options;
function mergeNamespaceDeclarations(file) {
  // TypeScript emits one `var Namespace;` for each merged namespace source. Rhino rejects
  // repeated declarations in the same script; retaining the first preserves ES5 semantics.
  // Keep line counts intact so the emitted source map still addresses every recipe.
  const seen = new Set();
  const text = fs.readFileSync(file, 'utf8').replace(/^var ([A-Za-z_$][\w$]*);\r?$/gm, (line, name) => {
    if (seen.has(name)) return `// ${name} shares its earlier namespace binding.`;
    seen.add(name); return line;
  });
  fs.writeFileSync(file, text);
}
function resolvePackages(selected) { return resolveGraph(manifest, selected); }
// Units written into one shared namespace (PokemonSkills, CompanionBehavior, ...) merge at emit time. TypeScript
// reports duplicate functions and let/const, but a repeated namespace-level `var` silently overwrites the other
// unit's value. Refuse that across packages so a batch of independent authors cannot clobber each other.
function namespaceVars(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES5, true);
  const found = [];
  for (const statement of source.statements) {
    if (!ts.isModuleDeclaration(statement) || !statement.body || !ts.isModuleBlock(statement.body)) continue;
    for (const inner of statement.body.statements) {
      if (!ts.isVariableStatement(inner) || (inner.declarationList.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const))) continue;
      for (const declaration of inner.declarationList.declarations) if (ts.isIdentifier(declaration.name))
        found.push(statement.name.text + '.' + declaration.name.text);
    }
  }
  return found;
}
function rejectSharedVarCollisions(packages) {
  const owners = new Map();
  for (const id of packages) for (const source of manifest.packages[id].sources || []) {
    for (const name of namespaceVars(path.join(root, source))) {
      const owner = owners.get(name);
      if (owner && owner.id !== id) throw new Error(`Namespace-level var ${name} is declared by both ${owner.id} (${owner.source}) and ${id} (${source}); `
        + 'use const/let/function with a unit-specific name so the merged namespace keeps both values');
      if (!owner) owners.set(name, { id, source });
    }
  }
}
// Each package must type-check with only its declared dependencies. A larger profile must not hide reverse references.
for (const id of (assembleOnly ? [] : selectedClosure || Object.keys(manifest.packages)).filter(id => !testing || !production.packages[id])) {
  const closure = resolvePackages([id]);
  const native = closure.includes('world_combat:native');
  const serverSdk = ['sdk/core/index.d.ts', 'sdk/core/world.d.ts', ...(native ? ['sdk/cobblemon/index.d.ts'] : []), ...(closure.includes('world_combat:smoke') ? ['sdk/smoke/index.d.ts'] : [])];
  for (const [field, sdk] of [['sources', serverSdk], ['clientSources', ['sdk/client/index.d.ts']], ['startupSources', ['sdk/startup/index.d.ts']]]) {
    const files = closure.flatMap(name => manifest.packages[name][field] || []);
    const program = ts.createProgram([...sdk, ...files].map(file => path.join(root, file)), { ...options, noEmit: true });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) throw new Error(`Package ${id} (${field}) has an undeclared dependency:\n` + ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n'
    }));
  }
}
for (const [name, selected] of Object.entries(profiles)) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid profile name');
  const packages = resolvePackages(selected);
  const directory = path.join(output, 'profiles', name);
  fs.mkdirSync(directory, { recursive: true });
  const registration = path.join(directory, 'packages.ts');
  fs.writeFileSync(registration, packages.map(id => {
    const pkg = manifest.packages[id];
    return `WorldCombat.contentPack(${JSON.stringify(id)}, ${JSON.stringify(pkg.version)}, ${JSON.stringify(JSON.stringify(pkg.requires))});`;
  }).join('\n') + '\n');
  const sources = packages.flatMap(id => manifest.packages[id].sources);
  buildUnitAssets(directory,contentResources(manifest,packages),root);
  buildLocalization(directory,contentResources(manifest,packages),root);
  buildUnitData(directory,contentResources(manifest,packages),root);
  if (new Set(sources).size !== sources.length) throw new Error('Source belongs to multiple selected packages');
  rejectSharedVarCollisions(packages);
  for (const source of sources) {
    const relative = path.relative(root, path.resolve(root, source));
    if (relative.startsWith('..') || path.isAbsolute(relative) || !(source.startsWith('content/') || testing && source.startsWith('tests/content/')) || !source.endsWith('.ts'))
      throw new Error('Invalid content source: ' + source);
  }
  const program = ts.createProgram([path.join(root, 'sdk/core/index.d.ts'), path.join(root, 'sdk/core/world.d.ts'), path.join(root, 'sdk/cobblemon/index.d.ts'),
    ...(packages.includes('world_combat:smoke') ? [path.join(root, 'sdk/smoke/index.d.ts')] : []),
    registration, ...sources.map(source => path.join(root, source))], { ...options, outFile: path.join(directory, 'p1_demo.js') });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n'
  }));
  if (program.emit().emitSkipped) throw new Error('Content emission failed: ' + name);
  mergeNamespaceDeclarations(path.join(directory, 'p1_demo.js'));
  const clientSources = packages.flatMap(id => manifest.packages[id].clientSources || []);
  for (const source of clientSources) {
    if (!/^(tests\/)?content\/[a-z0-9_/-]+\.ts$/.test(source) || !testing && source.startsWith('tests/')) throw new Error('Invalid client source: ' + source);
  }
  const clientProgram = ts.createProgram([path.join(root, 'sdk/client/index.d.ts'), ...clientSources.map(source => path.join(root, source))],
    { ...options, outFile: path.join(directory, 'client.js') });
  const clientDiagnostics = ts.getPreEmitDiagnostics(clientProgram);
  if (clientDiagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(clientDiagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n'
  }));
  if (clientProgram.emit().emitSkipped) throw new Error('Client content emission failed: ' + name);
  if (!clientSources.length) {
    fs.writeFileSync(path.join(directory, 'client.js'), '// Empty client content profile.\n');
    fs.writeFileSync(path.join(directory, 'client.js.map'), JSON.stringify({ version: 3, file: 'client.js', sources: [], names: [], mappings: '' }));
  } else mergeNamespaceDeclarations(path.join(directory, 'client.js'));
  const startupSources = packages.flatMap(id => manifest.packages[id].startupSources || []);
  const startupProgram = ts.createProgram([path.join(root, 'sdk/startup/index.d.ts'), ...startupSources.map(source => path.join(root, source))],
    { ...options, outFile: path.join(directory, 'startup.js') });
  const startupDiagnostics = ts.getPreEmitDiagnostics(startupProgram);
  if (startupDiagnostics.length) throw Error(ts.formatDiagnosticsWithColorAndContext(startupDiagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n'
  }));
  if (startupProgram.emit().emitSkipped) throw Error('Startup content emission failed: ' + name);
  if (!startupSources.length) {
    fs.writeFileSync(path.join(directory,'startup.js'),'// This profile has no startup registrations.\n');
    fs.writeFileSync(path.join(directory,'startup.js.map'),JSON.stringify({version:3,file:'startup.js',sources:[],names:[],mappings:''}));
  } else mergeNamespaceDeclarations(path.join(directory,'startup.js'));
  fs.writeFileSync(path.join(directory, 'content-assets-files.json'), JSON.stringify(fs.readdirSync(path.join(directory,'assets'),{recursive:true}).filter(file=>fs.statSync(path.join(directory,'assets',file)).isFile()).map(file=>file.replaceAll('\\','/')).sort(),null,2)+'\n');
  fs.writeFileSync(path.join(directory, 'content-profile.json'), JSON.stringify({ schema: 1, profile: name,
    packages: Object.fromEntries(packages.map(id => [id, manifest.packages[id].version])) }, null, 2) + '\n');
  console.log(`Built ${testing ? 'test fixture' : 'content'} profile ${name}: ${packages.length} packages/units, ${sources.length} server sources`);
}
// Existing launchers keep their file name; the selected package list controls its contents.
const defaultProfile = selectedUnits ? 'authoring' : testing ? 'legacy' : production.defaultProfile;
if (!Object.hasOwn(profiles, defaultProfile)) throw new Error('Unknown default content profile: ' + defaultProfile);
const defaultDirectory = path.join(output, 'profiles', defaultProfile);
buildUnitAssets(output,contentResources(manifest,resolvePackages(profiles[defaultProfile])),root);
buildLocalization(output,contentResources(manifest,resolvePackages(profiles[defaultProfile])),root);
buildUnitData(output,contentResources(manifest,resolvePackages(profiles[defaultProfile])),root);
for (const name of ['p1_demo.js', 'p1_demo.js.map', 'content-profile.json', 'client.js', 'client.js.map', 'startup.js', 'startup.js.map', 'content-assets-files.json'])
  fs.copyFileSync(path.join(defaultDirectory, name), path.join(output, name));
for (const file of ['p1_demo.js.map', 'client.js.map', 'startup.js.map']) {
  const target = path.join(output, file), mapping = JSON.parse(fs.readFileSync(target, 'utf8'));
  mapping.sources = mapping.sources.map(source => path.relative(output, path.resolve(defaultDirectory, source)).replaceAll('\\', '/'));
  fs.writeFileSync(target, JSON.stringify(mapping));
}
if (!selectedUnits && !testing) {
  const file = path.join(output, 'unit-index.json');
  const units = Object.fromEntries(Object.entries(production.packages).filter(([, pkg]) => pkg.unit).map(([id, pkg]) => [id, pkg.unit]));
  fs.writeFileSync(file + '.tmp', JSON.stringify({ schema: 1, units }, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
}
