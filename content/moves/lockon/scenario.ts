Smoke.scenario("lockon",function(stage){
 const a=stage.pokemon({species:"eevee",level:25,moves:["lockon","tackle"],at:[-3,0,-1]}),b=stage.pokemon({species:"eevee",level:25,moves:["lockon"],at:[-3,0,1]}),target=stage.mob({type:"minecraft:iron_golem",at:[1,0,0]});
 stage.team("locks",[a,b]);stage.noai(target);const base=stage.attribute(target,"minecraft:generic.movement_speed");
 stage.after(2,function(){stage.setPp(a,"tackle",0);stage.provoke(a,target);stage.provoke(b,target);});
 stage.until(900,()=>stage.hasMobEffect(a,"world_combat:lockon_focus")&&stage.hasMobEffect(b,"world_combat:lockon_focus"),function(){
  stage.setPp(a,"lockon",0);stage.setPp(b,"lockon",0);stage.expect(stage.attribute(target,"minecraft:generic.movement_speed")<base,"shared native control is real");
  stage.command("effect clear "+a.ref.split("/")[0]+" world_combat:lockon_focus");
  stage.after(4,function(){
   stage.expect(!stage.hasMobEffect(a,"world_combat:lockon_focus"),"one caster's lock ended");
   stage.expect(stage.hasMobEffect(b,"world_combat:lockon_focus"),"the other caster kept its own lock");
   stage.expect(stage.attribute(target,"minecraft:generic.movement_speed")<base,"the remaining owner's native control survives");
   stage.note("Two-owner release and remaining control verified. Actual follow-up consumption uses the existing settled-damage hook; visual clamp and native immunity are manual checks.");stage.done();
  });
 },"two independent locks");
});
