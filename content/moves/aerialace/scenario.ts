Smoke.scenario("aerialace",stage=>{
    stage.fill([-9,-1,-8],[9,-1,8],"minecraft:stone");
    stage.time("day");stage.weather("clear");
    const caster=stage.pokemon({species:"scyther",level:40,moves:["aerialace"],at:[-2,0,0]});
    const foe=stage.mob({type:"minecraft:iron_golem",at:[2,0,0]});
    stage.noai(foe);stage.after(1,()=>{stage.provoke(caster,foe);stage.hurt(caster,1,"minecraft:mob_attack",{source:foe});});
    stage.until(1000,()=>stage.casts("aerialace",caster)>0,()=>{
        const samples:number[][]=[caster.position()], damages:number[]=[stage.damageTo(foe)];
        let elapsed=0;
        function follow():void {
            samples.push(caster.position());damages.push(stage.damageTo(foe));
            if(++elapsed<16){stage.after(1,follow);return;}
            const receipts=stage.damageEvents("world_combat.action").filter(hit=>hit.to===foe.name&&hit.from===caster.name);
            let reverse=-1;
            for(let i=2;i<samples.length;i++){
                const a=[samples[i-1][0]-samples[i-2][0],samples[i-1][2]-samples[i-2][2]];
                const b=[samples[i][0]-samples[i-1][0],samples[i][2]-samples[i-1][2]];
                const length=Math.sqrt((a[0]*a[0]+a[1]*a[1])*(b[0]*b[0]+b[1]*b[1]));
                if(length>.002&&a[0]*b[0]+a[1]*b[1]<-.5*length){reverse=i;break;}
            }
            let firstDamage=-1;for(let i=0;i<damages.length;i++)if(damages[i]>0){firstDamage=i;break;}
            stage.expect(receipts.length===1,"the reverse cut settles once against the native mob");
            stage.expect(reverse>=0&&firstDamage>=reverse,"the body turns back before the blade deals damage");
            stage.note("Ingress and reverse positions per tick; damage begins on the return, one receipt per victim per cast.",{samples,damages,receipts,casts:stage.casts("aerialace",caster)});
            stage.done();
        }
        stage.after(1,follow);
    },"aerial ace commits");
});
