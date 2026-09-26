Smoke.scenario("telekinesis",function(stage){
 const caster=stage.pokemon({species:"abra",level:45,moves:["telekinesis"],at:[0,0,0]}),target=stage.mob({type:"minecraft:husk",at:[3,0,0]});stage.noai(target);
 const base=target.position()[1],gravity=stage.attribute(target,"minecraft:generic.gravity");stage.provoke(caster,target);
 stage.until(900,()=>target.position()[1]>base+.35&&stage.hasMobEffect(target,"world_combat:telekinesis_field"),function(){
  stage.setPp(caster,"telekinesis",0);stage.expect(target.position()[1]>base+.35,"the target's real feet rose above their original surface");
  stage.command("effect clear "+target.ref.split("/")[0]+" world_combat:telekinesis_field");stage.after(4,function(){
   stage.expect(!stage.hasMobEffect(target,"world_combat:telekinesis_field"),"the lifted identity is released");
   stage.expect(Math.abs(stage.attribute(target,"minecraft:generic.gravity")-gravity)<.001,"the owned gravity contribution was restored");
   stage.note("Real body height and owned release verified. Ceiling-limited height, ground-only immunity and hostile resistance combinations remain manual/native integration checks.");stage.done();
  });
 },"real low lift");
});
