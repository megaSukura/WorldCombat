Smoke.scenario("lowsweep",function(stage){
 const caster=stage.pokemon({species:"machop",level:30,moves:["lowsweep"],at:[0,0,0]}),foe=stage.mob({type:"minecraft:iron_golem",at:[4,0,0]});
 stage.noai(foe);stage.command("attribute "+foe.ref.split("/")[0]+" minecraft:generic.scale base set 3");stage.provoke(caster,foe);
 stage.until(700,()=>stage.damageTo(foe)>0&&stage.hadMobEffect(foe,"world_combat:status/hobbled"),function(){
  stage.setPp(caster,"lowsweep",0);stage.expect(stage.casts("lowsweep",caster)>0,"low sweep reached a near foot on a large native body");
  stage.expect(stage.damageTo(foe)>0,"the low body-volume intersection dealt the strike");
  stage.expect(stage.hadMobEffect(foe,"world_combat:status/hobbled"),"the actual contact applied its ordinary hobble");
  stage.note("A scaled golem whose centre lies beyond low-sweep reach was selected at its actual reachable foot. Airborne and angular misses are covered by neutral geometry fixtures.");stage.done();
 },"large native feet");
});
