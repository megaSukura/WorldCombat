Smoke.scenario("focusblast",function(stage){
 const caster=stage.pokemon({species:"alakazam",level:40,moves:["focusblast"],at:[0,0,0]}),target=stage.mob({type:"minecraft:iron_golem",at:[7,0,0]});stage.noai(target);stage.provoke(caster,target);
 stage.until(800,()=>stage.casts("focusblast",caster)>0,function(){const committed=stage.tick();stage.setPp(caster,"focusblast",0);
  stage.until(90,()=>stage.damageTo(target)>0,function(){
   stage.expect(stage.tick()-committed>=6,"AI kept its short stability window before firing");stage.expect(stage.hits(caster)===1,"one released heavy ball dealt one strike");
   stage.note("AI stability window and real projectile strike verified. Held mouse aim, early key release and changing scatter are manual checks; the release channel has root native runtime coverage.");stage.done();
  },"bounded charged projectile");
 },"focus blast commit");
});
