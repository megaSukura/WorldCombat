Smoke.scenario("doubleteam",function(stage){
 const caster=stage.pokemon({species:"electrode",level:40,moves:["doubleteam"],at:[0,0,0]}),foe=stage.mob({type:"minecraft:husk",at:[4,0,0]});
 stage.noai(foe);stage.provoke(caster,foe);
 stage.until(700,()=>stage.hasMobEffect(caster,"world_combat:status/doubleteam")&&stage.travelled(caster)>1,function(){
  stage.setPp(caster,"doubleteam",0);stage.expect(stage.travelled(caster)>1,"real body left the old position");
  stage.expect(stage.stages(caster).evasion>0,"original evasion gain remains");
  // Let the motion action settle, then land one native hit on the real body through the same command path
  // the other scenarios use. Health is read directly: a decoy never absorbs damage aimed at the real body.
  stage.after(90,function(){
   const before=caster.health();
   stage.command("damage "+String(caster.ref).split("/")[0]+" 4 minecraft:mob_attack by "+String(foe.ref).split("/")[0]);
   stage.after(3,function(){stage.expect(caster.health()<before,"a direct hit on the real body is not absorbed by a mirror pool");
    stage.note("Native displacement, evasion and real-body damage verified; one-hit decoy targeting, spacing and appearance are manual interaction checks.",
     { before: before, after: caster.health() });stage.done();});
  });
 },"side step and afterimages");
});
