namespace PokemonSkills {
    function aerialaceLanding(context:WorldBehavior.Context,target:WorldMethods.Subject):boolean {
        return CompanionBehavior.observedFlag(context,"aerialace:flank:"+target.ref,()=>{
            const world=CompanionBehavior.world(context),source=world.source(),foe=world.actor(target.ref);
            const self=world.observe(source);if(!self||!foe)return false;
            const at=CompanionBehavior.point(target.point),delta=at.minus(self.position());
            const route=aerialaceRoute(world,source,foe,at,delta,p("aerialace","pursuit",world));
            if(!route.ready)return false;
            const width=p("aerialace","laneWidth",world),reserve=Math.min(2.4,p("aerialace","pursuit",world)*.25);
            const contact=world.closestPoint(foe,route.goal);
            return contact.minus(route.goal).length()<=self.width()*.5+p("aerialace","bladeReach",world)+reserve
                &&WorldGeometry.blockHit(world,route.goal,contact)===null;
        });
    }
    CompanionBehavior.registerUse("aerialace",{
        protocols:["world_combat:attack"],
        reach:(context,capability)=>capability.data.range,
        available:(context,capability,purpose,target)=>{
            if(context.facts.mounted)return false;
            return !target||CompanionBehavior.distance(CompanionBehavior.source(context).point,target.point)<=CompanionBehavior.ai<number>(capability,"maxChase",11);
        },
        accepts:(context,capability,target)=>!target.friendly&&target.health>0&&target.visible,
        priority:(context,capability,target)=>{
            if(!target)return 0;
            const self=CompanionBehavior.source(context),gap=CompanionBehavior.distance(self.point,target.point);
            if(gap>capability.data.range)return 12;
            if(!aerialaceLanding(context,target))return 8;
            let score=24;
            if(CompanionBehavior.ai<boolean>(capability,"skirmish",true)){
                const velocity=CompanionBehavior.velocity(context,target);
                if(velocity&&(velocity[0]*(self.point[0]-target.point[0])+velocity[2]*(self.point[2]-target.point[2]))>.02)score+=12;
            }
            return score;
        }
    });
    addPreferences("aerialace",{},[
        field(pathOf("skim"),"低掠","boolean",{help:"更宽、更轻、总换位距离稍短，起手与冷却更长；关闭后较窄而重。"}),
        field(pathOf("ai.maxChase"),"接战距离","number",{min:4,max:20,step:1,help:"在这个距离内才考虑走近并侧掠回刀。"}),
        field(pathOf("ai.skirmish"),"侧翼反打","boolean",{help:"有可达侧翼且敌人向自己逼近时，更倾向用燕返移开正面并回刀。"}),
        field(pathOf("ai.leaveStation"),"驻守时允许离位","boolean",{help:"允许为侧掠回刀离开当前守位。"})
    ]);
}
