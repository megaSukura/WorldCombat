import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const handlers=new Map(), phases=[];let carrier=true, blocked=false, live=true, factor=1, owned=null, after=0;
const point=(x,y,z)=>({x:()=>x,y:()=>y,z:()=>z,plus:v=>point(x+v.x(),y+v.y(),z+v.z()),minus:v=>point(x-v.x(),y-v.y(),z-v.z())});
const actor={key:()=>'body'};
const world={valid:()=>live,observe:()=>live?{width:()=>2*factor,height:()=>4*factor,position:()=>point(0,2*factor,0)}:null,
  effects:()=>owned?[{data:owned.state}]:[],attributeValue:(_actor,_id,exclude)=>({value:()=>exclude?2:2*factor}),
  attribute:(_actor,_id,value)=>{factor=1+value;return true;},freeSpace:()=>!blocked,clear:()=>true,
  effect:(_def,_actor,data)=>{let state=data;owned={target:()=>actor,world:()=>world,id:()=>1,state(value){if(value!==undefined)state=value;return state;},
    schedule:(_key,_handler,ticks)=>{after=ticks;},remaining(){},end(){factor=1;owned=null;}};handlers.get('start')(owned);return 1;}};
const context=vm.createContext({WorldCombat:{point,effect(){},effectHandler:(_def,event,fn)=>handlers.set(event,fn)},
  MobEffects:{anchor:()=>({id:'neutral:carrier',key:'one'}),matches:()=>carrier},LivingActions:{freeSpot:()=>null}});
vm.runInContext(ts.transpileModule(['content/behavior/contributions.ts','content/mechanisms/body-scale.ts'].map(file=>fs.readFileSync(file,'utf8')).join('\n'),
  {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText,context);
const B=context.BodyScale;B.changes.define({id:'neutral:observe',apply:view=>phases.push(view.phase)});
assert(B.shrink(world,actor,.5,{},'neutral'));assert.equal(factor,.5);assert(B.pending(world,actor,'neutral'));
assert(!B.shrink(world,actor,.5,{},'neutral'),'A second grant cannot stack over a pending restoration');
carrier=false;blocked=true;handlers.get('restore')(owned);
assert.equal(factor,.5);assert(owned,'A sealed pocket retains an owned restoration task');assert.equal(after,20,'Blocked searches use a low-frequency retry');
assert.deepEqual(phases,['active','waiting']);handlers.get('restore')(owned);assert.deepEqual(phases,['active','waiting'],'Waiting feedback does not spam each retry');
blocked=false;handlers.get('restore')(owned);assert.equal(factor,1);assert.equal(owned,null);assert.deepEqual(phases,['active','waiting','restored']);
carrier=true;B.shrink(world,actor,.5,{},'neutral');live=false;handlers.get('restore')(owned);assert.equal(owned,null);assert.equal(factor,1,'Actor lifecycle releases its only owned native contribution');
console.log('PASS body scale: owned shrink, single pending window, sealed restoration state, low-frequency retry, safe restoration and departure cleanup');
