import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const context=vm.createContext({WorldCombat:{on(){}},CombatStatus:{gate:{define(){}},actions:{define(){}}},CombatStages:{windowDefinition:'fixture:stage_window'}});
vm.runInContext(ts.transpileModule(['content/behavior/contributions.ts','content/mechanisms/mob-effects.ts','content/mechanisms/native-effects.ts'].map(p=>fs.readFileSync(p,'utf8')).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText,context);
const owns=context.NativeEffects.ownsBoostWindow;
const source={key:()=> 'a'},other={key:()=> 'b'},carrier={id:()=> 'fixture:carrier',key:()=> 'application:1'};
let checks=0;
for(const domain of ['minecraft','cobblemon']) {
 const actor={domain:()=>domain}, expected=domain==='cobblemon'?'cobblemon_world_combat:modifier':'fixture:stage_window';
 let liveKey='application:1',record={source:'fixture:grant',stages:{atk:-1},carrier:{id:'fixture:carrier',key:'application:1'}},owner=source;
 const world={source:()=>source,valid:()=>true,matchesMobEffect:(_a,id,key)=>id==='fixture:carrier'&&key===liveKey,
 effects:(_a,id)=>{assert.equal(id,expected);return [{source:()=>owner,data:()=>JSON.stringify(record)}];}};
 const yes=(label,want)=>{assert.equal(owns(world,actor,'fixture:grant',carrier),want,label);checks++;};
 yes(domain+' same owner and application',true);
 owner=other;yes(domain+' other caster is not owned',false);owner=source;
 liveKey='application:2';yes(domain+' replaced application is not live',false);liveKey='application:1';
 record.carrier.key='application:2';yes(domain+' different window application',false);record.carrier.key='application:1';
 record.source='fixture:other-grant';yes(domain+' other named grant',false);record.source='fixture:grant';
 record.pending=true;yes(domain+' pending grant',false);delete record.pending;
 record.stages={};yes(domain+' non-stage modifier',false);
}
console.log('PASS boost window ownership: '+checks+' owner, source, exact carrier, replacement and modifier-domain assertions');


