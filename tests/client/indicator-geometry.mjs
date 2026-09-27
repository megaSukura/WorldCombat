import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const context=vm.createContext({});
vm.runInContext(ts.transpileModule(fs.readFileSync('content/client/library/indicator-geometry.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES5}}).outputText,context);
function draw(data){const lines=[];context.IndicatorGeometry.draw({data:()=>JSON.stringify({position:[0,3,0]}),line:(...values)=>lines.push(values)},data);return lines;}
for(const direction of [[0,1,0],[0,-1,0],[.4,.8,.6]]){
 const ground=draw({geometry:'cone',radius:4,spread:60,orientation:'ground',direction});
 assert(ground.every(line=>Math.abs(line[1]-3)<1e-9&&Math.abs(line[4]-3)<1e-9),'ground preview stays at one height');
 const aim=draw({geometry:'cone',radius:4,spread:60,direction});
 const left=aim[0].slice(3,6).map((v,i)=>v-(i===1?3:0)),right=aim[1].slice(3,6).map((v,i)=>v-(i===1?3:0));
 assert(Math.abs(Math.hypot(...left)-4)<1e-9&&Math.abs(Math.hypot(...right)-4)<1e-9,'pitched edges retain real reach');
 assert(Math.abs(left.reduce((v,n,i)=>v+n*right[i],0)/16-.5)<1e-9,'vertical and pitched previews retain the authored opening');
}
console.log('PASS indicator geometry: horizontal projection and stable pitched opening');
