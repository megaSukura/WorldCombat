import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Neutral actors and recipes exercise public start identities and the actual vigil consumer, without a game.
let tick=0, id=0, nativeSequence=0, nativeRecords=[], queue=[], definition, calls=[], projected=[], prepared=[];
const hooks=new Map(), actors=new Map();
const point=(x,y,z)=>({x:()=>x,y:()=>y,z:()=>z,plus:p=>point(x+p.x(),y+p.y(),z+p.z()),minus:p=>point(x-p.x(),y-p.y(),z-p.z()),
  scale:n=>point(x*n,y*n,z*n),length:()=>Math.hypot(x,y,z),unit(){return this.scale(1/this.length());}});
const actor=(name,x=0)=>{const a={x,alive:true,shown:true,ref:()=>name,key:()=>name,domain:()=> 'minecraft'};actors.set(name,a);return a;};
const world={tick:()=>tick,source:()=>self,actor:ref=>actors.get(ref),valid:a=>!!a?.alive,
  observe:a=>a?.alive?{visible:()=>a.shown,position:()=>point(a.x,0,0),width:()=>1}:null,
  closestPoint:a=>point(a.x,0,0),friendly:()=>false,
  attackStarts:(a,after)=>JSON.stringify({cursor:nativeSequence,records:nativeRecords.filter(r=>r.actor===a.ref()&&r.sequence>after&&tick-r.tick<=2)}),
  sound(){}};
const context=vm.createContext({WorldCombat:{point,on:(name,topic,_after,handler)=>hooks.set(name,{topic,handler}),effect(){},effectHandler(){}},
  NativeLoadout:{installActions(){},facts:()=>({flags:{}}),inputFor:(_action,_id,target)=>({target,point:point(target.x,0,0)}),
    select:(_action,ids,options)=>({id:ids[0],options}),call:(a,move,options)=>calls.push({a,move,options}),executing:()=>null},
  MoveExecutions:{declarations:{define(){}},read:()=>null,write(){}},
  CobblemonCombat:{moveTemplate:name=>({id:()=>name,category:()=>name==='neutral_status'?'status':'physical'})},
  PokemonDamage:{metadata:{define(){}}},
  DamageSemantics:{recentAttack(){throw Error('Old damage must never supply an attack start');}},
  WorldFeedback:{actionScenes:()=>({show:(a,_key,_point,data)=>a.present('', '',1,point(0,0,0),JSON.stringify(data)),stop(){}}),
    emit(w){assert.equal(w,world);},text(w){assert.equal(w,world);}},
  PokemonSkills:{skills:{neutral_attack:{kind:'enemy'},neutral_status:{kind:'enemy'}},
    mefirstId:'mefirst',mefirstScene:'fixture:read',mefirstMissText:'fixture:miss',mefirstTakeText:'fixture:take',
    define:value=>definition=value,p:(_id,key)=>({sparks:3,vigil:3,surge:1.5,recharge:9,aftercast:1,tempo:1,reach:10})[key],
    read:()=>false,playNativeCopy:(a,replay)=>{assert(a.paid);projected.push(replay);a.finish();}},
  JSON,Math});
