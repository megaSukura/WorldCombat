Smoke.scenario("allyswitch",function(stage){
 const caster=stage.pokemon({species:"abra",level:32,moves:["allyswitch"],at:[-3,0,0]}),ally=stage.mob({type:"minecraft:husk",at:[0,0,0]}),foe=stage.mob({type:"minecraft:husk",at:[2,0,0]});
 stage.team("shift",[caster,ally]);stage.noai(ally,foe);
 stage.after(2,function(){stage.hurt(ally,10,"minecraft:magic",{source:foe});stage.provoke(foe,ally);stage.provoke(caster,foe);});
 stage.until(700,()=>stage.casts("allyswitch",caster)>0,function(){
  stage.setPp(caster,"allyswitch",0);stage.after(2,function(){
   stage.expect(stage.travelled(ally)>1,"the endangered ally really changed position");
   stage.expect(stage.travelled(caster)>1,"the rescuer really took the exchanged position");
   stage.expect(ally.position()[0]<caster.position()[0],"the ally moved to the safer side of the pursuer");
   stage.note("Native successful two-body exchange verified. Refused destination and mod target refusals use native swap/target results; their visual timing is a manual check.");stage.done();
  });
 },"rescue exchange");
});
