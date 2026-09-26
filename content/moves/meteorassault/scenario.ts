Smoke.scenario("meteorassault",function(stage){
 const caster=stage.pokemon({species:"sirfetchd",level:45,moves:["meteorassault"],at:[0,0,0]}),a=stage.mob({type:"minecraft:husk",at:[1.8,0,0]});
 stage.noai(a);stage.provoke(caster,a);
 stage.until(900,()=>stage.hasMobEffect(caster,"world_combat:status/mustrecharge"),function(){
  stage.setPp(caster,"meteorassault",0);stage.expect(stage.damageTo(a)>0,"the extending spear reached its near contact");
  stage.expect(stage.hits(caster)===1,"one contacted body receives one combined strike");
  const before=stage.casts("meteorassault",caster);stage.after(12,function(){stage.expect(stage.casts("meteorassault",caster)===before,"exhaustion prevents another action");
   stage.note("Single-settlement spear and original exhaustion verified. Multiple aligned bodies and lateral evasion remain manual checks.",{near:stage.damageTo(a)});stage.done();});
 },"one extending thrust");
});
