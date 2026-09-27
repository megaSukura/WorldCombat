import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
function point(x,y,z) { return {x:()=>x,y:()=>y,z:()=>z,plus:b=>point(x+b.x(),y+b.y(),z+b.z()),minus:b=>point(x-b.x(),y-b.y(),z-b.z()),scale:s=>point(x*s,y*s,z*s),length:()=>Math.hypot(x,y,z),unit:()=>point(x/Math.hypot(x,y,z),y/Math.hypot(x,y,z),z/Math.hypot(x,y,z))}; }
const scope=vm.createContext({WorldCombat:{point,on(){}},CombatContext:class {}});
vm.runInContext(ts.transpileModule(fs.readFileSync('content/mechanisms/living-actions.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,scope);
const L=scope.LivingActions,origin=point(0,1,0);
let count=0;
for(const target of [point(6,1,0),point(6,4,2),point(3,-4,-2),point(0,5,0),point(0,-5,0)]) {
 const solutions=L.ballisticSolutions(origin,target,.85,.05,160);
 assert.equal(solutions.length,2);
 assert(solutions[0].ticks<solutions[1].ticks);
 for(const s of solutions) {
  // Independent native tick recurrence, including the partial segment that crosses the target.
  let at=origin,v=s.direction.scale(.85),t=0,length=0;
  while(t<s.ticks) {const step=v.scale(Math.min(1,s.ticks-t)); at=at.plus(step);length+=step.length();v=point(v.x()*.99,v.y()*.99-.05,v.z()*.99);t++;}
  assert(at.minus(target).length()<1e-6);assert(Math.abs(length-s.length)<1e-8);
  assert(s.points[s.points.length-1].minus(target).length()<1e-6);count++;
 }
 const lowOnly=L.ballisticSolutions(origin,target,.85,.05,(solutions[0].ticks+solutions[1].ticks)/2);
 assert.equal(lowOnly.length,1); assert(Math.abs(lowOnly[0].ticks-solutions[0].ticks)<1e-5);
 assert.equal(L.ballisticSolutions(origin,target,.85,.05,solutions[0].ticks*.8).length,0);
}
assert.equal(L.ballisticSolutions(origin,point(100,1,0),.4,.05,160).length,0);
assert.throws(()=>L.ballisticSolutions(origin,point(2,1,0),.8,.05,Infinity));
console.log(`PASS ballistic native recurrence: ${count} arcs, bounded lifetimes and unreachable target`);
