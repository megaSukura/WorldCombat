/** An upward cone includes both sides of the 3D cone, including the old flat prefilter's back side. */
Smoke.scenario("hypervoice",function(stage){
    stage.fill([-8,-1,-8],[8,-1,8],"minecraft:stone");
    var caster=stage.pokemon({species:"exploud",level:45,moves:["hypervoice"],at:[0,0,0]});
    var above=stage.mob({type:"minecraft:cow",at:[0,4,0]});
    var negative=stage.mob({type:"minecraft:pig",at:[-.8,4,-.8]});
    var positive=stage.mob({type:"minecraft:sheep",at:[.8,4,.8]});
    [above,negative,positive].forEach(function(body){stage.command("data merge entity "+body.ref.split("/")[0]+" {NoAI:1b,NoGravity:1b}");});
    stage.after(3,function(){stage.provoke(caster,above);});
    stage.until(700,function(){return stage.casts("hypervoice",caster)>0;},function(){
        stage.setPp(caster,"hypervoice",0);
        stage.after(2,function(){
            stage.expect(stage.damageTo(above)>0,"the sound cone was aimed upward at its selected body");
            stage.expect(stage.damageTo(negative)>0,"the upper cone includes the negative horizontal side");
            stage.expect(stage.damageTo(positive)>0,"the upper cone includes the positive horizontal side");
            stage.note("Actual 3D cone membership checked; sound still keeps its existing cover policy.");stage.done();
        });
    },"the upward sound cone commits");
});
