import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const identity = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
export const sourceSides = ['sources', 'clientSources', 'startupSources'];

function inside(root, value) {
  if (typeof value !== 'string' || path.isAbsolute(value)) throw Error('Expected a relative content path: ' + value);
  const result = path.resolve(root, value), relative = path.relative(root, result);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Content path escaped its owner: ' + value);
  return result;
}
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function collectionPrefix(root, selected) {
  const directory = inside(root, selected);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) throw Error('Unknown content collection directory: ' + selected);
  return path.relative(root, directory).replaceAll('\\', '/') + '/';
}

function readUnit(root, directory) {
  const value = read(path.join(directory, 'unit.json'));
  if (value.schema !== 1 || !identity.test(value.id)) throw Error('Invalid unit declaration: ' + directory);
  const relative = path.relative(root, directory).replaceAll('\\', '/');
  const unit = { ...value, version: value.version || '0.1', requires: { ...(value.requires || {}) }, unit: relative, resources: [relative] };
  for (const side of sourceSides) unit[side] = (value[side] || []).map(local => {
    const source = inside(directory, local);
    if (!source.endsWith('.ts') || !fs.statSync(source).isFile()) throw Error('Invalid unit source: ' + source);
    return path.relative(root, source).replaceAll('\\', '/');
  });
  return unit;
}

function preparePackage(id, value, root) {
  if (!identity.test(id) || typeof value.version !== 'string') throw Error('Invalid content package: ' + id);
  const pkg = { ...value, requires: { ...(value.requires || {}) }, resources: [...(value.resources || [])] };
  for (const side of sourceSides) {
    pkg[side] = [...(value[side] || [])];
    if (new Set(pkg[side]).size !== pkg[side].length) throw Error('Duplicate source in ' + id);
    for (const source of pkg[side]) inside(root, source);
  }
  for (const resource of pkg.resources) inside(root, resource);
  return pkg;
}

// A full integration publishes only ID -> directory facts. Private builds open live files solely for
// requested units and their dependencies; new units are supplied by directory before they enter the index.
function loadSelected(manifest, root, selection) {
  const packages = {}, units = new Map(), directories = new Map();
  let index;
  function indexed() {
    if (index) return index;
    const file = inside(root, 'build/content/unit-index.json');
    if (!fs.existsSync(file)) throw Error('Missing unit index; the integrator must run node tools/build-content.mjs before private builds');
    const value = read(file);
    if (value.schema !== 1 || !value.units || Array.isArray(value.units)) throw Error('Invalid unit index: ' + file);
    index = value.units;
    return index;
  }
  function unitAt(relative, expected) {
    const directory = inside(root, relative), known = directories.get(directory);
    const unit = known || readUnit(root, directory);
    if (expected && unit.id !== expected) throw Error('Stale unit index: expected ' + expected + ', found ' + unit.id);
    if (manifest.packages[unit.id] || units.has(unit.id) && units.get(unit.id).unit !== unit.unit)
      throw Error('Duplicate content identity: ' + unit.id);
    directories.set(directory, unit); units.set(unit.id, unit);
    return unit.id;
  }
  function identify(reference) {
    if (!identity.test(reference)) return unitAt(reference);
    if (manifest.packages[reference] || units.has(reference)) return reference;
    const directory = indexed()[reference];
    if (!directory) throw Error('Unknown content dependency: ' + reference + ' (pass a new unit by directory, or refresh the integration unit index)');
    return unitAt(directory, reference);
  }
  function include(id) {
    if (packages[id]) return;
    const pkg = packages[id] = preparePackage(id, manifest.packages[id] || units.get(id), root);
    for (const collection of pkg.collections || []) {
      const value = read(inside(root, collection));
      if (value.schema !== 1 || !Array.isArray(value.units)) throw Error('Invalid content collection: ' + collection);
      for (const selected of value.units) {
        let members;
        if (selected.endsWith('/')) {
          const prefix = collectionPrefix(root, selected);
          members = Object.entries(indexed()).filter(([, directory]) => directory.startsWith(prefix)).map(([id]) => identify(id));
          for (const unit of units.values()) if (unit.unit.startsWith(prefix) && !members.includes(unit.id)) members.push(unit.id);
        } else members = [identify(selected)];
        for (const member of members) {
          const dependency = manifest.packages[member] || units.get(member);
          if (pkg.requires[member] && pkg.requires[member] !== dependency.version) throw Error('Conflicting unit version: ' + member);
          pkg.requires[member] = dependency.version;
        }
      }
    }
    for (const dependency of Object.keys(pkg.requires)) include(identify(dependency));
  }
  const selected = selection.units.map(identify), additional = (selection.additional || []).map(identify);
  [...selected, ...additional].forEach(include);
  const result = { ...manifest, defaultProfile: 'authoring', packages, profiles: { authoring: selected } };
  resolvePackages(result, [...selected, ...additional]);
  return result;
}

