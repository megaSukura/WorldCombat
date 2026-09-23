import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const handlers=new Map(); let ability='', held='', key=0, hp=50, status='', consumed=0, rejectConsumption=false, nativeState;
const pokemon={species:()=> 'cobblemon:bulbasaur',heldItem:()=>held,heldKey:()=>String(key),heldTag:tag=>held==='addon:egg'&&tag==='cobblemon:held/lucky_egg',
  ability:()=>ability,health:()=>hp,maxHealth:()=>100,healthScale:()=>1,status:()=>status,statusKey:()=>String(key),typeCount:()=>1,type:()=> 'grass',canEvolve:()=>true};
const actor={domain:()=> 'cobblemon',ref:()=> 'subject/1',key:()=> 'subject'};
const world={source:()=>actor,valid:()=>true,tick:()=>100,random:()=>0,
  health:(_actor,amount)=>{hp+=amount;return amount;},
  effects:()=>[{id:()=>1,data:()=>JSON.stringify(nativeState)}],operation:(_id,_op,json)=>{nativeState=JSON.parse(json);return true;}};
const sandbox=vm.createContext({WorldCombat:{event(){},phase(){},effect(){},effectHandler:(id,event,callback)=>handlers.set(id+'/'+event,callback),on(){}},
  NativeModifiers:{read:()=>({})}, CobblemonCombat:{pokemon:()=>pokemon,
    consumeHeld:(_world,_actor,expected)=>{if(rejectConsumption||expected!==String(key)||!held)return false;held='';key++;consumed++;return true;},
    status:(_world,_actor,value)=>{status=value;key++;return true;},resetCritical(){},statusLease(){},statusSeconds(){},record(){} }});
const files=['content/protocols/effects.ts','content/behavior/contributions.ts', 'content/mechanisms/damage-semantics.ts', 'content/mechanisms/status-vocabulary.ts', 'content/mechanisms/combat-status.ts', 'content/traits/composition.ts','content/mechanisms/action-parameters.ts',
  'content/mechanisms/native-abilities.ts','content/mechanisms/native-items.ts','content/mechanisms/native-rule-values.ts',
  'content/mechanisms/native-semantics.ts','content/mechanisms/combat-stages.ts','content/mechanisms/native-effects.ts'];
