import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { loadContentManifest, resolvePackages } from './content-manifest.mjs';

const production = loadContentManifest();
const fixtures = loadContentManifest('tests/content/packs.json', process.cwd(), production);
const selection = resolvePackages(fixtures, fixtures.profiles['open-content']);
assert(selection.includes('checks:observations') && selection.includes('checks:surveyor'));
assert(!selection.some(id => production.packages[id]?.unit?.startsWith('content/skills/')));
assert(!selection.includes('world_combat:default_companion'));
const isolated = resolvePackages(fixtures,['world_combat_checks:ability/fixture_a']);
assert.equal(isolated.filter(id=>id.startsWith('world_combat_checks:ability/')).length,1);
assert(!isolated.includes('world_combat:companions'));
assert.throws(()=>resolvePackages({packages:{a:{version:'1',requires:{b:'1'}},b:{version:'1',requires:{a:'1'}}}},['a']),/cycle/);
assert.throws(()=>resolvePackages({packages:{a:{version:'1',requires:{b:'2'}},b:{version:'1'}}},['a']),/requires/);
assert.throws(()=>resolvePackages({packages:{a:{version:'1',conflicts:['b']},b:{version:'1'}}},['a','b']),/conflicts/);
assert.deepEqual(resolvePackages({packages:{a:{version:'1',after:['b']},b:{version:'1'}}},['a']),['a']);
assert.deepEqual(resolvePackages({packages:{a:{version:'1',after:['b']},b:{version:'1'}}},['a','b']),['b','a']);
const artifact='build/test-content/profiles/open-content';
assert(fs.existsSync(artifact+'/data/checks/tags/item/survey_tools.json'));
assert(fs.existsSync(artifact+'/assets/checks/models/item/survey_lens.json'));
let registeredItem='',maximumStack=0;
vm.runInNewContext(fs.readFileSync(artifact+'/startup.js','utf8'),{StartupEvents:{registry(type,callback){
  assert.equal(type,'item');callback({create(id){registeredItem=id;return {displayName(){return this;},maxStackSize(value){maximumStack=value;return this;}};}});
}}});
assert.equal(registeredItem,'checks:survey_lens');assert.equal(maximumStack,1);

const callbacks={},actions=[],traits={ability:'checks:curiosity'}, hooks=new Map(), effectDefinitions=new Map(), effectHandlers=new Map(), noop=()=>{};
const context=vm.createContext({
  WorldCombat:new Proxy({point:(x,y,z)=>point(x,y,z),on(_id,event,_after,callback){
    if(!hooks.has(event))hooks.set(event,[]);hooks.get(event).push(callback);
  },effect(id,_version,_ticks,_lifetime,normalize){effectDefinitions.set(id,normalize);},
  effectHandler(id,event,callback){effectHandlers.set(id+'/'+event,callback);}
  },{get:(value,key)=>value[key]||noop}),
  CobblemonCombat:new Proxy({
    tactics(fn){assert(!callbacks.tactics);callbacks.tactics=fn;}, growth(fn){assert(!callbacks.growth);callbacks.growth=fn;}, capture(fn){assert(!callbacks.capture);callbacks.capture=fn;},
    registerAction(id){actions.push(id);},pokemon(){return pokemon;},data(){return null;},moveTemplate(){throw Error('Skill-free fixture requested a move template');}
  },{get:(value,key)=>value[key]||noop})
});
// Run current shared/fixture source in memory; generated startup/assets/data are checked separately above.
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const compiler = ts.convertCompilerOptionsFromJson(config.config.compilerOptions, process.cwd()).options;
const program = ts.createProgram(['sdk/core/index.d.ts', 'sdk/core/world.d.ts', 'sdk/cobblemon/index.d.ts',
  ...selection.flatMap(id => fixtures.packages[id].sources)], { ...compiler, outFile: 'composition-check.js' });
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => process.cwd(), getCanonicalFileName: value => value, getNewLine: () => '\n'
}));
let script = '';
assert.equal(program.emit(undefined, (name, text) => { if (name.endsWith('.js')) script = text; }).emitSkipped, false);
vm.runInContext(script,context);
assert.equal(actions.length,0);assert.equal(Object.keys(context.CompanionRepertoire.catalogue.skills).length,0);assert.equal(context.PokemonSkills,undefined);
let now=10,lens=true;
const self={ref:()=> 'surveyor/1',domain:()=> 'cobblemon',key:()=> 'surveyor'},owner={ref:()=> 'owner/1',domain:()=> 'minecraft',key:()=> 'owner'};
function point(x,y,z){return {x:()=>x,y:()=>y,z:()=>z,minus:p=>point(x-p.x(),y-p.y(),z-p.z()),plus:p=>point(x+p.x(),y+p.y(),z+p.z()),length:()=>Math.hypot(x,y,z),scale:n=>point(x*n,y*n,z*n),unit:()=>{const length=Math.hypot(x,y,z)||1;return point(x/length,y/length,z/length);}};}
const pokemon={id:()=> 'individual',species:()=> 'cobblemon:porygon',moveSlots:()=>0,nature:()=> 'docile',ability:()=>traits.ability,
  level:()=>15,status:()=>'',owner:()=>owner.key(),wild:()=>false,aiEnabled:()=>true,form:()=> 'base',gender:()=> 'genderless',aspects:()=> '[]',
  typeCount:()=>1,type:()=> 'normal',move:()=>null,health:()=>20,maxHealth:()=>20,
  heldItem:()=>'',attribute:()=>({base:()=>0,value:()=>0,modifiers:()=> '[]'}),stat:()=>50,friendship:()=>70,vehicle:()=>false,passenger:()=>false};
