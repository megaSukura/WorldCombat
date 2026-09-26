Smoke.scenario("doubleteam",function(stage){
 const caster=stage.pokemon({species:"electrode",level:40,moves:["doubleteam"],at:[0,0,0]}),foe=stage.mob({type:"minecraft:husk",at:[4,0,0]});
 stage.noai(foe);stage.provoke(caster,foe);
 stage.until(700,()=>stage.hasMobEffect(caster,"world_combat:status/doubleteam")&&stage.travelled(caster)>1,function(){
  stage.setPp(caster,"doubleteam",0);stage.expect(stage.travelled(caster)>1,"real body left the old position");
  stage.expect(stage.stages(caster).evasion>0,"original evasion gain remains");const before=stage.damageTo(caster);stage.hurt(caster,4,"minecraft:magic",{source:foe});
  stage.after(3,function(){stage.expect(stage.damageTo(caster)>before,"a direct hit on the real body is not absorbed by a mirror pool");
   stage.note("Native displacement, evasion and real-body damage verified; one-hit decoy targeting and appearance are manual interaction checks.");stage.done();});
 },"side step and afterimages");
});
