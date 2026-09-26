/** First prove native regeneration is active, then observe its suppression during the owned ward. */
Smoke.scenario("healblock",function(stage){
 const caster=stage.pokemon({species:"gothorita",level:32,moves:["healblock"],at:[-3,0,0]}),foe=stage.mob({type:"minecraft:cow",at:[1,0,0]});
 stage.noai(foe);stage.after(2,function(){stage.setPp(caster,"healblock",0);
 stage.hurt(foe,6,"minecraft:magic",{source:caster});const injured=foe.health();
 stage.command("effect give "+foe.ref.split("/")[0]+" minecraft:regeneration 40 1 true");
 stage.after(30,function(){
  stage.expect(foe.health()>injured,"native regeneration really healed before the ward");
  stage.setPp(caster,"healblock",20);stage.provoke(caster,foe);
  stage.until(700,()=>stage.hasMobEffect(foe,"world_combat:status/healblock"),function(){
   stage.setPp(caster,"healblock",0);stage.hurt(foe,3,"minecraft:magic",{source:caster});const held=foe.health();
   stage.after(35,function(){stage.expect(foe.health()<=held+.001,"the same native regeneration is blocked while warded");
    stage.note("Regeneration first raised an injured cow's HP, then failed to raise it during the actual carrier. Direct phase HP behavior belongs to the native host fixture.",{injured,held,after:foe.health()});stage.done();});
  },"native healing ward");
 });
 });
});