function observation(actor){return {actor:()=>actor,position:()=>point(0,0,0),health:()=>20,maxHealth:()=>20,movementSpeed:()=>.3,
  velocity:()=>point(0,0,0),wet:()=>false,width:()=>.9,height:()=>1.4,tags:()=>'',
  visible:()=>true,friendly:()=>true,hostile:()=>false,player:()=>actor===owner,grounded:()=>true,attacking:()=>null,lastAttacker:()=>null,hurtAgo:()=>100};}
const coordinates=value=>[value.x(),value.y(),value.z()];
const effectRecords=new Map();let nextEffect=0,nextAction=0;
const world={source:()=>self,tick:()=>now,valid:actor=>actor===self||actor===owner,friendly:actor=>actor===self||actor===owner,
  observe:observation,query:()=>[owner],mobEffect:()=>null,mobEffects:()=>[],originInstance:()=>'',
  originData(_key,value){assert.equal(value,undefined,'An unattributed scope cannot write execution state');return null;},
  effects(actor,definition){return [...effectRecords.values()].filter(record=>record.target===actor&&(!definition||record.definition===definition))
    .map(record=>({id:()=>record.id,data:()=>record.data,source:()=>record.source,target:()=>record.target}));},
  effect(definition,target,data,ticks){
    const normalize=effectDefinitions.get(definition);assert(normalize,'Missing registered effect '+definition);
    const record={id:++nextEffect,definition,target,source:this.source(),world:this,data:normalize(data),ticks,timers:new Map()};
    effectRecords.set(record.id,record);effectHandlers.get(definition+'/start')?.(effectContext(record));return record.id;
  },
  operation(id,operation,input){const record=effectRecords.get(id),handler=record&&effectHandlers.get(record.definition+'/operation:'+operation);
    if(!handler)return false;handler(effectContext(record,input,this.source()));return true;},
  survey:(centre,radius,visible)=>JSON.stringify(world.query(centre,radius,visible).map(actor=>{const o=observation(actor);return {ref:actor.ref(),domain:actor.domain(),point:coordinates(o.position()),velocity:coordinates(o.velocity()),health:o.health(),maximum:o.maxHealth(),speed:o.movementSpeed(),visible:o.visible(),friendly:o.friendly(),hostile:o.hostile(),player:o.player(),wet:o.wet(),grounded:o.grounded(),attacking:'',lastAttacker:'',hurtAgo:o.hurtAgo(),width:o.width(),height:o.height(),tags:o.tags(),effects:[],mobEffects:[],facts:{}};})),
  actor:ref=>ref===owner.ref()?owner:ref===self.ref()?self:null,environment:()=>'{"day":true,"sky":true,"rain":false,"thunder":false}',
  equipment:()=>lens?[{item:()=> 'checks:survey_lens',provider:()=> 'curios'}]:[],busy:()=>false,claimed:()=>false,readiness:()=>'',actions:()=>[]};
