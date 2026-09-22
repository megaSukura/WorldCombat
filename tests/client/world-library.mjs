import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

// An independent machinery consumer proves channels/layout do not require any creature or skill package.
let now=0, world={}, resets=0; const worlds={},cleanup={},draws=[],billboards=[],errors=[];
const context=vm.createContext({UiSurfaces:{rect(){}},Java:{loadClass:()=>({reportFailure:(id,message)=>errors.push({id,message})})},
  WorldCombatClient:{world:(id,_version,fn)=>worlds[id]=fn,cleanup:(id,fn)=>cleanup[id]=fn}});
for(const file of ['ui-state','world-surfaces'])vm.runInContext(ts.transpileModule(fs.readFileSync(`content/client/library/${file}.ts`,'utf8'),
  {compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText,context);
const api=context.WorldSurfaces;
api.row('workshop:pressure',12,({frame,row})=>frame.text('Pressure '+row.value,0,0,0xffffffff,160));
const layer=new api.Layer({id:'workshop:pump',clock:()=>now,world:()=>world,reset:()=>resets++,project:(actor,data)=>({actor,rows:[
  {kind:'text',text:data.name},{kind:'workshop:pressure',value:data.pressure},{kind:'meter',value:data.pressure/100}],selected:true})});
const surface={text:(text)=>draws.push(text),textWidth:text=>text.length*8,wrappedText:(text,_x,_y,_color,width,lines)=>{assert(width<=190&&lines===3);draws.push(text);}};
const frame={anchor:id=>JSON.stringify(id==='pump'?{x:2,y:3,z:4,height:1.5,distance:8}:null),distance:()=>8,
  billboard(...args){billboards.push(args.slice(0,-1));args.at(-1)(surface);}};
layer.card('identity',{actor:'pump',data:{name:'Irrigation pump'}},80);
layer.card('pressure',{actor:'pump',data:{pressure:42}},80);
worlds['workshop:pump'](frame);
assert.equal(draws.filter(value=>value==='Irrigation pump').length,1,'Independent data sources compose one card');
assert(draws.includes('Pressure 42'));
layer.removeCard('identity');layer.removeCard('pressure');draws.length=0;billboards.length=0;
let renderedEffects=0;const bus=new api.Results(()=>now);
bus.listen('broken-optics',()=>{throw Error('Fixture optics failed');});
bus.listen('particles',()=>renderedEffects++);
bus.listen('text',event=>layer.float(event.key,{start:now,duration:40,actor:'pump',position:[2,3,4],mergeKey:'pressure',amount:event.amount,
  format:value=>'Pressure +'+value.amount+' ×'+value.count}));
bus.publish('receipt1',{key:'receipt1',amount:2},50);bus.publish('receipt1',{key:'receipt1',amount:2},50);
bus.publish('receipt2',{key:'receipt2',amount:3},50);worlds['workshop:pump'](frame);
assert.equal(renderedEffects,2,'Each immutable result fans out once despite a failed channel');
assert.equal(errors.length,2);assert.equal(draws.filter(value=>value==='Pressure +5 ×2').length,1,'Small repeated results aggregate without losing their sum');
assert(billboards[0][3]>=.018,'World text uses distance-aware readable scale');
for(let index=0;index<65;index++)layer.float('noise/'+index,{start:now,duration:40,actor:'pump',position:[2,3,4],text:'ordinary/'+index});
layer.float('critical',{start:now,duration:60,priority:3,actor:'pump',position:[2,3,4],text:'Safety valve opened'});
draws.length=0;worlds['workshop:pump'](frame);
assert.equal(draws.length,48);assert(draws.includes('Safety valve opened'),'A critical result survives a saturated ordinary queue');
assert.equal(layer.float('critical',{start:now,duration:60,text:'duplicate'}),false);
now=41;draws.length=0;worlds['workshop:pump'](frame);assert.deepEqual(draws,['Safety valve opened']);
now=61;draws.length=0;worlds['workshop:pump'](frame);assert.equal(draws.length,0);
layer.float('last-position',{start:now,duration:40,actor:'gone',position:[2,3,4],text:'Completed after removal'});
worlds['workshop:pump'](frame);assert(draws.includes('Completed after removal'),'A result snapshot does not require a surviving world actor');
layer.overlay({point:[3,4,5],rows:[{kind:'text',text:'Outlet location'}]});draws.length=0;worlds['workshop:pump'](frame);assert(draws.includes('Outlet location'));
world={};now=0;draws.length=0;worlds['workshop:pump'](frame);assert.equal(draws.length,0);assert(resets>=2);
cleanup['workshop:pump']();bus.clear();
console.log('PASS independent world results: machinery cards, channel isolation, dedupe, aggregation, priority, expiry, last-position snapshots, targeting and world cleanup');
