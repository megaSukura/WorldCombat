/** A newly placed wall clips later passes of the already committed fixed beam. */
Smoke.scenario("icebeam", function (stage) {
    stage.fill([-10,-1,-8],[10,-1,8],"minecraft:stone");
    var caster=stage.pokemon({species:"glaceon",level:40,moves:["icebeam"],at:[-6,0,0]});
    var front=stage.mob({type:"minecraft:iron_golem",at:[0,0,0]});
    var late=stage.mob({type:"minecraft:husk",at:[4,0,5]});
    stage.noai(front,late);stage.provoke(caster,front);
    stage.until(900,function(){return stage.casts("icebeam",caster)>0;},function(){
        stage.setPp(caster,"icebeam",0);
        stage.fill([2,0,-3],[2,5,3],"minecraft:stone");
        stage.command("tp "+late.ref.split("/")[0]+" ~4 ~ ~");
        stage.after(30,function(){
            stage.expect(stage.damageTo(front)>0,"the original clear beam hit the front body");
            stage.expect(stage.damageTo(late)===0,"the new wall protected a later body entering the old beam route");
            stage.expect(stage.casts("icebeam",caster)===1,"one paid beam owns the repeated passes");
            stage.note("Only the later-pass wall boundary is asserted; moving beam appearance remains a playtest observation.");
            stage.done();
        });
    },"ice beam commits");
});
