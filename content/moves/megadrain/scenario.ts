Smoke.scenario("megadrain",function(stage){
 const caster=stage.pokemon({species:"oddish",level:30,moves:["megadrain"],at:[0,0,0]}),target=stage.mob({type:"minecraft:husk",at:[6,0,0]});let baseline=0;
 stage.noai(target);stage.command("attribute "+target.ref.split("/")[0]+" minecraft:generic.max_health base set 120");stage.command("data merge entity "+target.ref.split("/")[0]+" {Health:120f}");
 stage.after(2,function(){stage.hurt(caster,18,"minecraft:magic",{source:target});baseline=caster.health();stage.provoke(caster,target);});
 stage.until(800,()=>stage.damageTo(target)>0,function(){
  stage.setPp(caster,"megadrain",0);stage.expect(caster.health()<=baseline+.01,"impact did not heal immediately");
  stage.until(180,()=>caster.health()>baseline+.1,function(){
   stage.expect(caster.health()>baseline,"a returned pod reached its owner and healed");stage.expect(stage.hits(caster)<=3,"the attached pod retained its finite pulse budget");
   stage.note("Actual delayed recovery and pulse budget verified. Wall-stopped collection, disappearance and weaving while recovering are manual checks.");stage.done();
  },"real life-pod collection");
 },"seed pod hit");
});
