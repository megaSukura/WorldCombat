import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
let enabled=false,immunities=0,changes=0;
const source={id:'source',types:['electric']},target={id:'target',types:['water']};
const world={valid:actor=>!!actor};
const listeners=new Map();
const context=vm.createContext({WorldCombat:{on(id,_topic,_after,handler){listeners.set(id,handler);},effect(){},effectHandler(){}},
 CobblemonCombat:{typeEffectiveness:(attack,defence)=>attack==='electric'?(defence==='water'?2:defence==='ground'?0:1):1},
 PokemonDamage:{combatants:{read:(_world,actor)=>({types:actor.types})},sameType:(actor,type)=>actor.types.includes(type)?1.5:1,immune:()=>immunities++}});
vm.runInContext(ts.transpileModule(['content/behavior/contributions.ts','content/mechanisms/damage-semantics.ts'].map(p=>fs.readFileSync(p,'utf8')).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
context.PokemonDamage.effectiveness=new context.WorldContributions.Registry();
vm.runInContext(ts.transpileModule(fs.readFileSync('content/mechanisms/native-attack-types.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
const T=context.NativeAttackTypes,D=context.DamageSemantics;
T.conversions.define({id:'fixture:convert',apply:hit=>{if(enabled&&hit.type==='normal'){hit.type='electric';changes++;}}});
const attack=patch=>({amount:4,damageType:'minecraft:mob_attack',sourceActor:'source',sourceLiving:true,direct:true,sourceEntity:'native-id',directType:'minecraft:zombie',damageTags:[],...patch});
const settle=data=>D.normalize(data,world,source,target);
let data=settle(attack());assert.equal(data.amount,4);assert.equal(data.type,undefined,'classification alone keeps ordinary native damage unchanged');
enabled=true;data=settle(attack());assert.equal(data.amount,12);assert.equal(data.type,'electric');
assert.equal(data.damageType,'minecraft:mob_attack');assert.equal(data.directType,'minecraft:zombie');assert.equal(data.sourceEntity,'native-id');assert.equal(data.move,undefined);assert.equal(data.calculation,undefined);
settle(data);assert.equal(data.amount,12);assert.equal(changes,1,'enrichment composes only once across incoming handlers');
for(const patch of [{damageType:'example:unknown'},{damageType:'minecraft:fall',direct:false,sourceLiving:false},{scripted:true},{kind:'move'},{calculation:{}},{bypassesInvulnerability:true}]) {
 data=settle(attack(patch));assert.equal(data.amount,4);assert.equal(data.type,undefined);
}
data=settle(attack({damageType:'minecraft:arrow',direct:false,damageTags:['minecraft:is_projectile']}));assert.equal(data.type,'electric');assert.equal(data.amount,12);
target.types=['ground'];data=settle(attack());assert.equal(data.amount,0);assert.equal(immunities,1);
T.classifications.define({id:'fixture:modded',apply:hit=>{if(hit.data.damageType==='fixture:blade')hit.baseType='normal';}});
target.types=[];data=settle(attack({damageType:'fixture:blade',damageTags:['world_combat:damage/attack']}));assert.equal(data.amount,6);
context.PokemonDamage.effectiveness.define({id:'fixture:matchup',apply:hit=>{assert.equal(hit.move,null);hit.effectiveness=.5;}});
data=settle(attack());assert.equal(data.amount,3,'native conversions share matchup contributions without a fake move');
assert(D.directOffense(attack()));
assert(D.directOffense({kind:'move',category:'special',scripted:true}));
assert(!D.directOffense({kind:'move',category:'special',indirect:true,action:3}));
assert(!D.directOffense({kind:'residual',category:'physical',action:3}));
assert(!D.directOffense({kind:'move',category:'status'}));
assert(!D.directOffense({damageType:'minecraft:fall',sourceLiving:false}));
assert.equal(D.read({damageType:'minecraft:sonic_boom'}).flags.sound,true);
assert.equal(D.read({damageType:'fixture:blast',damageTags:['world_combat:damage/sound']}).flags.sound,true);
assert.equal(D.read({damageType:'minecraft:sonic_boom',flags:{sound:false}}).flags.sound,false);
assert.equal(D.read({damageType:'fixture:unknown'}).flags.sound,undefined);
console.log('PASS native type conversion: opt-in, provenance, one settlement, unknown/environment/script exclusions, projectile, immunity and extensible matchup; native/authored attacks separate from residuals');
{
 let tick=10,sequence=0;const records=[];
 const actor={ref:()=> 'caster',key:()=> 'caster'},victim={ref:()=> 'victim',key:()=> 'victim'};
 const factsWorld={valid:()=>true,tick:()=>tick,
   effects:(_actor,definition)=>records.filter(r=>r.definition===definition).map(r=>({id:()=>r.id,data:()=>r.data})),
   operation:id=>{const index=records.findIndex(r=>r.id===id);if(index>=0)records.splice(index,1);},
   effect:(definition,_actor,data)=>records.push({definition,id:++sequence,data})};
 const applied=data=>listeners.get('world_combat:native_attack_memory')({world:()=>factsWorld,actor:()=>actor,target:()=>victim,data:()=>JSON.stringify(data)});
 applied({...attack(),actual:3,type:'electric'});
 assert.equal(D.recentAttack(factsWorld,actor).elementType,'electric');
 tick++;
 applied({kind:'move',scripted:true,category:'special',damageType:'fixture:spell',type:'ice',actual:4});
 assert.equal(D.recentOffense(factsWorld,actor).elementType,'ice');
 assert.equal(D.recentAttack(factsWorld,actor).elementType,'electric','script observation leaves native-only memory intact');
 applied({kind:'residual',category:'special',type:'fire',actual:2});
 applied({kind:'move',category:'special',type:'fire',actual:0});
 assert.equal(D.recentOffense(factsWorld,actor).elementType,'ice','residue and refused hits do not replace offense');
 tick=500;assert.equal(D.recentOffense(factsWorld,actor,100),null);
 console.log('PASS actual resolved offense memory: native/script separation, final element, zero/residue exclusion and age');
}
