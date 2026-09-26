import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const hooks=new Map(), handlers=new Map(), effects=[], cues=[]; let now=0, serial=0;
const context=vm.createContext({WorldCombat:{on:(id,topic,after,handler)=>hooks.set(id,{topic,handler}),effect(){},effectHandler:(id,event,handler)=>handlers.set(id+'/'+event,handler)},
  WorldFeedback:{onEffect:(world,id,key)=>cues.push({id,key})},EffectProtocols:{unchanged:x=>x},NativeSemantics:{encounterIdle:100},DamageSemantics:{read:data=>({attack:data.native===true})}});
vm.runInContext(ts.transpileModule(['content/behavior/contributions.ts','content/mechanisms/combat-encounters.ts'].map(file=>fs.readFileSync(file,'utf8')).join('\n'),
  {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText,context);
const actor=(id,team)=>({id,team,live:true,target:null,ref:()=>id+'/1',key:()=>id+'/1'});
const a=actor('a','friends'),b=actor('b','foes'),c=actor('c','friends'),d=actor('d','elsewhere'),actors=[a,b,c,d];
function scope(source){return {source:()=>source,tick:()=>now,valid:target=>!!target&&target.live,
  actor:ref=>actors.find(value=>value.ref()===ref&&value.live)||null,friendly:target=>target.team===source.team,
  observe:target=>target.live?{attacking:()=>target.target,position:()=>({})}:null,
  effects:(target,definition)=>effects.filter(effect=>effect.live&&effect.target()===target&&effect.definition===definition).map(effect=>({id:effect.id,data:effect.state})),
  effect(definition,target,data){const timers=new Map();let json=data;const id=++serial;
    const effect={definition,live:true,id:()=>id,target:()=>target,source:()=>source,caller:()=>source,world:()=>scope(source),input:()=>'{}',state(value){if(value!==undefined)json=value;return json;},
      remaining(){return 1200000;},end(){effect.live=false;timers.clear();},schedule:(key,handler,ticks,input)=>timers.set(key,{handler,at:now+ticks,input}),timers};
    effects.push(effect);handlers.get(definition+'/start')?.(effect);return id;},
  operation(id,operation,input){const effect=effects.find(value=>value.live&&value.id()===id);if(!effect)return false;
    effect.input=()=>input;handlers.get(effect.definition+'/operation:'+operation)(effect);return true;}};}
function event(topic,source,target=null,data={}){for(const item of hooks.values())if(item.topic===topic)item.handler({world:()=>scope(source),actor:()=>source,target:()=>target,data:()=>JSON.stringify(data)});}
function advance(ticks){for(let i=0;i<ticks;i++){now++;for(const effect of [...effects])for(const [key,timer] of [...effect.timers])if(effect.live&&timer.at<=now){effect.timers.delete(key);effect.input=()=>timer.input;handlers.get(effect.definition+'/'+timer.handler)(effect);}}}
actors.forEach(value=>event('world_combat:actor_bound',value));
const C=context.CombatEncounters;
assert(C.first(scope(a),a));event('world_combat:committed',a,a);assert(!C.first(scope(a),a),'A self support action spends the entry action too');
a.target=b;b.target=a;advance(240);assert(!C.first(scope(a),a),'A live hostile targeting relation cannot refresh just by waiting');
a.target=null;b.target=null;advance(140);assert(C.first(scope(a),a),'A genuinely idle disengagement opens the next entry');
event('world_combat:damage_incoming',a,b,{native:true});assert(!C.first(scope(a),a),'An ordinary native attack spends the same opening');
assert(C.first(scope(b),b),'Receiving a hit is not an action by the defender');
event('world_combat:actor_died',a,c,{deathId:'death:1',identity:'friend:c',entity:'c',tick:now,sourceEntity:'b',attackingEntity:'',lastAttackerEntity:'',friendly:true,self:false});
assert.equal(C.fallen(scope(a),a),1);
event('world_combat:actor_died',a,c,{deathId:'death:1',identity:'friend:c',entity:'c',tick:now,sourceEntity:'b',friendly:true,self:false});
assert.equal(C.fallen(scope(a),a),1,'A repeated final death has one record');
event('world_combat:actor_died',a,c,{deathId:'death:2',identity:'friend:c',entity:'c',tick:now,sourceEntity:'d',friendly:true,self:false});
assert.equal(C.fallen(scope(a),a),1,'Same-dimension friendship alone does not prove participation');
event('world_combat:actor_died',a,c,{deathId:'death:3',identity:'friend:c',entity:'c',tick:now,sourceEntity:'b',friendly:true,self:false});
assert.equal(C.fallen(scope(a),a),2,'A confirmed revival and new death counts again, with its new host death id');
advance(140);assert.equal(C.fallen(scope(a),a),0,'A later encounter does not inherit old fallen members');
console.log('PASS encounters: first action, native attack, real hostile continuity, disengagement, related final deaths, duplicates and revival');

C.cue({world:scope(a),actor:a},'entry','neutral:scene',true);const cueId=cues.at(-1).id;
C.cue({world:scope(a),actor:a},'entry','neutral:scene',true);assert.equal(cues.at(-1).id,cueId,'Refreshing a cue retains its owner');
C.cue({world:scope(a),actor:a},'entry','neutral:scene',false);assert(!effects.find(value=>value.id()===cueId).live,'Consumed entry ends the cue owner');
C.cue({world:scope(a),actor:a},'entry','neutral:scene',true);assert.notEqual(cues.at(-1).id,cueId,'A later opening starts a new presentation lifecycle');
console.log('PASS encounters: actor-owned opening cues renew, end and restart independently');
