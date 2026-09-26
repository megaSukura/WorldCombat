import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const point=(x,y,z)=>({x:()=>x,y:()=>y,z:()=>z,plus:v=>point(x+v.x(),y+v.y(),z+v.z()),minus:v=>point(x-v.x(),y-v.y(),z-v.z()),
  scale:n=>point(x*n,y*n,z*n),length:()=>Math.hypot(x,y,z),unit:()=>point(x/Math.hypot(x,y,z),y/Math.hypot(x,y,z),z/Math.hypot(x,y,z))});
let declaration;
const context=vm.createContext({WorldCombat:{point},MoveExecutions:{declarations:{define:rule=>declaration=rule}},
  CobblemonCombat:{moveTemplate:()=>({})},PokemonDamage:{sourceMetadata:(_w,_a,_m,features)=>({...features}),combatants:{read:()=>({types:[]})},sameType:()=>1},NativeLoadout:{hitMetadata:(_action,data)=>data},
  LivingActions:{settleHit:(_action,apply)=>apply(),ballistic:()=>point(1,0,0)}});
vm.runInContext(ts.transpileModule(['content/behavior/contributions.ts','content/mechanisms/native-attack-projection.ts'].map(file=>fs.readFileSync(file,'utf8')).join('\n'),
  {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText,context);
const P=context.NativeAttackProjection, basic={amount:4,actual:2,tick:1,contact:true,category:'physical',type:'minecraft:mob_attack',tags:[]};
assert.equal(P.describe({...basic,type:'example:unknown'}),null,'Unknown Mod contact has no invented projection');
const melee=P.describe(basic);assert.equal(melee.kind,'contact');
const arrow={...basic,contact:false,type:'minecraft:arrow',directType:'minecraft:arrow',projectilePath:[{from:[0,0,0],to:[1,0,0]},{from:[1,0,0],to:[4,0,0]}]};
const shot=P.describe(arrow);assert.equal(shot.speed,1);assert.equal(shot.range,4);
assert.equal(P.describe({...arrow,directType:'example:special_arrow'}),null,'An unknown projectile entity is not cloned by damage type alone');
assert.equal(P.describe({...arrow,projectilePath:[]}),null,'A projectile needs actual recorded flight budget');
let targetDistance=9,queued=null,flight=null,hits=0,ended=0,lastMetadata=null;
const world={observe:()=>({width:()=>1}),hurt(){throw new Error('A projection cannot settle arbitrary remote HP damage');}};
const impact=(entity)=>({hitEntity:()=>entity,position:()=>point(1,0,0),projectile:()=>'',target:()=>({})});
const memory=new Map();
const action={data(key,value){if(value!==undefined)memory.set(key,value);return memory.get(key)??null;},id:()=>1,actor:()=>({}),origin:()=>point(0,0,0),targetPosition:()=>point(9,0,0),direction:()=>point(1,0,0),range:()=>12,world:()=>world,
  after:(_ticks,callback)=>{queued=callback;},trace:(from,to,radius)=>impact(targetDistance<=to.minus(from).length()+radius),
  hit:(_impact,amount,_key,metadata)=>{assert.equal(amount,6);lastMetadata=JSON.parse(metadata);hits++;return true;},
  projectile:(origin,velocity,gravity,radius,range,lifetime,hit,complete,appearance)=>{flight={origin,velocity,gravity,radius,range,lifetime,hit,complete,appearance};return 'native-flight';}};
const options={move:'neutral-copy',multiplier:1.5,show(){},done(){ended++;}};
P.prepare(action,melee);const declared={action,features:[]};declaration.apply(declared);assert.equal(declared.features[0].type,'','Native observations retain unknown Pokemon type at commit');assert.equal(declared.features[0].category,'physical');
P.play(action,melee,options);queued(action);assert.equal(hits,0,'A recorded punch cannot hit its distant original owner');assert.equal(ended,1);
targetDistance=1;P.play(action,melee,options);queued(action);assert.equal(hits,1);assert.equal(lastMetadata.damageType,'minecraft:mob_attack');assert.equal(lastMetadata.contact,true);
P.play(action,shot,options);assert.equal(flight.range,4);assert.equal(flight.velocity.length(),1);assert(flight.lifetime>0);assert.equal(hits,1,'Launching an arrow does not apply its damage');
flight.hit(action,impact(false));assert.equal(hits,1,'A wall impact cannot turn into a target hit');
flight.hit(action,impact(true));assert.equal(hits,2);assert.equal(lastMetadata.damageType,'minecraft:arrow');assert.equal(lastMetadata.contact,false);
console.log('PASS native projection: explicit support, actual path budget, short contact, no remote HP fallback, real flight receipt and wall refusal');
