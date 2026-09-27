Smoke.scenario("drumbeating",function(stage){
 const caster=stage.pokemon({species:"rillaboom",level:40,moves:["drumbeating"],at:[0,0,0]}),foe=stage.mob({type:"minecraft:iron_golem",at:[6,0,0]});
 stage.noai(foe);stage.provoke(caster,foe);
 stage.until(900,()=>stage.hadMobEffect(foe,"world_combat:status/rootbound"),function(){
  stage.setPp(caster,"drumbeating",0);stage.expect(stage.damageTo(foe)>0,"supported travelling beats arrived and dealt damage");
  stage.expect(stage.hadMobEffect(foe,"world_combat:status/rootbound"),"the actually arriving final beat bound its contact");
  stage.expect((stage.stages(foe)["spe"]||0)<0,"the rootbound carrier owns a real temporary Speed-drop window");
  stage.expect(stage.changedBlocks().length===0,"the root traces do not replace terrain");
  stage.note("Supported beat arrivals and final bind verified; the Speed drop is a window owned by the rootbound carrier and recovers with it. Each beat snapshots separately; moving escapes, zero-distance beats and cliff interruption remain manual checks.");stage.done();
 },"grounded beat sequence");
});
