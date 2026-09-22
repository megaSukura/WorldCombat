import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Generates the Cobblemon particle-type index, one particle JSON per texture, and the atlas
// "unstitch" sources that cut Cobblemon's flipbook strips into per-frame sprites.
//
// Frame grids come from Cobblemon's own Bedrock particle definitions
// (assets/cobblemon/bedrock/particles/**.particle.json: texture_width/height + flipbook base_UV /
// size_UV / step_UV / max_frame). Textures no definition covers fall back to a square-frame strip
// when one axis is a whole multiple of the other, else the whole texture is one frame.
//
// Output (all under mods/world-combat-core/src/main/resources):
//   assets/world_combat_core/particle_types.txt           "cobblemon/<path> <frames> <w>x<h>" per line
//   assets/world_combat_core/particles/cobblemon/<path>.json  {"textures":[...frame sprites in order]}
//   assets/minecraft/atlases/particles.json               unstitch sources for every multi-frame or cropped texture
// Single full-texture types reference "cobblemon:<path>" directly (the vanilla particles atlas already
// stitches every textures/particle/** file). Frame sprites are named
// "world_combat_core:cobblemon/<path>/<index>" and stay references into Cobblemon's PNGs.

const definedVersion = fs.readFileSync('manifests/dependencies.toml', 'utf8').match(/^\s*cobblemon\s*=\s*"([^"]+)"/m)?.[1];
if (!definedVersion) throw new Error('Pinned Cobblemon version missing from manifests/dependencies.toml');

function findJar(version) {
  const relative = path.join('.gradle-user', 'caches', 'modules-2', 'files-2.1', 'com.cobblemon', 'neoforge', version);
  const home = process.env.USERPROFILE || process.env.HOME;
  const roots = [path.resolve(relative)];
  if (home) roots.push(path.join(home, '.gradle', 'caches', 'modules-2', 'files-2.1', 'com.cobblemon', 'neoforge', version));
  const target = `neoforge-${version}.jar`;
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.name === target) return full;
      }
    }
  }
  throw new Error(`Pinned Cobblemon jar ${target} is not cached; run the Gradle build first.`);
}

const jar = findJar(definedVersion);
const scan = JSON.parse(execFileSync('python', ['-c', String.raw`
import json,sys,zipfile,struct
out={'textures':{},'definitions':[]}
with zipfile.ZipFile(sys.argv[1]) as jar:
    for n in jar.namelist():
        if n.startswith('assets/cobblemon/textures/particle/') and n.endswith('.png'):
            d=jar.read(n)
            out['textures'][n[len('assets/cobblemon/textures/particle/'):-4]]=list(struct.unpack('>II', d[16:24]))
        elif n.startswith('assets/cobblemon/bedrock/particles/') and n.endswith('.json'):
            try:
                j=json.loads(jar.read(n).decode('utf-8'))
            except Exception:
                continue
            pe=j.get('particle_effect') or {}
            tex=((pe.get('description') or {}).get('basic_render_parameters') or {}).get('texture')
            uv=((pe.get('components') or {}).get('minecraft:particle_appearance_billboard') or {}).get('uv')
            if tex and isinstance(uv,dict):
                out['definitions'].append({'file':n,'texture':tex,'uv':uv})
print(json.dumps(out))
`, jar], {windowsHide: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}));

const textures = scan.textures;
const paths = Object.keys(textures).sort();
if (!paths.length) throw new Error('No Cobblemon particle textures found in ' + jar);

const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const isPair = value => Array.isArray(value) && value.length === 2 && value.every(isNumber);

// Normalise "cobblemon:textures/particles/x/y" (definition spelling) to "x/y" (file spelling).
function textureKey(reference) {
  let key = reference.includes(':') ? reference.split(':', 2)[1] : reference;
  for (const prefix of ['textures/particles/', 'textures/particle/', 'particles/', 'particle/']) {
    if (key.startsWith(prefix)) { key = key.slice(prefix.length); break; }
  }
  return key;
}

// Grid candidates per texture: flipbook grids first, static crops second.
const flipbooks = new Map();
const statics = new Map();
for (const definition of scan.definitions) {
  const key = textureKey(definition.texture);
  if (!textures[key]) continue;
  const uv = definition.uv;
  if (!isNumber(uv.texture_width) || !isNumber(uv.texture_height)) continue;
  const flip = uv.flipbook;
  if (flip && isPair(flip.base_UV) && isPair(flip.size_UV) && isPair(flip.step_UV)) {
    const grid = {tw: uv.texture_width, th: uv.texture_height, base: flip.base_UV, size: flip.size_UV, step: flip.step_UV,
      frames: isNumber(flip.max_frame) ? Math.floor(flip.max_frame) : null};
    count(flipbooks, key, grid);
  } else if (!flip && isPair(uv.uv) && isPair(uv.uv_size)) {
    count(statics, key, {tw: uv.texture_width, th: uv.texture_height, base: uv.uv, size: uv.uv_size});
  }
}

