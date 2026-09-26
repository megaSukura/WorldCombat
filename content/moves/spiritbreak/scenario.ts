Smoke.scenario("spiritbreak",function(stage){
 const caster=stage.pokemon({species:"grimmsnarl",level:40,moves:["spiritbreak"],at:[0,0,0]}),target=stage.mob({type:"minecraft:iron_golem",at:[2.5,0,0]});stage.noai(target);stage.provoke(caster,target);
 stage.until(700,()=>stage.damageTo(target)>0&&(stage.stages(target).spa||0)<0,function(){stage.setPp(caster,"spiritbreak",0);
  stage.expect(stage.damageTo(target)>0,"the real close palm dealt its strike");stage.expect((stage.stages(target).spa||0)<0,"the target's actual Special Attack stage fell");
  stage.note("Actual palm damage and Special Attack reduction verified. This scene has no hostile shot, so active palm interception and its visuals remain manual checks alongside root native protection fixtures.");stage.done();
 },"real palm and Special Attack reduction");
});