vm.runInContext(ts.transpileModule(files.map(file=>fs.readFileSync(file,'utf8')).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText,sandbox);
const I=sandbox.NativeItems,E=sandbox.NativeEffects,A=sandbox.NativeAbilities; nativeState=E.empty();
// The authored P4 rule units were archived. These in-place fixtures keep each assertion's mechanism intent and values.
I.define('choice_band',{attack:(_context,data)=>{if(data.category==='physical')data.attack*=1.5;}});
I.define('choice_specs',{committed:(context,data)=>{context.state.lock=String(data.move.id());},
  restriction:(context,data)=>{if(context.state.lock&&context.state.lock!==String(data.move.id()))data.reason='move-locked';},
  attack:(_context,data)=>{if(data.category==='special')data.attack*=1.5;}});
I.define('assault_vest',{defence:(_context,data)=>{if(data.category==='special')data.defence*=1.5;},
  restriction:(_context,data)=>{if(String(data.move.category())==='status')data.reason='move-restricted';}});
I.define('leek',{critical:(context,data)=>{if(/farfetchd|sirfetchd/.test(context.species))data.itemStage+=2;}});
I.define('scope_lens',{critical:(_context,data)=>{data.itemStage+=1;}});
I.define('focus_sash',{incoming:(context,data)=>{const p=context.pokemon;if(data.kind==='move'&&p.health()===p.maxHealth()&&data.amount>=p.health()*p.healthScale()){data.amount=Math.max(0,p.health()-1)*p.healthScale();data.consumeTarget=String(p.heldKey());}}});
I.define('sitrus_berry',{pulse:(context,data)=>{if(context.pokemon.health()<=context.pokemon.maxHealth()/2&&I.consume(context))I.heal(context,Math.max(1,Math.floor(context.pokemon.maxHealth()/4)));}});
I.define('pecha_berry',{pulse:(context,data)=>{if(['poison','poisonbadly'].indexOf(data.status)>=0&&I.consume(context))sandbox.CobblemonCombat.status(context.world,context.actor,'',0,String(context.pokemon.statusKey()));}});
I.define('leftovers',{recovery:(context,data)=>{I.heal(context,context.pokemon.maxHealth()/16);}});
I.define('black_sludge',{recovery:(context,data)=>{if(E.types(context.pokemon,context.state).indexOf('poison')>=0)I.heal(context,context.pokemon.maxHealth()/16);
  else if(!A.flag(E.ability(context.pokemon,context.state),'indirectImmune'))I.loss(context,context.pokemon.maxHealth()/8);}});
I.define('life_orb',{damage:(_context,data)=>{data.amount*=1.3;},
  applied:(context,data)=>{if(data.kind==='move'&&!A.flag(E.ability(context.pokemon,context.state),'indirectImmune')&&context.state.flags.orbAction!==data.action){
    context.state.flags.orbAction=data.action;E.write(context.world,context.actor,context.state);I.loss(context,context.pokemon.maxHealth()/10);}}});
I.define('weakness_policy',{received:(context,data)=>{if(data.effectiveness>1&&I.consume(context)){I.boost(context,'atk',2);I.boost(context,'spa',2);}}});
I.define('addon:egg',{experience:(context,data)=>{data.multiplier*=data.event.config('luckyEggMultiplier');}},'cobblemon:held/lucky_egg');
I.define('power_bracer',{ev:(_context,data)=>{if(data.stat==='atk')data.amount+=8;}},'cobblemon:held/power_bracer');
I.define('big_root',{drain:(_context,data)=>{data.amount*=1.3;},
  value:(_context,data)=>{if(data.id!=='ingrain/healRatio')return;const extra=data.value*.3;
    data.scope.term('item:cobblemon:big_root',{key:'worldcombat.value.big_root_absorption'},extra);data.value+=extra;}});
function equip(item){held=item;key++;nativeState=E.empty();}
function event(name,data,state=nativeState){return I.apply(world,actor,name,data,state);}
let cases=0;function check(name,run){run();cases++;console.log('PASS native item rules: '+name);}
check('authored held rules apply, disappear on removal and respect temporary suppression',()=>{
  equip('cobblemon:choice_band');assert.equal(event('attack',{category:'physical',attack:20}).attack,30);
  assert.equal(event('attack',{category:'special',attack:20}).attack,20);
  nativeState.flags.itemsSuppressed=1;assert.equal(event('attack',{category:'physical',attack:20}).attack,20);
  nativeState.flags.itemsSuppressed=0;assert.equal(event('attack',{category:'physical',attack:20}).attack,30);
  equip('');assert.equal(event('attack',{category:'physical',attack:20}).attack,20);
});
check('choice lock and assault-vest restrictions belong to their own definitions',()=>{
  equip('cobblemon:choice_specs');event('committed',{move:{id:()=> 'solarbeam'}});
  assert.equal(event('restriction',{move:{id:()=> 'tackle'},reason:''}).reason,'move-locked');
  equip('cobblemon:assault_vest');assert.equal(event('restriction',{move:{category:()=> 'status'},reason:''}).reason,'move-restricted');
  assert.equal(event('defence',{category:'special',defence:100}).defence,150);
});
check('critical rules preserve native item and species facts',()=>{
  assert.equal(I.critical('leek','cobblemon:farfetchd').itemStage,2);
  assert.equal(I.critical('leek','cobblemon:bulbasaur').itemStage,0);
  assert.equal(I.critical('scope_lens','cobblemon:bulbasaur').itemStage,1);
});
check('survival reserves a native identity and only the actual damage consumer settles it',()=>{
  hp=100;equip('cobblemon:focus_sash');const result=event('incoming',{kind:'move',amount:200});
  assert.equal(result.amount,99);assert.equal(result.consumeTarget,String(key));assert(held);
  const old=result.consumeTarget;equip('cobblemon:oran_berry');assert.equal(sandbox.CobblemonCombat.consumeHeld(world,actor,old),false);assert(held);
});
check('berries use atomic native consumption and do not heal when native use is canceled',()=>{
  equip('cobblemon:sitrus_berry');hp=20;const before=consumed;rejectConsumption=true;
  event('pulse',{status:''});assert.equal(hp,20);assert.equal(consumed,before);
  rejectConsumption=false;event('pulse',{status:''});assert.equal(hp,45);assert.equal(consumed,before+1);assert.equal(held,'');
  event('pulse',{status:''});assert.equal(hp,45);
});
check('native cures and recovery retain their distinct triggers',()=>{
  equip('cobblemon:pecha_berry');status='cobblemon:poisonbadly';event('pulse',{status:'poisonbadly'});assert.equal(status,'');assert.equal(held,'');
  equip('cobblemon:leftovers');hp=50;event('recovery',{});assert.equal(hp,56.25);
  equip('cobblemon:black_sludge');event('recovery',{});assert.equal(hp,43.75);
});
check('life-orb cost is once per action and reactive native boosts remain separate',()=>{
  equip('cobblemon:life_orb');hp=100;const data={kind:'move',action:91};event('applied',data);event('applied',data);assert.equal(hp,90);
  event('applied',{kind:'move',action:92});assert.equal(hp,80);
  equip('cobblemon:weakness_policy');event('received',{effectiveness:2});assert.equal(nativeState.stages.atk,2);assert.equal(nativeState.stages.spa,2);assert.equal(held,'');
});
check('native held tags support addon items and permanent rewards retain their rules',()=>{
  const growth={config:name=>name==='luckyEggMultiplier'?1.5:.5};equip('addon:egg');assert.equal(event('experience',{event:growth,multiplier:1}).multiplier,1.5);
  equip('cobblemon:power_bracer');assert.equal(event('ev',{stat:'atk',amount:2}).amount,10);assert.equal(event('ev',{stat:'spa',amount:2}).amount,2);
});
check('one non-damage value uses the same item rule and causal term when recalled or alive',()=>{
  const registry=new sandbox.RuleValues.Registry();registry.define('ingrain/healRatio',{value:.02});
  sandbox.NativeRuleValues.bind(registry,'ingrain/healRatio',context=>context);
  equip('cobblemon:big_root');
  const recalled=registry.evaluate('ingrain/healRatio',{pokemon});
  const live=registry.evaluate('ingrain/healRatio',{pokemon,world,actor});
  assert(Math.abs(recalled.value-.026)<1e-12);assert.equal(live.value,recalled.value);
  assert(recalled.sources.some(term=>term.id==='item:cobblemon:big_root'&&Math.abs(term.value-.006)<1e-10));
  nativeState.flags.itemsSuppressed=1;assert.equal(registry.evaluate('ingrain/healRatio',{pokemon,world,actor}).value,.02);
});
check('another item can register a negative value contribution without changing skills or inventory code',()=>{
  I.define('addon:cooling_charm',{value:(_context,data)=>{if(data.id==='test:temperature'){data.scope.term('addon:cooling','Cooling',-7);data.value-=7;}}});
  const registry=new sandbox.RuleValues.Registry();registry.define('test:temperature',{value:30});sandbox.NativeRuleValues.bind(registry,'test:temperature',context=>context);
  equip('addon:cooling_charm');assert.equal(registry.evaluate('test:temperature',{pokemon}).value,23);
  equip('');assert.equal(registry.evaluate('test:temperature',{pokemon}).value,30);
});
check('an ability uses the same value protocol and responds to effective replacement and suppression',()=>{
  sandbox.NativeAbilities.define('addon:patient',{}, {value:(_context,data)=>{if(data.id==='test:duration'){data.scope.term('ability:addon:patient','Patient',4);data.value+=4;}}});
  const registry=new sandbox.RuleValues.Registry();registry.define('test:duration',{value:10});sandbox.NativeRuleValues.bind(registry,'test:duration',context=>context);
  equip('');ability='addon:patient';assert.equal(registry.evaluate('test:duration',{pokemon,world,actor}).value,14);
  nativeState.flags.suppressed=1;assert.equal(registry.evaluate('test:duration',{pokemon,world,actor}).value,10);
  nativeState.flags.suppressed=0;nativeState.ability='addon:other';assert.equal(registry.evaluate('test:duration',{pokemon,world,actor}).value,10);
  nativeState.ability='';assert.equal(registry.evaluate('test:duration',{pokemon,world,actor}).value,14);ability='';
});
console.log(`PASS ${cases} native item/RuleValues checks with inline fixture definitions`);
