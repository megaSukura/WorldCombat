import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadContentManifest, resolvePackages } from './content-manifest.mjs';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const root = fs.mkdtempSync(path.join(workspace, 'build', 'content-isolation-'));
let checks = 0;
function write(file, value) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}
function check(name, run) { run(); checks++; console.log('PASS content isolation: ' + name); }
const ownDirectory = 'content/authors/first';
const own = { schema: 1, id: 'checks:alpha', version: '1', requires: { 'checks:bundle': '1' }, sources: ['main.ts'] };
const helper = { schema: 1, id: 'checks:helper', version: '1', sources: ['main.ts'] };
const packs = { schema: 1, defaultProfile: 'play', packages: {
  'checks:library': { version: '1', sources: ['content/library.ts'] },
  'checks:bundle': { version: '1', requires: { 'checks:library': '1' }, collections: ['content/shared.json'] },
  'checks:unselected': { version: '1', requires: { 'checks:missing': '1' }, collections: ['content/missing.json'] },
}, profiles: { play: ['checks:unselected'] } };
const index = { schema: 1, units: {
  'checks:alpha': ownDirectory,
  'checks:helper': 'content/shared/helper',
  'checks:clock': 'content/shared/clocks/clock',
  'checks:smoke': 'content/shared/smoke',
  'checks:unfinished': 'content/authors/unfinished',
} };
const load = (units = [ownDirectory], additional = []) => loadContentManifest('content/packs.json', root, null, { units, additional });
try {
  write('content/packs.json', packs);
  write('content/library.ts', 'namespace FixtureLibrary {}');
  write('content/shared.json', { schema: 1, units: ['content/shared/helper', 'content/shared/clocks/'] });
  write(ownDirectory + '/unit.json', own);
  write(ownDirectory + '/main.ts', 'namespace FixtureAlpha {}');
  write('content/shared/helper/unit.json', helper);
  write('content/shared/helper/main.ts', 'namespace FixtureHelper {}');
  write('content/shared/clocks/clock/unit.json', { schema: 1, id: 'checks:clock', version: '1' });
  write('content/shared/smoke/unit.json', { schema: 1, id: 'checks:smoke', version: '1', requires: { 'checks:helper': '1' } });
  write('content/authors/unfinished/unit.json', '{"schema":');
  write('build/content/unit-index.json', index);

  check('an unrelated half-written manifest is never read; only the requested closure is loaded', () => {
    const reads = [], original = fs.readFileSync;
    let manifest;
    fs.readFileSync = function (file, ...args) { reads.push(String(file)); return original.call(this, file, ...args); };
    try { manifest = load(); } finally { fs.readFileSync = original; }
    assert.deepEqual(manifest.profiles.authoring, ['checks:alpha']);
    assert.deepEqual(resolvePackages(manifest, ['checks:alpha']).sort(), ['checks:alpha', 'checks:bundle', 'checks:clock', 'checks:helper', 'checks:library']);
    assert(!reads.some(file => file.includes('unfinished') || file.endsWith('missing.json')));
    assert.equal(manifest.packages['checks:unselected'], undefined);
  });
  check('the full integration loader still rejects unfinished units', () => {
    assert.throws(() => loadContentManifest('content/packs.json', root), SyntaxError);
  });
  check('baseline IDs and explicit new unit directories both resolve, including an additional smoke dependency', () => {
    assert.equal(load(['checks:alpha']).packages['checks:alpha'].unit, ownDirectory);
    write('content/authors/new/unit.json', { ...own, id: 'checks:new' });
    write('content/authors/new/main.ts', 'namespace FixtureNew {}');
    const manifest = load(['content/authors/new'], ['checks:smoke']);
    assert.deepEqual(manifest.profiles.authoring, ['checks:new']);
    assert(manifest.packages['checks:smoke']);
    assert.equal(manifest.packages['checks:alpha'], undefined);
  });
  check('a sibling with missing source files cannot block a ready author', () => {
    write('content/authors/unfinished/unit.json', { schema: 1, id: 'checks:unfinished', sources: ['not-written.ts'] });
    assert(load().packages['checks:alpha']);
  });
  check('selected syntax errors and missing server, client or startup sources remain failures', () => {
    write(ownDirectory + '/unit.json', '{"schema":');
    assert.throws(() => load(), SyntaxError);
    for (const side of ['sources', 'clientSources', 'startupSources']) {
      write(ownDirectory + '/unit.json', { ...own, [side]: ['not-written.ts'] });
      assert.throws(() => load(), /ENOENT|Invalid unit source/);
    }
    write(ownDirectory + '/unit.json', own);
  });
  check('selected shared dependencies retain source validation and version checks', () => {
    write('content/shared/helper/unit.json', { ...helper, sources: ['not-written.ts'] });
    assert.throws(() => load(), /ENOENT|Invalid unit source/);
    write('content/shared/helper/unit.json', helper);
    write(ownDirectory + '/unit.json', { ...own, requires: { 'checks:bundle': '2' } });
    assert.throws(() => load(), /requires checks:bundle@2/);
    write(ownDirectory + '/unit.json', { ...own, requires: { 'checks:absent': '1' } });
    assert.throws(() => load(), /checks:absent/);
    write(ownDirectory + '/unit.json', own);
  });
  check('dependency cycles, selected ID conflicts and escaped source paths remain failures', () => {
    write('content/shared/helper/unit.json', { ...helper, requires: { 'checks:alpha': '1' } });
    assert.throws(() => load(), /cycle/);
    write('content/shared/helper/unit.json', helper);
    write('content/authors/duplicate/unit.json', own);
    write('content/authors/duplicate/main.ts', 'namespace FixtureDuplicate {}');
    assert.throws(() => load([ownDirectory, 'content/authors/duplicate']), /Duplicate content identity/);
    write(ownDirectory + '/unit.json', { ...own, sources: ['../outside.ts'] });
    assert.throws(() => load(), /escaped/);
    write(ownDirectory + '/unit.json', own);
  });
  check('stale index identities fail explicitly instead of loading the wrong unit', () => {
    write('content/shared/clocks/clock/unit.json', { schema: 1, id: 'checks:renamed', version: '1' });
    assert.throws(() => load(['checks:clock']), /checks:clock.*checks:renamed|index/i);
    write('content/shared/clocks/clock/unit.json', { schema: 1, id: 'checks:clock', version: '1' });
  });
  check('empty directory collections load in both modes while unknown selections remain errors', () => {
    const emptyRoot = path.join(root, 'empty-selection');
    write('empty-selection/content/packs.json', { schema: 1, defaultProfile: 'play', packages: {
      'checks:collection': { version: '1', collections: ['content/selection.json'] },
    }, profiles: { play: ['checks:collection'] } });
    write('empty-selection/content/units/.gitkeep', '');
    write('empty-selection/content/selection.json', { schema: 1, units: ['content/units/'] });
    write('empty-selection/build/content/unit-index.json', { schema: 1, units: {} });
    const modes = [null, { units: ['checks:collection'] }];
    for (const selection of modes) {
      const manifest = loadContentManifest('content/packs.json', emptyRoot, null, selection);
      assert.deepEqual(resolvePackages(manifest, ['checks:collection']), ['checks:collection']);
    }
    for (const reference of ['content/missing/', 'checks:missing']) {
      write('empty-selection/content/selection.json', { schema: 1, units: [reference] });
      for (const selection of modes) assert.throws(() => loadContentManifest('content/packs.json', emptyRoot, null, selection), /Unknown/);
    }
  });
  if (process.argv.includes('--workspace')) check('the shared authoring and smoke closure matches the full integration graph', () => {
    const selected = ['world_combat:skill_runtime', 'world_combat:companion_runtime', 'world_combat:smoke'];
    const complete = loadContentManifest();
    const isolated = loadContentManifest('content/packs.json', workspace, null, { units: selected });
    const expected = resolvePackages(complete, selected);
    assert.deepEqual(resolvePackages(isolated, selected), expected);
    for (const id of expected) assert.deepEqual(isolated.packages[id], complete.packages[id]);
  });
  console.log(`PASS content isolation: ${checks} checks`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
