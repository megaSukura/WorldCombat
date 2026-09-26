Smoke.scenario("frenzyplant",function(stage){
 const caster=stage.pokemon({species:"venusaur",level:45,moves:["frenzyplant"],at:[0,0,0]}),foe=stage.mob({type:"minecraft:iron_golem",at:[6,0,0]});
 stage.noai(foe);stage.provoke(caster,foe);
 stage.until(800,()=>stage.damageTo(foe)>0&&stage.hasMobEffect(caster,"world_combat:status/mustrecharge"),function(){
  stage.setPp(caster,"frenzyplant",0);stage.expect(stage.hits(caster)===1,"the converging arms share one per-target strike budget");
  stage.expect(stage.changedBlocks().length===0,"root arms leave real terrain intact");
  stage.expect(stage.hasMobEffect(caster,"world_combat:status/mustrecharge"),"the original exhaustion follows the root sweep");
  stage.note("Actual root-tip contacts, per-target deduplication and terrain preservation verified. Gaps between arms and wall obstruction are manual spatial checks.");stage.done();
 },"finite root arms");
});
