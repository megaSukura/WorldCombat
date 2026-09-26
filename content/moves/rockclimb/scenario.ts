Smoke.scenario("rockclimb",function(stage){
 stage.fill([2,0,-2],[5,1,2],"minecraft:stone");stage.watch([-2,-1,-3],[6,2,3]);
 const caster=stage.pokemon({species:"donphan",level:45,moves:["rockclimb"],at:[0,0,0]}),target=stage.mob({type:"minecraft:husk",at:[3.2,2,0]});stage.noai(target);
 const base=caster.position()[1];let highest=base;
 stage.after(2,function(){stage.prefer(caster,"rockclimb",{vault:true});stage.provoke(caster,target);});
 stage.until(1000,function(){highest=Math.max(highest,caster.position()[1]);return stage.casts("rockclimb",caster)>0&&highest>base+1.8;},function(){
  stage.setPp(caster,"rockclimb",0);stage.after(12,function(){
   stage.expect(highest>base+1.8,"the body actually climbed the short native wall");
   stage.expect(stage.changedBlocks().length===0,"wall climbing left the terrain intact");
   stage.expect(stage.hits(caster)<=1,"only one real body-contact strike is possible");
   stage.note("Actual short-wall ascent, terrain preservation and finite strike budget verified. Sealed ceilings, exact crest route and manual free terrain aiming remain spatial play checks.",{height:highest-base,damage:stage.damageTo(target)});stage.done();
  });
 },"climb a real short wall");
});
