Smoke.scenario("roar",function(stage){
 const caster=stage.pokemon({species:"arcanine",level:40,moves:["roar"],at:[0,0,0]}),foe=stage.mob({type:"minecraft:husk",at:[2.3,0,0]});
 stage.after(2,function(){stage.provoke(caster,foe);stage.provoke(foe,caster);});let markedAt=0,marked:number[]=[];
 stage.until(800,function(){if(!markedAt&&stage.hasMobEffect(foe,"world_combat:roar_routed")){markedAt=stage.tick();marked=foe.position();stage.setPp(caster,"roar",0);}return markedAt>0&&Math.sqrt(Math.pow(foe.position()[0]-marked[0],2)+Math.pow(foe.position()[2]-marked[2],2))>.65;},function(){
  stage.expect(stage.hasMobEffect(foe,"world_combat:roar_routed"),"the moving receiver still owns accepted fear");
  stage.expect(stage.damageEvents("world_combat").length===0,"the roar dealt no action damage");
  stage.command("effect clear "+foe.ref.split("/")[0]+" world_combat:roar_routed");const before=foe.position(),toward=caster.position().map((n,i)=>n-before[i]);
  stage.after(4,function(){stage.provoke(foe,caster);stage.after(30,function(){
   const after=foe.position(),dot=(after[0]-before[0])*toward[0]+(after[2]-before[2])*toward[2];
   stage.expect(!stage.hasMobEffect(foe,"world_combat:roar_routed"),"native fear carrier was cleared");stage.expect(dot>.3,"the released mob can navigate toward its native target again");
   stage.note("Real native escape movement, zero roar damage and resumed target navigation verified. Walls, threatened allies and fear-immune Bosses remain manual checks.",{travel:stage.travelled(foe)});stage.done();
  });});
 },"receiver-owned native fear path");
});