function effectContext(record,input='{}',caller=record.source){return {
  id:()=>record.id,world:()=>record.world,source:()=>record.source,target:()=>record.target,caller:()=>caller,input:()=>input,
  state(value){if(value!==undefined)record.data=effectDefinitions.get(record.definition)(value);return record.data;},
  remaining(value){if(value!==undefined)record.ticks=value;return record.ticks;},end(){effectRecords.delete(record.id);},
  schedule(key,handler,ticks,data){record.timers.set(key,{handler,at:now+ticks,data});}
};}
function committedEvent(content,target){
  const id=++nextAction,origin=new Map(),local=new Map(),scope=Object.create(world),token='checks:execution/'+id;
  function jsonState(store,key,value){if(value!==undefined)store.set(key,JSON.stringify(JSON.parse(value)));return store.get(key)??null;}
  scope.originInstance=()=>token;scope.originData=(key,value)=>jsonState(origin,key,value);
  const action={id:()=>id,actor:()=>self,target:()=>target,content:()=>content,argument:()=>null,world:()=>scope,sense:()=>scope,
    data:(key,value)=>jsonState(local,key,value)};
  return {actor:()=>self,target:()=>target,world:()=>scope,action:()=>action,data:()=> '{}'};
}
assert(context.CompanionBehavior.supports(pokemon),'A matching individual can act without an implemented move');
assert(!context.CompanionBehavior.supports({...pokemon,species:()=> 'cobblemon:eevee'}));
function sample(){
  const frame=context.CompanionBehavior.frame(world,pokemon,'autonomous',point(0,0,0),owner,null,null,16,'',()=>false,noop);
  const result=context.CompanionBehavior.runWild(frame);now+=4;return result;
}
assert.equal(sample().state,'succeeded');assert.equal(context.CheckObservations.events.at(-1).radius,12);
lens=false;assert.equal(sample().state,'succeeded');assert.equal(context.CheckObservations.events.at(-1).radius,4);
traits.ability='';assert.equal(sample().state,'succeeded');assert.equal(context.CheckObservations.events.at(-1).radius,2);

