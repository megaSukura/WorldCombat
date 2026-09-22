import fs from 'node:fs';
import path from 'node:path';

const identity = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;

/** Selected units own native resource-pack assets alongside code and data. */
export function buildUnitAssets(directory, units, root = process.cwd()) {
  const target = path.resolve(directory, 'assets'), build = path.resolve(root, 'build');
  if (!target.startsWith(build + path.sep)) throw Error('Generated assets must stay inside build');
  fs.rmSync(target, { recursive: true, force: true }); fs.mkdirSync(target, { recursive: true });
  const owners = new Map();
  for (const unit of units) {
    const folder = path.resolve(root, unit, 'resources/assets');
    if (!fs.existsSync(folder)) continue;
    for (const name of fs.readdirSync(folder, { recursive: true }).sort()) {
      const source = path.join(folder, name); if (!fs.statSync(source).isFile()) continue;
      const key = name.replaceAll('\\', '/');
      if (owners.has(key)) throw Error('Conflicting asset ' + key + ' in ' + unit + ' and ' + owners.get(key));
      owners.set(key, unit);
      if (name.endsWith('.json')) JSON.parse(fs.readFileSync(source, 'utf8'));
      const output = path.join(target, name); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.copyFileSync(source, output);
    }
  }
  buildMobEffectIcons(target, units, root);
  return [...owners.keys()];
}

/** Merge each selected unit's declared effect->texture mapping into one generated vanilla atlas. */
export function buildMobEffectIcons(target, units, root = process.cwd()) {
  if (fs.existsSync(path.join(target, 'minecraft/atlases/mob_effects.json')))
    throw Error('A unit ships minecraft/atlases/mob_effects.json; declare mobEffectIcons in unit.json instead');
  const icons = new Map(), owners = new Map();
  for (const unit of units) {
    const declaration = path.resolve(root, unit, 'unit.json');
    if (!fs.existsSync(declaration)) continue;
    const value = JSON.parse(fs.readFileSync(declaration, 'utf8').replace(/^\uFEFF/, ''));
    for (const [effect, resource] of Object.entries(value.mobEffectIcons || {})) {
      if (!identity.test(effect) || !identity.test(resource))
        throw Error('Invalid mobEffectIcons entry in ' + unit + ': ' + effect + ' -> ' + resource);
      if (icons.has(effect))
        throw Error('Duplicate mob effect icon ' + effect + ' in ' + unit + ' and ' + owners.get(effect));
      icons.set(effect, resource); owners.set(effect, unit);
    }
  }
  if (!icons.size) return;
  const sources = [...icons.entries()].map(([sprite, resource]) => ({ type: 'minecraft:single', resource, sprite }));
  const output = path.join(target, 'minecraft/atlases/mob_effects.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ sources }, null, 2) + '\n');
}
