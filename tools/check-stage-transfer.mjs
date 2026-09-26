import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const definitions=new Map(),handlers=new Map(),noop=()=>{};
const context=vm.createContext({WorldCombat:{on:noop,event:noop,phase:noop,
  effect:(id,_schema,_max,_life,normalize)=>definitions.set(id,normalize),effectHandler:(id,event,handler)=>handlers.set(id+'/'+event,handler)},
  CobblemonCombat:{pokemon:actor=>actor.pokemon,loadout:noop,statusLease:noop,statusRelease:noop}});
const sources=['content/protocols/effects.ts','content/behavior/contributions.ts','content/mechanisms/damage-semantics.ts','content/mechanisms/status-vocabulary.ts','content/mechanisms/combat-status.ts','content/traits/composition.ts','content/traits/ability-recipes.ts',
  ...['formula','combatant-stats','combat-stages','native-abilities','native-items','native-semantics','native-modifiers','native-effects','world-environment','native-loadout','pokemon-damage'].map(id=>'content/mechanisms/'+id+'.ts')];
vm.runInContext(ts.transpileModule(sources.map(path=>fs.readFileSync(path,'utf8')).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText,context);
const N=context.NativeEffects,C=context.CombatStages;
const actor=(id,native=true)=>({id,live:true,ability:'',domain:()=>native?'cobblemon':'minecraft',ref:()=>id,key:()=>id,
  pokemon:{ability:()=>actors.find(a=>a.id===id).ability,typeCount:()=>0,heldItem:()=>'',stat:()=>80}});
const a=actor('source'),b=actor('recipient'),ordinary=actor('ordinary',false),actors=[a,b,ordinary];
let serial=0,effects=[],blocked=false,onCommit=null,checks=0;
function view(record){const data=record.data;return {id:()=>record.id,data:()=>data,remaining:()=>record.ticks,source:()=>record.source,target:()=>record.target};}
function create(source,target,definition,data,ticks){const record={id:++serial,source,target,definition,data:definitions.get(definition)(data),ticks,live:true,caller:source,input:'{}'};
  effects.push(record);const effect={id:()=>record.id,source:()=>record.source,target:()=>record.target,caller:()=>record.caller,input:()=>record.input,
    world:()=>world(record.source),state(value){if(value!==undefined)record.data=definitions.get(definition)(value);return record.data;},
    remaining(value){if(value!==undefined)record.ticks=value;return record.ticks;},schedule:noop,
    reject:reason=>{throw Error(reason);},copyTo:(source,target,json,ticks)=>create(source,target,definition,json,ticks),end:()=>{record.live=false;}};
  record.effect=effect;handlers.get(definition+'/start')?.(effect);return record.id;}
function world(source){return {source:()=>source,tick:()=>1,valid:target=>!!target&&target.live,actor:ref=>actors.find(a=>a.live&&a.id===ref)||null,
  effects:(target,definition)=>effects.filter(e=>e.live&&e.target===target&&e.definition===definition).map(view),
  effect:(definition,target,data,ticks)=>create(source,target,definition,data,ticks),
  operation(id,operation,input){const record=effects.find(e=>e.live&&e.id===id),handler=record&&handlers.get(record.definition+'/operation:'+operation);if(!handler)return false;
    record.caller=source;record.input=input;handler(record.effect);return true;},
  compareEffectStates(json){const updates=JSON.parse(json).updates;assert.equal(new Set(updates.map(u=>u.id)).size,updates.length);
    const records=updates.map(u=>effects.find(e=>e.live&&e.id===u.id));
    if(blocked||updates.some((u,i)=>!records[i]||records[i].data!==u.expected))return false;
    const data=updates.map((u,i)=>definitions.get(records[i].definition)(u.data));records.forEach((e,i)=>e.data=data[i]);onCommit?.();return true;},
  attributeValue:()=>null,attribute:()=>true,mobEffect:()=>null};}
function base(target,stages){if(target.domain()==='cobblemon'){const state=N.empty();state.stages=stages;create(target,target,'cobblemon_world_combat:individual',JSON.stringify(state),1000);}
  else if(Object.keys(stages).length)create(target,target,C.definition,JSON.stringify({stages}),600);}
function reset(from={atk:3},to={atk:1},other={}){effects=[];blocked=false;onCommit=null;actors.forEach(a=>{a.live=true;a.ability='';});base(a,from);base(b,to);base(ordinary,other);}
function check(name,run){reset();run();assert(!effects.some(e=>e.live&&JSON.parse(e.data).pending),'No provisional state survives the operation');checks++;console.log('PASS '+name);}
const transfer=(from=a,to=b,amount=2,handoff=false)=>N.transferStage(world(a),from,to,'atk',amount,handoff);
check('persistent transfer publishes a complete two-party commit',()=>{onCommit=()=>{assert.equal(N.effectiveStage(world(a),a,'atk'),1);assert.equal(N.effectiveStage(world(a),b,'atk'),3);};
  assert.equal(transfer(),2);});
check('donor removal refusal leaves receiver unchanged',()=>{C.change.define({id:'fixture:deny',apply:p=>{if(p.reason==='transfer'&&p.actor===a)p.allowed=false;}});
  assert.equal(transfer(),0);assert.equal(N.effectiveStage(world(a),a,'atk'),3);assert.equal(N.effectiveStage(world(a),b,'atk'),1);C.change.remove('fixture:deny');});
check('partial receiver acceptance transfers exactly the conserved quantity',()=>{C.change.define({id:'fixture:partial',apply:p=>{if(p.reason==='transfer'&&p.actor===b)p.amount=1;}});
  assert.equal(transfer(),1);assert.equal(N.effectiveStage(world(a),a,'atk'),2);assert.equal(N.effectiveStage(world(a),b,'atk'),2);C.change.remove('fixture:partial');});
check('reversed recipient policy cannot mint an opposite contribution',()=>{C.change.define({id:'fixture:reverse',apply:p=>{if(p.reason==='transfer'&&p.actor===b)p.amount*=-1;}});
  assert.equal(transfer(),0);assert.equal(N.effectiveStage(world(a),a,'atk'),3);C.change.remove('fixture:reverse');});
check('failed host comparison destroys only newly prepared recipient state',()=>{blocked=true;assert.equal(transfer(a,ordinary,2,true),0);assert.equal(N.effectiveStage(world(a),a,'atk'),3);assert.equal(N.effectiveStage(world(a),ordinary,'atk'),0);});
check('a policy changing the observed donor snapshot prevents the transfer',()=>{C.change.define({id:'fixture:stale',apply:p=>{if(p.reason==='transfer'&&p.actor===b){const state=N.read(world(a),a);state.flags.changed=1;N.write(world(a),a,state);}}});
  assert.equal(transfer(),0);assert.equal(N.effectiveStage(world(a),b,'atk'),1);C.change.remove('fixture:stale');});
check('ordinary persistent replacement and explicit handoff retain existing stages',()=>{reset({atk:3},{},{atk:2,def:-1});assert.equal(transfer(a,ordinary,2,true),2);
  assert.equal(N.effectiveStage(world(a),ordinary,'atk'),4);assert.equal(N.effectiveStage(world(a),ordinary,'def'),-1);
  assert.equal(C.persistent(world(a),ordinary).source(),ordinary);a.live=false;assert.equal(N.effectiveStage(world(ordinary),ordinary,'atk'),4);});
check('temporary transfer preserves its original owner, clock and unrelated fields',()=>{reset({},{});const id=create(a,a,'cobblemon_world_combat:modifier',JSON.stringify({stages:{atk:3},types:['fire'],source:'fixture'}),80);
  assert.equal(transfer(a,b,2),2);const parent=effects.find(e=>e.id===id),received=effects.find(e=>e.live&&e.target===b&&e.definition==='cobblemon_world_combat:modifier');
  assert.equal(JSON.parse(parent.data).stages.atk,1);assert.deepEqual(JSON.parse(parent.data).types,['fire']);assert.equal(JSON.parse(received.data).owner.id,id);assert.equal(received.ticks,80);
  world(a).operation(id,'world_combat:dispel','{}');assert.equal(N.effectiveStage(world(a),b,'atk'),0);});
check('temporary donor refusal and recipient partial grant conserve windows',()=>{reset({},{});create(a,a,'cobblemon_world_combat:modifier',JSON.stringify({stages:{atk:3},source:'fixture'}),80);
  C.change.define({id:'fixture:deny-window',apply:p=>{if(p.reason==='transfer'&&p.actor===a)p.allowed=false;}});assert.equal(transfer(),0);C.change.remove('fixture:deny-window');
  C.change.define({id:'fixture:partial-window',apply:p=>{if(p.reason==='transfer'&&p.actor===b)p.amount=1;}});assert.equal(transfer(),1);assert.equal(N.effectiveStage(world(a),a,'atk'),2);assert.equal(N.effectiveStage(world(a),b,'atk'),1);C.change.remove('fixture:partial-window');});
check('handed-off temporary contribution survives donor departure in its recipient domain',()=>{reset({},{});create(a,a,'cobblemon_world_combat:modifier',JSON.stringify({stages:{atk:3},source:'fixture'}),80);
  assert.equal(transfer(a,ordinary,2,true),2);const window=effects.find(e=>e.live&&e.target===ordinary&&e.definition===C.windowDefinition);
  assert.equal(window.source,ordinary);assert.equal(JSON.parse(window.data).owner,undefined);assert.equal(window.ticks,80);a.live=false;assert.equal(N.effectiveStage(world(ordinary),ordinary,'atk'),2);});
check('native recipient rewrites are bounded by conserved source units',()=>{
  context.NativeAbilities.define('fixture_simple',{}, {boost:(_context,data)=>{data.amount*=2;}});b.ability='fixture_simple';
  assert.equal(transfer(),2);assert.equal(N.effectiveStage(world(a),a,'atk'),1);assert.equal(N.effectiveStage(world(a),b,'atk'),3);
});
check('negative persistent stages and temporary stages transfer with the same sign',()=>{
  reset({atk:-3},{atk:1});assert.equal(transfer(a,b,-2),2);assert.equal(N.effectiveStage(world(a),a,'atk'),-1);assert.equal(N.effectiveStage(world(a),b,'atk'),-1);
  reset({},{});create(a,a,'cobblemon_world_combat:modifier',JSON.stringify({stages:{atk:-3},source:'fixture'}),80);
  assert.equal(transfer(a,b,-2),2);assert.equal(N.effectiveStage(world(a),a,'atk'),-1);assert.equal(N.effectiveStage(world(a),b,'atk'),-2);
});
check('temporary CAS refusal removes its prepared adopted carrier',()=>{
  reset({},{});create(a,a,'cobblemon_world_combat:modifier',JSON.stringify({stages:{atk:3},source:'fixture'}),80);blocked=true;
  assert.equal(transfer(a,ordinary,2,true),0);assert.equal(N.effectiveStage(world(a),a,'atk'),3);assert.equal(N.effectiveStage(world(a),ordinary,'atk'),0);
});
console.log(`PASS stage transfer: ${checks} atomic conservation, policy refusal, stale snapshot and owned-lifetime scenarios`);
