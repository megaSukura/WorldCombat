/** Pick a native-clear lateral point near melee pressure; station commands remain authoritative. */
namespace PokemonSkills {
    CompanionBehavior.registerUse(doubleteamId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 5; },
        target: function(context,item,target){
            const self=CompanionBehavior.source(context),threat=context.senses["world_combat:threat"];if(!threat)return null;
            const world=CompanionBehavior.world(context),dx=threat.point[0]-self.point[0],dz=threat.point[2]-self.point[2],length=Math.sqrt(dx*dx+dz*dz)||1;
            for(let side=-1;side<=1;side+=2){
                const point=[self.point[0]-dz/length*3*side,self.point[1],self.point[2]+dx/length*3*side];
                const feet=WorldCombat.point(point[0],point[1]-(self.height||1.4)/2,point[2]);
                if(world.freeSpace(feet,self.width||.9,self.height||1.4)&&world.clear(CompanionBehavior.point(self.point),CompanionBehavior.point(point))){
                    const choice=JSON.parse(JSON.stringify(self));choice.ref="";choice.point=point;return choice;
                }
            }return null;
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
            return context.senses["world_combat:threat"] ? 90 : 0;
        }
    });

    addPreferences(doubleteamId, { ai: { maxChase: 18, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 28, step: 1,
            help: "威胁进入这个距离内才考虑留影；调小只为贴身自卫，调大在更远处就做准备。" }),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
