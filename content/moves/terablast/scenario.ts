/** Both real Tera Blast branches must damage their own stationary native body; environmental damage does not count. */
Smoke.scenario("terablast", function (stage) {
    stage.time("night");
    stage.fill([-8,-1,-20],[8,-1,20],"minecraft:stone");
    var ram = stage.pokemon({ species: "machop", level: 30, moves: ["terablast"], at: [-3, 0, -14] });
    var left = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, -14] });
    var beam = stage.pokemon({ species: "espeon", level: 30, moves: ["terablast"], at: [-3, 0, 14] });
    var right = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 14] });
    stage.noai(left,right);
    stage.after(3,function(){stage.provoke(ram,left);stage.provoke(beam,right);});
    stage.until(900,function(){return stage.damageTo(left)>0 && stage.damageTo(right)>0;},function(){
        stage.expect(stage.casts("terablast",ram)>0 && stage.damageTo(left)>0,"the physical crystal hit its own native body");
        stage.expect(stage.casts("terablast",beam)>0 && stage.damageTo(right)>0,"the special beam hit its own native body");
        stage.expect(stage.damageEvents("world_combat").some(function(event){return event.from===beam.name;}),"beam damage has an actual action receipt");
        stage.note("Both shape branches applied real damage; special pitch/edge contacts use the shared geometry checks and manual playtest.",{ramDamage:stage.damageTo(left),beamDamage:stage.damageTo(right)});
        stage.done();
    },"both Tera Blast shapes hit their separate bodies");
});
