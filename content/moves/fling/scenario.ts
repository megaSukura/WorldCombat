Smoke.scenario("fling",function(stage){
 const caster=stage.pokemon({species:"aipom",level:30,moves:["fling"],item:"cobblemon:oran_berry",at:[0,0,0]});
 const ally=stage.mob({type:"minecraft:husk",at:[3,0,0]}),foe=stage.mob({type:"minecraft:husk",at:[6,0,0]});
 stage.noai(ally,foe);stage.team("berry",[caster,ally]);stage.hurt(ally,8,"minecraft:magic",{source:foe});const before=ally.health(),damage=stage.damageTo(ally);stage.provoke(caster,foe);
 stage.until(800,()=>stage.casts("fling",caster)>0&&ally.health()>before,function(){
  stage.expect(stage.heldItem(caster)==="","the real held berry was consumed once");
  stage.expect(ally.health()>before,"the allied body ate the actual berry effect");
  stage.expect(stage.damageTo(ally)<=damage+.001,"allied contact received no hostile physical hit");
  stage.note("Allied projectile contact, exact held consumption and Berry healing verified. Landing/pickup appearance is a manual check.");stage.done();
 },"feed an allied body");
});