// Exercise the shipped companion library with content-owned timing, rather than a move recipe.
for (const purpose of ['prepare','fortify','reveal','attack']) {
  const ai=context.CompanionBehavior,protocol='world_combat:'+purpose,move='checks_timing_'+purpose;
  const memory={},casts=[],body={ref:self.ref(),point:[0,0,0],health:20,maximum:20,attacking:'',hurtAgo:1000};
  const item={id:move,protocols:[protocol],data:{use:move,move,kind:'self',range:1,
    pp:12,maxPp:30,available:true,ready:true,config:{enabled:true,reserve:1,interval:12}}};
  const facts={self:body,nearby:[],owner:null,busy:false,managed:false,effectActive:false};
  ai.registerUse(move,{protocols:[protocol],
    available:(frame,capability)=>capability.data.config.enabled && capability.data.pp>=capability.data.config.reserve
      && !ai.recent(frame,'move',move,capability.data.config.interval),
    ready:(frame,capability)=>capability.data.ready && !frame.facts.effectActive});
  function attempt() {
    const input={actor:self.ref(),tick:now,facts,capabilities:[item],memory,scratch:{},active:null,
      services:{world,report:noop,behavior:{use(capability,target){
        assert.equal(capability.id,item.id);assert.equal(target.ref,body.ref);
        casts.push(now);capability.data.pp--;capability.data.available=capability.data.pp>0;
        const event=committedEvent('world_combat:'+move,self);
        for(const callback of hooks.get('world_combat:committed')||[])callback(event);
        assert.equal(context.CombatEncounters.first(event.world(),self),false,'The registered commit observer must consume the encounter opening');
        return true;
      }}}};
    const candidates=ai.ready(input,protocol,body);
    if(candidates.length)ai.tasks.perform(input,candidates[0].id,purpose,body,{});
    return casts.length;
  }
  now=2000;
  assert.equal(attempt(),1,purpose+': the author allows a peacetime cast');
  now++;
  assert.equal(attempt(),1,purpose+': the author can defer repetition');
  now=2012;
  assert.equal(attempt(),2,purpose+': the author permits repetition before one minute');
  now+=12;item.data.pp=1;
  assert.equal(attempt(),3,purpose+': the author can spend the last PP');
  now+=12;item.data.pp=1;item.data.available=true;item.data.config.reserve=2;
  assert.equal(attempt(),3,purpose+': the author can reserve PP');
  item.data.config.reserve=1;item.data.config.enabled=false;
  assert.equal(attempt(),3,purpose+': the author can decline the situation');
  item.data.config.enabled=true;facts.effectActive=true;
  assert.equal(attempt(),3,purpose+': the author can wait for an existing effect to finish');
  facts.effectActive=false;item.data.ready=false;
  assert.equal(attempt(),3,purpose+': action readiness still participates in selection');
  facts.busy=true;
  assert.equal(attempt(),3,purpose+': conflicting work is exposed through action-specific readiness');
  facts.busy=false;item.data.ready=true;item.data.pp=0;item.data.available=false;item.data.config.reserve=0;
  assert.equal(attempt(),3,purpose+': unavailable native actions cannot be selected');
  item.data.pp=1;item.data.available=true;
  assert.equal(attempt(),4,purpose+': fresh availability is honored');
  assert.deepEqual(casts,[2000,2012,2024,2036]);
  console.log('PASS companion timing: '+purpose+' uses author decisions, current PP and compatibility readiness');
}

const records=[],experience=[],ev=[];
const rewardPokemon={level:()=>10,originalTrainer:()=> 'owner',owner:()=> 'owner',friendship:()=>10,health:()=>20,
  ability:()=>'',heldItem:()=>'',species:()=> 'cobblemon:porygon'};
const defeated={wild:()=>true,baseExperience:()=>100,level:()=>10,evYield:stat=>stat==='atk'?1:0};
const recipient={pokemon:()=>rewardPokemon,participated:()=>true,readyLevelEvolution:()=>false,
  experience:value=>experience.push(value),ev:(id,value)=>ev.push([id,value])};
const growth={kind:()=> 'defeat',actor:()=>rewardPokemon,target:()=>defeated,recipientCount:()=>1,recipient:()=>recipient,config:()=>1,record:(id,value)=>records.push([id,value])};
const baseline=context.NativeGrowthDefaults.experience(growth,recipient,defeated,1);
callbacks.growth(growth);assert.deepEqual(experience,[baseline+7]);assert.deepEqual(ev,[['atk',1],['spe',2]]);assert.deepEqual(records,[['defeat',1]]);
const captureState=new Map(),multipliers=[];
callbacks.capture({kind:()=> 'capture',tick:()=>100,ball:()=> 'cobblemon:quick_ball',number:key=>captureState.get(key)??NaN,setNumber:(key,value)=>captureState.set(key,value),multiplier:value=>multipliers.push(value)});
assert.deepEqual(multipliers,[6]);
const cycle=new context.WorldContributions.Registry();cycle.define({id:'a',after:['b'],apply:noop});cycle.define({id:'b',after:['a'],apply:noop});assert.throws(()=>cycle.apply({}),/cycle/);
console.log('PASS content composition: isolated ability; open unit paths and transitive graph; startup/assets/data; skill-free individual AI + equipment + ability; separate growth/capture rules settle exactly once; explicit conflicts and ordering');