/** Units and libraries share one dependency graph. Directory names carry no gameplay semantics. */
export function loadContentManifest(file = 'content/packs.json', root = workspace, inherited = null, selection = null) {
  const manifest = read(inside(root, file));
  if (selection) {
    if (inherited) throw Error('Private selections use their own production manifest');
    return loadSelected(manifest, root, selection);
  }
  if (inherited) for (const id of Object.keys(manifest.packages || {})) {
    if (inherited.packages[id]) throw Error('Content manifest replaces inherited package: ' + id);
  }
  manifest.packages = { ...(inherited ? inherited.packages : {}), ...manifest.packages };
  const byDirectory = new Map(), byId = new Map();
  function discover(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error('Content discovery does not follow links: ' + directory + '/' + entry.name);
      if (entry.isDirectory()) discover(path.join(directory, entry.name));
      else if (entry.name === 'unit.json') {
        const unit = readUnit(root, directory);
        if (byId.has(unit.id) || manifest.packages[unit.id]) throw Error('Duplicate content identity: ' + unit.id);
        byDirectory.set(unit.unit, unit); byId.set(unit.id, unit);
      }
    }
  }
  for (const directory of manifest.unitRoots || ['content']) discover(inside(root, directory));
  for (const unit of byId.values()) manifest.packages[unit.id] = unit;
  for (const [id, value] of Object.entries(manifest.packages)) {
    if (inherited && inherited.packages[id]) continue;
    const pkg = manifest.packages[id] = preparePackage(id, value, root);
    for (const collection of pkg.collections || []) {
      const selection = read(inside(root, collection));
      if (selection.schema !== 1 || !Array.isArray(selection.units)) throw Error('Invalid content collection: ' + collection);
      for (const selected of selection.units) {
        // A directory collection includes its current units, including an empty collection before production.
        const prefix = selected.endsWith('/') ? collectionPrefix(root, selected) : null;
        const units = prefix !== null ? [...byDirectory.entries()].filter(([dir]) => dir.startsWith(prefix)).map(([, unit]) => unit)
          : [byDirectory.get(selected) || byId.get(selected)];
        if (units.some(unit => !unit)) throw Error('Unknown selected unit: ' + selected);
        for (const unit of units) {
          if (pkg.requires[unit.id] && pkg.requires[unit.id] !== unit.version) throw Error('Conflicting unit version: ' + unit.id);
          pkg.requires[unit.id] = unit.version;
        }
      }
    }
  }
  for (const id of Object.keys(manifest.packages)) resolvePackages(manifest, [id]);
  for (const selected of Object.values(manifest.profiles || {})) resolvePackages(manifest, selected);
  return manifest;
}

/** Required dependencies load first; optional ordering never installs another unit. */
export function resolvePackages(manifest, selected) {
  const chosen = new Set(), selecting = new Set();
  function include(id) {
    if (selecting.has(id)) throw Error('Content dependency cycle: ' + [...selecting, id].join(' -> '));
    if (chosen.has(id)) return;
    const pkg = manifest.packages[id]; if (!pkg) throw Error('Unknown content dependency: ' + id);
    selecting.add(id);
    for (const [dependency, version] of Object.entries(pkg.requires || {})) {
      if (manifest.packages[dependency]?.version !== version) throw Error(id + ' requires ' + dependency + '@' + version);
      include(dependency);
    }
    selecting.delete(id); chosen.add(id);
  }
  selected.forEach(include);
  const ordered = [], visiting = new Set();
  function visit(id) {
    if (ordered.includes(id)) return;
    if (visiting.has(id)) throw Error('Content ordering cycle: ' + [...visiting, id].join(' -> '));
    visiting.add(id);
    const pkg = manifest.packages[id];
    for (const conflict of pkg.conflicts || []) if (chosen.has(conflict)) throw Error(id + ' conflicts with ' + conflict);
    for (const dependency of Object.keys(pkg.requires || {})) visit(dependency);
    for (const dependency of pkg.after || []) if (chosen.has(dependency)) visit(dependency);
    visiting.delete(id); ordered.push(id);
  }
  [...chosen].forEach(visit);
  return ordered;
}

export function contentResources(manifest, packages) {
  return [...new Set(packages.flatMap(id => manifest.packages[id].resources || []))];
}
