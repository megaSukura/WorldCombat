Smoke.scenario("skydrop",function(stage){
 const caster=stage.pokemon({species:"pidgeot",level:40,moves:["skydrop"],at:[0,0,0]}),target=stage.mob({type:"minecraft:cow",at:[1.5,0,0]});stage.noai(target);stage.after(2,()=>stage.provoke(caster,target));
 const baseline=target.position()[1];let highest=baseline;
 stage.until(1100,function(){highest=Math.max(highest,target.position()[1]);return stage.damageTo(target)>0;},function(){
  stage.setPp(caster,"skydrop",0);stage.expect(highest>baseline+.5,"the carried body's feet really rose");stage.expect(stage.hits(caster)===1,"one actual landing settled the slam once");
  const rescuer=stage.pokemon({species:"pidgeot",level:40,moves:["skydrop"],at:[8,0,3]}),rescue=stage.mob({type:"minecraft:cow",at:[9.5,0,3]});stage.noai(rescue);stage.after(3,()=>stage.provoke(rescuer,rescue));
  stage.until(500,()=>stage.hasMobEffect(rescue,"world_combat:skydrop_carried"),function(){stage.command("kill "+rescuer.ref.split("/")[0]);stage.after(4,function(){
   stage.expect(rescue.alive()&&!stage.hasMobEffect(rescue,"world_combat:skydrop_carried"),"caster departure releases the other body's owned control");
   stage.expect(stage.attribute(rescue,"minecraft:generic.gravity")>0,"caster departure restores native gravity");stage.note("Actual ascent, once-only landing and interrupted-carry cleanup verified. Low ceilings, size limits and resistant Bosses are manual checks.");stage.done();
  });},"interrupted native carry");
 },"actual carried landing");
});
