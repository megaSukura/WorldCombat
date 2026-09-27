// A useful world-space reach, and a return cut after external motion, against two different bodies.
Smoke.scenario("aerialace", stage => {
    stage.fill([-12,-1,-8],[30,-1,8],"minecraft:stone");stage.time("night");
    const caster=stage.pokemon({species:"scyther",level:40,moves:["aerialace"],at:[-6,0,0]});
    const foe=stage.mob({type:"minecraft:iron_golem",at:[2,0,0]});stage.noai(foe);stage.after(1,()=>{stage.provoke(caster,foe);stage.hurt(caster,1,"minecraft:mob_attack",{source:foe});});
    stage.until(700,()=>stage.casts("aerialace",caster)>0,()=>{
        const a=caster.position(),b=foe.position(),gap=Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[2]-b[2],2));
        stage.setPp(caster,"aerialace",0);
        stage.after(35,()=>{
            const receipts=stage.damageEvents("world_combat.action").filter(hit=>hit.to===foe.name&&hit.from===caster.name);
            stage.expect(gap>4,"aerial ace starts at a useful approach distance beyond touching bodies");
            stage.expect(receipts.length===1,"the broad returning blade hits the golem once");
            const mobile=stage.pokemon({species:"charizard",level:50,moves:["aerialace"],at:[16,0,0]});
            const enemy=stage.mob({type:"minecraft:zombie",at:[23,0,0]});
            stage.command("attribute "+String(enemy.ref).split("/")[0]+" minecraft:generic.max_health base set 100");
            stage.command("data merge entity "+String(enemy.ref).split("/")[0]+" {Health:100.0f}");
            stage.hostile(mobile,enemy);stage.after(1,()=>stage.hurt(mobile,1,"minecraft:mob_attack",{source:enemy}));
            stage.until(600,()=>stage.casts("aerialace",mobile)>0,()=>{
                stage.setPp(mobile,"aerialace",0);
                stage.after(1,()=>stage.command("data merge entity "+String(mobile.ref).split("/")[0]+" {Motion:[-0.6d,0.12d,0.35d]}"));
                stage.after(38,()=>{
                    const hits=stage.damageEvents("world_combat.action").filter(hit=>hit.to===enemy.name&&hit.from===mobile.name);
                    stage.expect(stage.travelled(enemy)>.1,"the ordinary melee enemy was moving during the encounter");
                    stage.expect(hits.length===1,"the return cut still hits a moving normal-sized foe after external motion");
                    stage.note("The same move reaches from beyond body contact and returns against a moving mob after a native motion impulse; real visual reach is left to play.",{gap,hits,receipts});stage.done();
                });
            },"second aerial ace starts against the moving opponent");
        });
    },"aerial ace commits from a useful distance");
});
