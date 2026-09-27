import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const context = vm.createContext({});
vm.runInContext(ts.transpileModule(fs.readFileSync('content/client/adapters/cobblemon-companion-ui.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None }
}).outputText, context);
const { hudLayout, hudSlot } = context.CobblemonCompanionUi;
for (const [width, height] of [[320,180],[427,240],[480,260],[640,360],[854,480],[1280,720]]) {
  for (const recalled of [false, true]) {
    const box = hudLayout(width, height, recalled);
    const bottom = box.top + 16 + box.cardsHeight + (box.cardsHeight ? 3 : 0) + box.hintHeight;
    assert(box.left >= 86, 'HUD reserves the native party rail');
    assert(box.left + box.width <= width - 8, 'HUD stays inside the screen');
    assert(bottom <= height - 56, 'HUD reserves native hotbar, health and armor');
    assert(box.left > width / 2 + 10 || box.top > height / 2 + 10, 'HUD does not cover the aiming crosshair');
    if (!recalled) {
      assert(box.cardWidth >= 60, 'Slots retain readable name and resource space at supported GUI sizes');
      assert.equal(4 / box.columns * box.columns, 4);
    } else assert.equal(box.cardsHeight, 0, 'A recalled companion has no inactive move card wall');
  }
}
const empty = hudSlot({id:'',remaining:-1,maximum:-1,cooldown:20});
assert(!empty.occupied); assert.equal(empty.remaining,null); assert.equal(empty.cooldown,0);
const free = hudSlot({id:'service:work',remaining:-1,maximum:-1});
assert(free.occupied); assert.equal(free.maximum,null); assert.equal(free.remaining,null); assert(!free.exhausted);
const cooling = hudSlot({id:'example:move',remaining:3,maximum:10,cooldown:31,available:true});
assert.equal(cooling.remaining,3); assert.equal(cooling.ratio,.3); assert.equal(cooling.cooldown,31);
const exhausted = hudSlot({id:'example:move',remaining:0,maximum:10,available:false});
assert(exhausted.exhausted); assert(exhausted.unavailable); assert.equal(exhausted.ratio,0);
assert.equal(hudSlot({id:'example:move',remaining:12,maximum:10}).ratio,1);
console.log('PASS companion HUD: six GUI sizes, native party/hotbar/crosshair clearance, recalled layout, empty and unlimited PP sentinels, cooldown and resource facts');
