namespace PokemonSkills {
    const aerialaceScene = "world_combat:move_aerialace";
    const coords = LivingActions.coordinates;
    const dot3 = (a: CombatPoint, b: CombatPoint) => a.x()*b.x()+a.y()*b.y()+a.z()*b.z();

    /** AI and execution share the same limited flank route; native sweeps decide actual movement. */
    export function aerialaceRoute(world: CombatWorld, actor: CombatActor, target: CombatActor | null,
        at: CombatPoint, direction: CombatPoint, budget: number): { goal: CombatPoint; waypoint: CombatPoint; side: CombatPoint; ready: boolean } {
        const body = world.observe(actor)!;
        const start=body.position(), delta=at.minus(start), grounded=body.grounded();
        const forward=grounded?WorldGeometry.flatUnit(delta,direction):WorldGeometry.basis(delta,direction).forward;
        const side=WorldGeometry.basis(forward).right, outward=budget-Math.min(.9,budget*.24);
        const foe=target?world.observe(target):null;
        const preferred=foe&&dot3(at.minus(foe.position()),side)<-.05?-1:1;
        function candidate(sign:number):CombatPoint {
            let goal:CombatPoint;
            if(foe){
                const half=foe.boundsMax().minus(foe.boundsMin()).scale(.5);
                const depth=Math.abs(forward.x())*half.x()+Math.abs(forward.y())*half.y()+Math.abs(forward.z())*half.z();
                const width=Math.abs(side.x())*half.x()+Math.abs(side.y())*half.y()+Math.abs(side.z())*half.z();
                goal=foe.position().minus(forward.scale(depth)).plus(forward.scale(Math.min(depth*1.2,.7+body.width()*.5)))
                    .plus(side.scale(sign*(width+body.width()*.5+.12)));
            }else{
                const length=Math.min(outward,Math.max(.3,delta.length()));
                goal=start.plus(forward.scale(length)).plus(side.scale(sign*Math.min(.6,length*.2)));
            }
            if(grounded)goal=WorldCombat.point(goal.x(),start.y(),goal.z());
            const travel=goal.minus(start);
            return travel.length()>outward?start.plus(travel.unit().scale(outward)):goal;
        }
        function free(goal:CombatPoint):boolean {
            const feet=goal.minus(WorldCombat.point(0,body.height()*.5,0));
            if(!world.freeSpace(feet,body.width(),body.height()))return false;
            if(grounded&&!WorldGeometry.blockHit(world,feet.plus(WorldCombat.point(0,.15,0)),feet.minus(WorldCombat.point(0,.8,0))))return false;
            return true;
        }
        function route(goal:CombatPoint, sign:number):{goal:CombatPoint;waypoint:CombatPoint;side:CombatPoint;ready:boolean} {
            const n=side.scale(sign), sideDistance=Math.max(0,dot3(goal.minus(start),n));
            const waypoint=start.plus(n.scale(sideDistance));
            const first=waypoint.minus(start).length(), last=goal.minus(waypoint), allowed=Math.max(0,outward-first);
            const end=last.length()>allowed?waypoint.plus(last.unit().scale(allowed)):goal;
            return {goal:end,waypoint,side:n,ready:first+last.length()<=outward+.01&&free(waypoint)&&free(end)
                &&WorldGeometry.blockHit(world,start,waypoint)===null&&WorldGeometry.blockHit(world,waypoint,end)===null};
        }
        const first=candidate(preferred);
        const primary=route(first,preferred);if(primary.ready)return primary;
        const alternate=route(candidate(-preferred),-preferred);return alternate.ready?alternate:primary;
    }

