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

// Native body-region fixtures: centres may be far outside a thin gameplay volume.
const ankleSweep = G.bodySector(point(0,.15,0), point(1,0,0), 3, 100, {below:.15,above:.5});
assert(ankleSweep.intersects(point(1,0,-.4),point(2,9,.4)), 'tall body feet intersect a low sweep');
assert(ankleSweep.intersects(point(1.5,0,-.1),point(6,2,.1)), 'asymmetric box side reaches in despite its distant centre');
assert(!ankleSweep.intersects(point(-3,0,-.2),point(-2,2,.2)), 'a box wholly behind the fan misses');
assert(!ankleSweep.intersects(point(1,2,-.3),point(2,4,.3)), 'an airborne box above the thin volume misses');
const bodyActors=['source','friend','foe'];
const bodyWorld={queryBox:(min,max,visible)=>{assert.equal(visible,false);return bodyActors;},
 observe:()=>({boundsMin:()=>point(1,0,-.3),boundsMax:()=>point(2,5,.3)})};
const bodyVisited=[];
assert.equal(G.selectBodies(bodyWorld,ankleSweep,actor=>bodyVisited.push(actor)),3);
assert.deepEqual(bodyVisited,bodyActors,'body geometry does not inject source or team policy');
const diagonal=G.bodyLane(point(0,.2,0),point(1,0,1),4,.3,{below:.2,above:.4});
assert(diagonal.intersects(point(1,0,1),point(1.3,3,1.3)));
assert(!diagonal.intersects(point(0,0,2),point(.3,3,2.3)));

const reach3D=G.bodySegment(point(0,3,0),point(4,.3,0),.2);
assert(reach3D.intersects(point(2,1,-.2),point(2.5,2.5,.2)), 'sloping segment crosses the real body box');
assert(!reach3D.intersects(point(2,5,-.2),point(2.5,6,.2)), 'separate high box misses the sloping segment');
const sphere=G.bodySphere(point(0,0,0),2);
assert(sphere.intersects(point(1.5,-1,-1),point(8,8,1)), 'sphere reaches the actual surface of a large body');
assert(!sphere.intersects(point(1.5,1.5,1.5),point(3,3,3)), 'box corner inside the covering cube still misses the sphere');
assert(sphere.intersects(point(2,0,0),point(3,1,1)), 'exact sphere surface is included');
const verticalFront=G.bodyFrustum(point(0,1,0),point(0,3,0),.5,2);
assert(verticalFront.intersects(point(-.2,2,-.2),point(.2,2.5,.2)),'A true vertical cone reaches upward');
assert(!verticalFront.intersects(point(0,-1,0),point(.2,.9,.2)),'The old horizontal band below this front misses');
assert(!verticalFront.intersects(point(3,2,3),point(4,2.5,4)),'The covering box does not replace the convex frontier');
const diagonalFront=G.bodyFrustum(point(1,1,1),point(3,3,3),.2,.8);
assert(diagonalFront.intersects(point(2,2,2),point(2.3,2.3,2.3)));
assert(!diagonalFront.intersects(point(1,3,1),point(1.2,3.2,1.2)),'Sloped cone tests its real orientation');
const tip=verticalFront.far[0];assert(verticalFront.intersects(tip,tip),'Exact frontier boundary contact is included');
assert(verticalFront.intersects(point(-.1,2,-.1),point(.1,20,.1)),'A large body can touch a cone through its near surface');
const prism=G.bodyPrism([point(0,0,-1),point(4,4,-1),point(4,4,1),point(0,0,1)],point(-1,1,0),.1);
assert(prism.intersects(point(1.9,1.9,-.1),point(2.1,2.1,.1)), 'tilted prism includes its actual plane');
assert(!prism.intersects(point(1.9,.1,-.1),point(2.1,.3,.1)), 'tilted prism excludes the old flat volume');
assert(!prism.intersects(point(-.2,4,-.1),point(.2,4.2,.1)), 'bounding box does not replace prism geometry');
const prismTip=point(4,4,1);assert(prism.intersects(prismTip,prismTip), 'prism endpoint contact is inclusive');
const verticalPrism=G.bodyPrism([point(0,0,0),point(0,4,-2),point(0,4,2)],point(1,0,0),.2);
assert(verticalPrism.intersects(point(-.1,3,-.5),point(.1,3.2,.5)), 'rotated vertical fan intersects');
assert(!verticalPrism.intersects(point(.3,3,-.5),point(.5,3.2,.5)), 'separation normal to the thin fan misses');
assert.throws(()=>G.bodyPrism([point(0,0,0),point(1,1,0),point(0,0,1)],point(0,1,0),.1), /coplanar/);
console.log('PASS geometry: point regions and native body volume intersections');
