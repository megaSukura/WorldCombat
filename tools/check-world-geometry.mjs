import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../content/mechanisms/world-geometry.ts', import.meta.url), 'utf8');
function point(x, y, z) {
  return { x: () => x, y: () => y, z: () => z,
    plus: b => point(x + b.x(), y + b.y(), z + b.z()),
    minus: b => point(x - b.x(), y - b.y(), z - b.z()),
    scale: s => point(x * s, y * s, z * s),
    length: () => Math.hypot(x, y, z),
    unit: () => point(x / Math.hypot(x,y,z), y / Math.hypot(x,y,z), z / Math.hypot(x,y,z)) };
}
const context = vm.createContext({ WorldCombat: { point } });
vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES5 } }).outputText, context);
const G = context.WorldGeometry, origin = point(0, 0, 0), vertical = { below: 4, above: 1 };
const regions = [G.sector(origin, point(1,0,0), 3, 90, vertical), G.lane(origin, point(1,0,0), 3, 2, vertical),
  G.box(origin, point(1,0,0), point(2,0,3), vertical), G.ring(origin, 1, 3, vertical),
  G.polygon([point(0,0,0),point(3,0,0),point(0,0,3)], vertical)];
for (const region of regions) {
  for (let x = -4; x <= 4; x += .5) for (let y = -4; y <= 1; y += .5) for (let z = -4; z <= 4; z += .5) {
    const sample = point(x,y,z);
    if (region.contains(sample)) assert(sample.minus(region.centre()).length() <= region.radius() + 1e-9, 'covering sphere encloses region');
  }
}
const actors = ['a','b','c'];
const world = { query: () => actors, observe: actor => ({position: () => point(0,1,0), height: () => 2, friendly: () => actor === 'b'}) };
const footBand = {contains: p => p.y() === 0, centre: () => origin, radius: () => 4};
const visited = [];
assert.equal(G.select(world, footBand, actor => visited.push(actor)), 3, 'centre observation samples the feet below it');
assert.deepEqual(visited, actors);
const selected = [];
assert.equal(G.selectEnemies(world, footBand, actor => selected.push(actor)), 2, 'non-friendly count matches visits');
assert.deepEqual(selected, ['a','c']);
assert.equal(G.select(world, {...footBand, contains: p => p.y() > 2}, () => assert.fail('above head')), 0, 'no sample above head');
assert.throws(() => G.polygon([]), /three vertices/);
const half = G.sector(origin, point(1,0,0), 3, 180);
assert(half.contains(point(0,0,2)) && half.contains(point(0,0,-2)));
assert(!half.contains(point(-2,0,0)));
const wide = G.sector(origin, point(1,0,0), 3, 270);
assert(wide.contains(point(-1,0,1)) && wide.contains(point(-1,0,-1)));
assert(!wide.contains(point(-2,0,0)));
assert(G.sector(origin, point(1,0,0), 3, 360).contains(point(-2,0,0)));
assert(!G.sector(origin, point(1,0,0), 3, 360).contains(point(4,0,0)));
const outline = [[0,0],[5,0],[5,4],[4,4],[4,1],[1,1],[1,4],[0,4]];
const vertices = outline.map(([x,z]) => point(x,0,z)), reversed = vertices.slice().reverse();
for (let x = 0; x <= 5; x += .25) for (let z = 0; z <= 4; z += .25) {
  const inside = z <= 1 || x <= 1 || x >= 4;
  assert.equal(G.insidePolygon(x,z,vertices), inside);
  assert.equal(G.insidePolygon(x,z,reversed), inside);
}
assert.equal(G.insidePolygon(1,1,[point(0,0,0),point(1,0,1),point(2,0,2)]), false);
assert.equal(G.insidePolygon(NaN,0,vertices), false);
const translated = vertices.map(p => p.plus(point(30000000,0,-30000000)));
assert(G.insidePolygon(30000005,-29999998,translated));
const polygon = G.polygon(vertices);
vertices[0] = point(50,0,50);
assert(polygon.contains(origin), 'region snapshots its input vertex array');
assert.deepEqual(Array.from(G.along(origin,point(5,0,0),2), p => p.x()), [0,2,4,5]);
assert.deepEqual(Array.from(G.along(origin,point(4,0,0),2), p => p.x()), [0,2,4]);
assert.deepEqual(Array.from(G.along(origin,point(1e-7,0,0),2), p => p.x()), [0,1e-7]);
const filtered = [], availableWorld = {
  query: (_point,_radius,visibleOnly) => { assert.equal(visibleOnly,false); return ['a','b','c','d']; },
  observe: actor => actor === 'c' ? null : {position: () => point(0,1,0), height: () => 2,
    friendly: () => actor === 'd', visible: () => actor !== 'b'},
};
assert.equal(G.select(availableWorld, footBand, (actor, facts) => {
  if (facts.visible() && !facts.friendly()) filtered.push(actor);
}), 3);
assert.deepEqual(filtered, ['a']);
assert.equal(G.selectEnemies(availableWorld, footBand, () => {}), 2);
console.log('PASS geometry: covering spheres, centred body samples, predicate composition and filtered visit counts');
