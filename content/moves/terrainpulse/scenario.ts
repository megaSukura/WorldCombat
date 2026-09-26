Smoke.scenario("terrainpulse",function(stage){
 const caster=stage.pokemon({species:"snorlax",level:30,moves:["terrainpulse"],at:[0,0,0]}),near=stage.mob({type:"minecraft:iron_golem",at:[3,0,0]}),far=stage.mob({type:"minecraft:iron_golem",at:[10,0,0]});
 stage.noai(near,far);stage.fill([6,-4,-3],[7,-1,3],"minecraft:air");stage.provoke(caster,near);
 stage.until(800,()=>stage.damageTo(near)>0,function(){stage.setPp(caster,"terrainpulse",0);stage.after(30,function(){
  stage.expect(stage.damageTo(near)>0,"the supported ground wave struck a native body");
  stage.expect(stage.damageTo(far)===0,"the finite wave does not cross the missing support");
  stage.note("Native body contact and bounded travel up to missing ground verified. Terrain element and adjacent resonance width are manual combination checks.");stage.done();});
 },"finite ground wave");
});
