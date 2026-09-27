/** Pick a supported lateral point with a usable escape lane near melee pressure; station commands remain authoritative. */
namespace PokemonSkills {
    /** Real ground under the landing: a solid, non-liquid block just below the feet. */
    function doubleteamSupported(world: CombatWorld, feet: CombatPoint): boolean {
        const below=world.block(WorldCombat.point(feet.x(),feet.y()-0.15,feet.z()));
        if(below===null)return false;
        const id=String(below.id());
        return ["minecraft:air","minecraft:cave_air","minecraft:void_air","minecraft:water","minecraft:lava","minecraft:barrier"].indexOf(id)<0;
    }
    CompanionBehavior.registerUse(doubleteamId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 5; },
        target: function(context,item,target){
            const self=CompanionBehavior.source(context),threat=context.senses["world_combat:threat"];if(!threat)return null;
            const world=CompanionBehavior.world(context),dx=threat.point[0]-self.point[0],dz=threat.point[2]-self.point[2],length=Math.sqrt(dx*dx+dz*dz)||1;
            const width=self.width||.9,height=self.height||1.4;
            let best:any=null,bestScore=-1;
            for(let side=-1;side<=1;side+=2){
                const point=[self.point[0]-dz/length*3*side,self.point[1],self.point[2]+dx/length*3*side];
                const feet=WorldCombat.point(point[0],point[1]-height/2,point[2]);
                if(!world.freeSpace(feet,width,height))continue;
                if(!world.clear(CompanionBehavior.point(self.point),CompanionBehavior.point(point)))continue;
                if(!doubleteamSupported(world,feet))continue;
                // The side with real room past the landing is the safer lane, not just the first open one.
                const beyond=WorldCombat.point(feet.x()-dz/length*1.4*side,feet.y(),feet.z()+dx/length*1.4*side);
                let score=doubleteamSupported(world,beyond)?2:1;
                if(world.freeSpace(beyond,width,height))score+=1;
                if(score>bestScore){bestScore=score;best=JSON.parse(JSON.stringify(self));best.ref="";best.point=point;}
            }
            return best;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted || ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(capability,"leaveStation",false))) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "doubleteam")) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= Math.min(7,CompanionBehavior.ai<number>(capability, "maxChase", 18));
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context) {
            const threat=context.senses["world_combat:threat"];if(!threat)return 0;
            const self=CompanionBehavior.source(context),nearby=(context.facts.nearby as CompanionBehavior.Entity[])||[];
            let pursuers=0;
            for(let i=0;i<nearby.length;i++){const other=nearby[i];
                if(other.friendly||other.health<=0)continue;
                if(other.attacking===self.ref)pursuers++;
            }
            // Value tracks how many enemies actually chase the real body, not merely that one is nearby.
            let score=35+pursuers*16;
            if(threat.attacking===self.ref)score+=12;
            return Math.min(96,score);
        }
    });

    addPreferences(doubleteamId, { ai: { maxChase: 18, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 28, step: 1,
            help: "威胁进入这个距离内才考虑留影；调小只为贴身自卫，调大在更远处就做准备。" }),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