function count(map, key, grid) {
  const id = JSON.stringify(grid);
  let bucket = map.get(key);
  if (!bucket) map.set(key, bucket = new Map());
  const entry = bucket.get(id) || {grid, uses: 0};
  entry.uses++;
  bucket.set(id, entry);
}

function mostUsed(bucket) {
  let best = null;
  for (const entry of bucket.values()) if (!best || entry.uses > best.uses) best = entry;
  return best.grid;
}

// Frame rectangles in texture pixels, in playback order.
function frameRects(key) {
  const [w, h] = textures[key];
  const flip = flipbooks.get(key);
  if (flip) {
    const grid = mostUsed(flip);
    const sx = w / grid.tw, sy = h / grid.th;
    const rects = [];
    const limit = grid.frames && grid.frames > 0 ? grid.frames : 1024;
    for (let i = 0; i < limit; i++) {
      const x = Math.round((grid.base[0] + grid.step[0] * i) * sx);
      const y = Math.round((grid.base[1] + grid.step[1] * i) * sy);
      const fw = Math.round(grid.size[0] * sx), fh = Math.round(grid.size[1] * sy);
      if (fw <= 0 || fh <= 0 || x < 0 || y < 0 || x + fw > w || y + fh > h) break;
      rects.push({x, y, w: fw, h: fh});
      if (grid.step[0] === 0 && grid.step[1] === 0) break;
    }
    if (rects.length) return {rects, source: 'flipbook'};
  }
  const still = statics.get(key);
  if (still) {
    const grid = mostUsed(still);
    const sx = w / grid.tw, sy = h / grid.th;
    const rect = {x: Math.round(grid.base[0] * sx), y: Math.round(grid.base[1] * sy),
      w: Math.round(grid.size[0] * sx), h: Math.round(grid.size[1] * sy)};
    if (rect.w > 0 && rect.h > 0 && rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= w && rect.y + rect.h <= h)
      return {rects: [rect], source: 'static'};
  }
  if (w > h && w % h === 0) return {rects: Array.from({length: w / h}, (_, i) => ({x: i * h, y: 0, w: h, h})), source: 'strip'};
  if (h > w && h % w === 0) return {rects: Array.from({length: h / w}, (_, i) => ({x: 0, y: i * w, w, h: w})), source: 'strip'};
  return {rects: [{x: 0, y: 0, w, h}], source: 'whole'};
}

const assetRoot = path.join('mods', 'world-combat-core', 'src', 'main', 'resources', 'assets');
const coreRoot = path.join(assetRoot, 'world_combat_core');
fs.rmSync(path.join(coreRoot, 'particles', 'cobblemon'), {recursive: true, force: true});

const sources = [];
const index = [];
const stats = {flipbook: 0, static: 0, strip: 0, whole: 0, multiFrame: 0, unstitched: 0};
for (const texture of paths) {
  const [w, h] = textures[texture];
  const {rects, source} = frameRects(texture);
  stats[source]++;
  const whole = rects.length === 1 && rects[0].x === 0 && rects[0].y === 0 && rects[0].w === w && rects[0].h === h;
  let sprites;
  if (whole) {
    sprites = [`cobblemon:${texture}`];
  } else {
    sprites = rects.map((_, i) => `world_combat_core:cobblemon/${texture}/${i}`);
    sources.push({
      type: 'unstitch',
      resource: `cobblemon:particle/${texture}`,
      divisor_x: w,
      divisor_y: h,
      regions: rects.map((rect, i) => ({sprite: sprites[i], x: rect.x, y: rect.y, width: rect.w, height: rect.h}))
    });
    stats.unstitched++;
  }
  if (rects.length > 1) stats.multiFrame++;
  const file = path.join(coreRoot, 'particles', 'cobblemon', ...texture.split('/')) + '.json';
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify({textures: sprites}, null, 2) + '\n');
  index.push(`cobblemon/${texture} ${rects.length} ${rects[0].w}x${rects[0].h}`);
}

fs.mkdirSync(coreRoot, {recursive: true});
fs.writeFileSync(path.join(coreRoot, 'particle_types.txt'),
  '# <type path> <frames> <frame width>x<frame height>; type id is world_combat_core:<type path>\n' + index.join('\n') + '\n');
const atlasDir = path.join(assetRoot, 'minecraft', 'atlases');
fs.mkdirSync(atlasDir, {recursive: true});
fs.writeFileSync(path.join(atlasDir, 'particles.json'), JSON.stringify({sources}) + '\n');

console.log(`generate-particle-types: ${paths.length} types from ${jar}`);
console.log(`frame source: flipbook ${stats.flipbook}, static crop ${stats.static}, inferred strip ${stats.strip}, whole ${stats.whole}`);
console.log(`multi-frame types ${stats.multiFrame}; unstitch sources ${stats.unstitched}`);
