Smoke.scenario("swordsdance",stage=>{
    stage.fill([-10,-1,-8],[10,-1,8],"minecraft:stone");stage.time("day");
    const caster=stage.pokemon({species:"scyther",level:32,moves:["swordsdance"],at:[-3,0,0]});
    const foe=stage.mob({type:"minecraft:iron_golem",at:[7,0,0]});
    stage.noai(foe);stage.after(1,()=>{stage.prefer(caster,"swordsdance",{press:true});stage.provoke(caster,foe);});
    stage.until(1000,()=>stage.casts("swordsdance",caster)>0,()=>{
        const begun=stage.tick(),before=stage.stages(caster).atk||0;
        stage.expect(!stage.hasMobEffect(caster,"world_combat:swordsdance_hone"),"the dance must finish before granting its boost");
        stage.until(80,()=>stage.hadMobEffect(caster,"world_combat:swordsdance_hone"),()=>{
            stage.expect((stage.stages(caster).atk||0)>before,"closing the dance grants real attack stages");
            stage.note("Three swords close at the grant; displacement and window are actual state.",{duration:stage.tick()-begun,stages:stage.stages(caster),travel:stage.travelled(caster)});
            stage.done();
        },"dance completes its boost window");
    },"swords dance commits");
});
