/** Targets must still intersect the current tail sector, including on the second side of the sweep. */
Smoke.scenario("breakingswipe",function(stage){
    stage.fill([-10,-1,-10],[10,-1,20],"minecraft:stone");
    var caster=stage.pokemon({species:"haxorus",level:45,moves:["breakingswipe"],at:[-1.5,0,0]});
    var target=stage.mob({type:"minecraft:iron_golem",at:[1.5,0,0]});
    stage.noai(target);stage.provoke(caster,target);
    var attack=stage.attribute(target,"minecraft:generic.attack_damage");
    stage.until(600,function(){return stage.casts("breakingswipe",caster)>0;},function(){
        stage.setPp(caster,"breakingswipe",0);
        stage.command("tp "+target.ref.split("/")[0]+" ~1.5 ~ ~16");
        stage.after(15,function(){
            stage.expect(stage.damageTo(target)===0,"leaving before the tail arrived avoided the cached-bearing hit");
            stage.command("tp "+target.ref.split("/")[0]+" ~1.5 ~ ~");
            stage.command("tp "+caster.ref.split("/")[0]+" ~-1.5 ~ ~");
            stage.setPp(caster,"breakingswipe",1);stage.provoke(caster,target);
            stage.after(10,function(){stage.provoke(caster,target);});
            stage.until(700,function(){return stage.damageTo(target)>0;},function(){
                stage.expect(stage.casts("breakingswipe",caster)===2,"the next fixed sweep made real contact");
                stage.expect(stage.hits(target,true)===1,"the sweep settled the target only once");
                stage.expect(stage.attribute(target,"minecraft:generic.attack_damage")<attack,"real contact lowered Attack");
                stage.note("Current tail contact and dodge verified; wide crowd presentation remains manual.");stage.done();
            },"the next sweep contacts the returned body");
        });
    },"the first tail sweep commits");
});