for(const path of ['content/behavior/contributions.ts','content/mechanisms/living-actions.ts','content/mechanisms/attack-starts.ts','content/mechanisms/native-attack-projection.ts','content/moves/mefirst/skill.ts']) {
  const declarations=path.endsWith('/mefirst/skill.ts')?'namespace PokemonSkills { export var define:any,p:any,skills:any,read:any,playNativeCopy:any,mefirstId:any,mefirstScene:any,mefirstMissText:any,mefirstTakeText:any; }\n':'';
  vm.runInContext(ts.transpileModule(declarations+fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText,context,{filename:path});
}
const A=context.LivingActions,S=context.AttackStarts,P=context.NativeAttackProjection;
const originalPrepare=P.prepare;P.prepare=(a,replay)=>{prepared.push(replay);originalPrepare(a,replay);};
let self=actor('reader',0), foe=actor('foe',1);
function action(owner=self,target=foe) {
  const instance=++id, values=new Map(), listeners=new Map();let token=0;
  const a={paid:0,open:true,id:()=>instance,content:()=>owner===self?'world_combat:mefirst':'neutral:host',actor:()=>owner,target:()=>target,
    origin:()=>point(owner.x,0,0),targetPosition:()=>point(target.x,0,0),direction:()=>point(1,0,0),range:()=>10,sense:()=>world,
    world:()=>{assert(a.paid,'No world writes before payment');return world;},stopMovement(){},face(){},stage(){},present(){},releaseTarget(){},
    data(key,value){if(value!==undefined)values.set(key,value);return values.get(key)??null;},
    on:(name,handler)=>{listeners.set(++token,{name,handler});return token;},off:key=>listeners.delete(key),
    after:(delay,callback)=>queue.push({at:tick+delay,a,callback}),
    commit:()=>{assert.equal(a.paid,0,'one payment');a.paid++;},
    reject:reason=>{a.cancel();throw Error(reason);},
    finish:()=>a.cancel(),cancel:()=>{a.open=false;for(const value of hooks.values())if(value.topic==='world_combat:action_ended')value.handler({data:()=>JSON.stringify({instance}),actor:()=>owner,world:()=>world});}
  };return a;
}
function advance(n=1){for(let i=0;i<n;i++){tick++;const due=queue.filter(q=>q.at<=tick);queue=queue.filter(q=>q.at>tick);for(const item of due)if(item.a.open)item.callback(item.a);}}
function reset(){queue.forEach(q=>q.a.cancel());queue=[];calls=[];projected=[];prepared=[];nativeRecords=[];tick+=10;self=actor('reader-'+id,0);foe=actor('foe-'+id,1);}
function native(kind='contact',profile='minecraft:mob_melee') {nativeRecords.push({id:'attempt-'+(++nativeSequence),sequence:nativeSequence,tick,actor:foe.ref(),target:self.ref(),kind,profile,
  category:kind==='contact'?'physical':'special',damageType:kind==='contact'?'minecraft:mob_attack':'minecraft:fireball',baseDamage:5,budgetBasis:'registered-launch-base',speed:.1,gravity:0,radius:.15,acceleration:.1,drag:.95,waterDrag:.8});}
function shared(owner,identity,prepare){const a=action(owner,self);A.run(a,{prepare,recover:0,cooldown:1,identity},(current,done)=>done(current));return a;}

reset();native();const old=action();definition.run(old);advance(7);
assert.equal(projected.length,0);assert.equal(calls.length,0);assert.equal(old.paid,1);assert(!old.open,'Empty vigil completes recovery');
reset();const waiting=action();definition.run(waiting);advance();native();advance();
assert.equal(projected.length,1);assert.equal(waiting.paid,1);assert.equal(prepared[0].basis,'start');
reset();const long=shared(foe,'neutral_attack',10);const read=action();definition.run(read);advance();
assert.equal(calls.length,1);assert.equal(calls[0].move,'neutral_attack');
assert.equal(calls[0].options.prepareLimit,A.preparing(world,foe)[0].remaining-1,'Copied preparation fits the real remaining clock');
assert.equal(JSON.parse(read.data('world_combat:mefirst/start')).instance,long.id(),'Exact observed execution identity');long.cancel();read.cancel();
reset();shared(foe,'neutral_status',8);const auxiliary=action();definition.run(auxiliary);advance(7);
assert.equal(calls.length,0);assert.equal(auxiliary.paid,1,'Pure support preparation is ignored');
reset();const aborted=shared(foe,'neutral_attack',10), noCopy=action();definition.run(noCopy);aborted.cancel();advance(7);
assert.equal(calls.length,0,'Canceled preparation cannot be copied');assert.equal(noCopy.paid,1);
reset();shared(foe,'neutral_attack',0);const priorZero=action();definition.run(priorZero);advance(7);assert.equal(calls.length,0,'Earlier zero preparation is not current intent');
reset();const sameBeat=action();definition.run(sameBeat);advance();const first=shared(foe,'neutral_attack',0), second=shared(foe,'neutral_attack',0);
const fresh=S.authored(world,foe,0).filter(value=>value.prepare===0);assert.equal(fresh.length,2);assert.notEqual(fresh[0].sequence,fresh[1].sequence);
advance();assert.equal(calls.length,1,'Fresh zero-preparation start can be answered in the current beat');sameBeat.cancel();
reset();foe.x=8;const distant=action();definition.run(distant);advance();native();advance(6);assert.equal(projected.length,0,'Native punch cannot become remote damage');assert.equal(distant.paid,1);
reset();const unknown=action();definition.run(unknown);advance();native('projectile','example:unknown');advance(6);assert.equal(projected.length,0,'Unknown native launch stays unsupported');
reset();const fire=action();definition.run(fire);advance();native('projectile','minecraft:small_fireball');advance();
assert.equal(projected.length,1);assert.equal(projected[0].appearance.acceleration,.1);assert.equal(projected[0].appearance.drag,.95);assert.equal(projected[0].range,10);
console.log('PASS attack starts and vigil: old/history refusal, live identity/remaining clock, support/cancel refusal, distinct zero starts, one miss payment, real contact range, unknown refusal and registered motion');
