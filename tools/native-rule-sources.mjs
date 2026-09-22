import fs from 'node:fs';
/** Focused checks select independent rule units by their declared dependencies. */
export function abilitySources() {
  return ['content/traits/ability-recipes.ts', ...fs.readdirSync('content/abilities').sort().map(id => 'content/abilities/' + id + '/rules.ts')];
}
export function heldItemSources() {
  return fs.readdirSync('content/items').filter(id => fs.existsSync('content/items/' + id + '/rules.ts') &&
    !JSON.parse(fs.readFileSync('content/items/' + id + '/unit.json','utf8')).requires['world_combat:capture_encounter'])
    .sort().map(id => 'content/items/' + id + '/rules.ts');
}
export function natureSources() { return fs.readdirSync('content/natures').sort().map(id => 'content/natures/' + id + '/rules.ts'); }