    define({
        freeMovement:true,id:"aerialace",name:"燕返",
        description:"向目标侧翼掠步，随即回身反斩。伤害只发生在回刀经过的地方；目标能躲开，墙会截短路线。回刀后留在侧翼，不退回原地。",
        uses:["侧掠后回身反打","从敌人正面移向侧翼","在短回刀经过的位置斩击"],
        kind:"aim",range:4,maxRange:9,prepare:5,active:0,recover:7,cooldown:26,style:"slash",
        defaults:{skim:false,ai:{maxChase:11,skirmish:true,leaveStation:true}},fields:[],
        indicator:(config,pokemon)=>({radius:p("aerialace","laneWidth",pokemon),geometry:"line",style:"slash",color:0xBFE6FF,label:"燕返"}),
        resolve:(pokemon,config,world,actor,attributes)=>{
            const context:NumberContext={pokemon,skill:skills["aerialace"],detail:{values:config},world,actor,attributes};
            return {prepare:Math.max(2,Math.round(p("aerialace","prepare",context)))+(config&&config.skim?2:0),
                recover:p("aerialace","recover",context),cooldown:p("aerialace","cooldown",context)+(config&&config.skim?4:0),
                range:p("aerialace","pursuit",context)*.4};
        },
        windup:(action,config,prepare)=>{
            action.present(aerialaceScene+":gather",aerialaceScene,1,action.origin(),JSON.stringify({moment:"gather",windup:prepare}));
            return prepare;
        },
        execute:(action,_move,_config,done)=>{
            const scenes=WorldFeedback.actionScenes(aerialaceScene),world=action.world(),actor=action.actor();
            const self=world.observe(actor);if(!self){done(action);return;}
            const budget=p("aerialace","pursuit",action),speed=p("aerialace","dashSpeed",action),width=p("aerialace","laneWidth",action);
            const power=p("aerialace","returnPower",action),reserve=Math.min(.9,budget*.24),outward=budget-reserve;
            const route=aerialaceRoute(world,actor,action.target(),action.targetPosition(),aim(action),budget);
            const hitSet:{[key:string]:boolean}=Object.create(null);
            let spent=0,landed=false,incoming=WorldGeometry.flatUnit(aim(action)),movedOnce=false,corner=false;
            function streak(current:CombatAction,from:CombatPoint,to:CombatPoint,moment:string):void {
                if(to.minus(from).length()<.001)return;
                WorldFeedback.emit(current.world(),aerialaceScene,1,to,{moment,path:[coords(from),coords(to)]},6);
            }
            function finish(current:CombatAction):void {
                if(!landed)WorldFeedback.text(current.world(),current.origin(),"world_combat.move.aerialace.text.miss",[],16);
                scenes.finish(current,done);
            }
            function fold(current:CombatAction):void {
                if(!movedOnce){finish(current);return;}
                const at=current.origin(),base=WorldGeometry.basis(incoming).right;
                const side=dot3(base,route.side)<0?base.scale(-1):base;
                const reverse=incoming.scale(-1).minus(side.scale(.5)).unit();
                const distance=Math.min(reserve,budget-spent),thickness=Math.max(.12,width*.28);
                const outer=side.scale(self!.width()*.4+width*.3);
                let tip=at.plus(outer),tick=0;
                current.face(at.plus(reverse),180,90);
                function cut(next:CombatAction):void {
                    const scope=next.world(),body=scope.observe(actor);if(!body){finish(next);return;}
                    const previous=tip,t=(++tick)/3;
                    next.moveSweep(reverse.scale(distance/3),Math.min(.2,width*.3));
                    const centre=next.origin();
                    const desired=centre.plus(outer.scale(1-t)).minus(side.scale((self!.width()*.5+width*.7)*t))
                        .minus(incoming.scale(width*.5*t));
                    const reachBlock=WorldGeometry.blockHit(scope,centre,desired);tip=reachBlock?reachBlock.position():desired;
                    const bladeBlock=WorldGeometry.blockHit(scope,previous,tip);if(bladeBlock)tip=bladeBlock.position();
                    streak(next,previous,tip,"return");
                    WorldGeometry.selectBodies(scope,WorldGeometry.bodySegment(previous,tip,thickness),(victim,facts)=>{
                        const key=String(victim.ref());
                        if(String(victim.ref())===String(actor.ref())||facts.friendly()||hitSet[key])return;
                        const contact=WorldGeometry.closestOnSegment(facts.position(),previous,tip);
                        if(WorldGeometry.blockHit(scope,centre,contact))return;
                        hitSet[key]=true;
                        if(hurt(next,victim,"aerialace",power,{segment:"returnPower",contact:true,slice:true})){
                            landed=true;
                            WorldFeedback.emit(scope,aerialaceScene,1,contact,{moment:"hit"},8);
                            scope.sound("cobblemon:impact.flying",contact,14,"{}");
                        }
                    });
                    next.face(centre.plus(reverse),180,90);
                    if(tick<3&&!bladeBlock)next.after(1,cut);else finish(next);
                }
                current.after(1,cut);
            }
            function ingress(current:CombatAction):void {
                const scope=current.world(),body=scope.observe(actor);if(!body){finish(current);return;}
                const from=body.position(),delta=(corner?route.goal:route.waypoint).minus(from),remaining=outward-spent;
                if(delta.length()<.05){if(!corner){corner=true;ingress(current);}else fold(current);return;}
                if(remaining<.01){fold(current);return;}
                const step=delta.unit().scale(Math.min(delta.length(),remaining,speed));
                const sweep=sweepStep(current,step,Math.min(.2,width*.3));
                let escaping=false;
                // Vanilla living bodies can already overlap when a close-range order begins. The harmless
                // lateral ingress may separate them using native physical collision rather than another hit stop.
                if(!corner&&sweep.moved<.001&&sweep.hit.hitEntity()){
                    const other=sweep.hit.target(),bounds=other?scope.observe(other):null;
                    if(bounds){
                        const a=body.boundsMin(),b=body.boundsMax(),c=bounds.boundsMin(),d=bounds.boundsMax();
                        if(a.x()<d.x()-.001&&b.x()>c.x()+.001&&a.y()<d.y()-.001&&b.y()>c.y()+.001&&a.z()<d.z()-.001&&b.z()>c.z()+.001){
                            scope.displace(actor,step);escaping=true;
                        }
                    }
                }
                const actual=current.origin().minus(from);
                spent+=actual.length();
                if(actual.length()>.01){incoming=self!.grounded()?WorldGeometry.flatUnit(actual,incoming):actual.unit();movedOnce=true;}
                streak(current,from,current.origin(),"dash");
                current.face(current.origin().plus(incoming),90,60);
                if(sweep.hit.blocked()||sweep.hit.hitEntity()&&!escaping||actual.length()<.02)fold(current);
                else if(delta.length()<=speed+.02){if(!corner){corner=true;current.after(1,ingress);}else fold(current);}
                else current.after(1,ingress);
            }
            sound(action,"cobblemon:move.aerialace.actor_1");ingress(action);
        }
    });
}
