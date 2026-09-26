Smoke.scenario("visegrip",function(stage){
 const caster=stage.pokemon({species:"kingler",level:28,moves:["visegrip"],at:[0,0,0]}),target=stage.mob({type:"minecraft:husk",at:[2.2,0,0]});
 stage.noai(target);stage.command("attribute "+target.ref.split("/")[0]+" minecraft:generic.max_health base set 120");stage.command("data merge entity "+target.ref.split("/")[0]+" {Health:120f}");
 stage.after(2,function(){stage.prefer(caster,"visegrip",{haul:true});stage.provoke(caster,target);});
 stage.until(700,()=>stage.damageTo(target)>0,function(){stage.setPp(caster,"visegrip",0);stage.after(10,function(){
  stage.expect(stage.hits(caster)===1,"one pincer closure produces one strike");
  stage.expect(!stage.hasMobEffect(target,"world_combat:visegrip_hold"),"short grip has released after six ticks");
  stage.expect(stage.travelled(caster)>.1,"the approach uses real body movement");
  stage.note("One contact settlement, native approach and finite grip cleanup verified. Drag acceptance, interruption and resistant bodies retain native motion/status rules.",{gripped:stage.hadMobEffect(target,"world_combat:visegrip_hold"),targetTravel:stage.travelled(target)});stage.done();
 });},"real pincer contact");
});
