Smoke.scenario("sweetscent",function(stage){
 const caster=stage.pokemon({species:"oddish",level:35,moves:["sweetscent"],at:[0,0,0]}),a=stage.mob({type:"minecraft:husk",at:[4,0,0]}),b=stage.mob({type:"minecraft:husk",at:[4,0,1]});
 stage.noai(a,b);stage.command("effect give "+b.ref.split("/")[0]+" minecraft:glowing 60 0 true");stage.provoke(caster,a);
 stage.until(700,()=>stage.hasMobEffect(a,"world_combat:status/scented")&&stage.hasMobEffect(b,"world_combat:status/scented"),function(){
  stage.setPp(caster,"sweetscent",0);stage.expect(stage.stages(a).evasion<0,"scent contributes legal temporary evasion loss");
  const before=a.health();stage.hurt(a,4,"minecraft:magic",{source:caster});stage.after(2,function(){
   stage.expect(Math.abs(before-a.health()-4)<.01,"scent no longer amplifies generic damage");
   [a,b].forEach(actor=>{stage.command("execute as "+actor.ref.split("/")[0]+" at @s run tp @s ~8 ~ ~");stage.command("effect clear "+actor.ref.split("/")[0]+" world_combat:sweet_scent");});
   stage.after(7,function(){stage.expect(!stage.hasMobEffect(a,"minecraft:glowing")&&stage.hasMobEffect(b,"minecraft:glowing"),"own glow lease ends while outside glow remains");
    stage.note("Evasion, normal damage and external glowing coexistence verified; the moving scent trail is a manual visual check.");stage.done();});
  });
 },"scent and glow ownership");
});
