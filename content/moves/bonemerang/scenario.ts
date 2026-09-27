Smoke.scenario("bonemerang",function(stage){
 const caster=stage.pokemon({species:"cubone",level:30,moves:["bonemerang"],at:[0,0,0]}),target=stage.mob({type:"minecraft:iron_golem",at:[5,0,0]});stage.noai(target);stage.provoke(caster,target);
 stage.until(900,()=>stage.damageTo(target)>0,function(){stage.setPp(caster,"bonemerang",0);stage.after(65,function(){
  stage.expect(stage.damageTo(target)>0,"the actual flying bone contacted an enemy");stage.expect(stage.hits(caster)===2,"the outward pass and the return pass each settle their own contact on the same stationary enemy");
  stage.note("Real bone contact and two separate per-pass strikes verified. Changing the return line by sidestepping, breaking the bone and wall shatter remain manual spatial checks.",{hits:stage.hits(caster),damage:stage.damageTo(target)});stage.done();
 });},"bone contact");
});
