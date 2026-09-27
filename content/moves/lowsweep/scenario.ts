Smoke.scenario("lowsweep",function(stage){
 const caster=stage.pokemon({species:"machop",level:30,moves:["lowsweep"],at:[0,0,0]}),foe=stage.mob({type:"minecraft:iron_golem",at:[4,0,0]});
 stage.noai(foe);stage.command("attribute "+foe.ref.split("/")[0]+" minecraft:generic.scale base set 3");stage.provoke(caster,foe);
 stage.until(700,()=>stage.damageTo(foe)>0&&stage.hadMobEffect(foe,"world_combat:status/hobbled"),function(){
  stage.setPp(caster,"lowsweep",0);stage.expect(stage.casts("lowsweep",caster)>0,"low sweep reached a near foot on a large native body");
  stage.expect(stage.damageTo(foe)>0,"a swept low ankle band intersected the body and dealt the strike");
  stage.expect(stage.hadMobEffect(foe,"world_combat:status/hobbled"),"the actual contact applied its ordinary hobble");
  stage.note("The low arc advances in thin ankle-height sub-bands that share their vertices with the client trail, so a scaled golem whose centre lies beyond reach is still selected at its actual reachable foot. Slow stages and the leg pin read the victim's real horizontal velocity: a stationary body only takes the base drop and is not pinned. Airborne bodies above the thin band are covered by neutral geometry fixtures.",{hobbled:stage.hadMobEffect(foe,"world_combat:status/hobbled")});stage.done();
 },"large native feet");
});
