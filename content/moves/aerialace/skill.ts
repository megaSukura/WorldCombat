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
        const side=WorldGeometry.basis(forward).right, outward=budget-Math.min(2.4,budget*.25);
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
        description:"向对手侧翼掠过，再回身挥出一道短斩。掠步会跟上附近目标，回身时朝向它的位置；敌人仍可躲开已经挥出的刀锋。",
        uses:["侧掠后回身反打","从敌人正面移向侧翼","在短回刀经过的位置斩击"],
        kind:"aim",range:7,maxRange:14,prepare:5,active:0,recover:7,cooldown:26,style:"slash",
        defaults:{skim:false,ai:{maxChase:11,skirmish:true,leaveStation:true}},fields:[],
        indicator:(config,pokemon)=>({radius:p("aerialace","laneWidth",pokemon),geometry:"line",style:"slash",color:0xBFE6FF,label:"燕返"}),
        resolve:(pokemon,config,world,actor,attributes)=>{
            const context:NumberContext={pokemon,skill:skills["aerialace"],detail:{values:config},world,actor,attributes};
            return {prepare:Math.max(2,Math.round(p("aerialace","prepare",context)))+(config&&config.skim?2:0),
                recover:p("aerialace","recover",context),cooldown:p("aerialace","cooldown",context)+(config&&config.skim?4:0),
                range:p("aerialace","pursuit",context)*.75};
        },
        windup:(action,config,prepare)=>{
            action.present(aerialaceScene+":gather",aerialaceScene,1,action.origin(),JSON.stringify({moment:"gather",windup:prepare}));
            return prepare;
        },
        execute:(action,_move,_config,done)=>{
            const scenes=WorldFeedback.actionScenes(aerialaceScene),world=action.world(),actor=action.actor();
            const self=world.observe(actor);if(!self){done(action);return;}
            const budget=p("aerialace","pursuit",action),speed=p("aerialace","dashSpeed",action),width=p("aerialace","laneWidth",action);
            const power=p("aerialace","returnPower",action),reserve=Math.min(2.4,budget*.25),outward=budget-reserve;
            let route=aerialaceRoute(world,actor,action.target(),action.targetPosition(),aim(action),budget);
            const aimedTarget=action.target();
            const hitSet:{[key:string]:boolean}=Object.create(null);
            let spent=0,landed=false,incoming=WorldGeometry.flatUnit(aim(action)),corner=false,steps=0;
            const maxSteps=Math.ceil(budget/speed)+10;
            function streak(current:CombatAction,from:CombatPoint,to:CombatPoint,moment:string):void {
                if(to.minus(from).length()<.001)return;
                WorldFeedback.emit(current.world(),aerialaceScene,1,to,{moment,path:[coords(from),coords(to)]},6);
            }
            function finish(current:CombatAction):void {
                if(!landed)WorldFeedback.text(current.world(),current.origin(),"world_combat.move.aerialace.text.miss",[],16);
                scenes.finish(current,done);
            }
            function fold(current:CombatAction):void {
                const at=current.origin(),scope=current.world();
                const foe=aimedTarget?scope.observe(aimedTarget):null;
                const aimAt=foe&&scope.clear(at,foe.position())?scope.closestPoint(aimedTarget!,at):current.targetPosition();
                // Lock the return at the actual turn point, after ordinary movement/knockback has happened.
                const toward=WorldGeometry.basis(aimAt.minus(at),incoming.scale(-1)).forward;
                const reverse=toward.minus(incoming.scale(.3)).unit();
                const distance=Math.min(reserve,Math.max(0,budget-spent));
                const length=self!.width()*.5+p("aerialace","bladeReach",current),thickness=width*.5;
                const right=WorldGeometry.basis(toward).right;
                let tick=0;
                current.face(at.plus(toward),180,90);
                function bladePoint(centre:CombatPoint,phase:number):CombatPoint {
                    const angle=(-.65+1.3*phase);
                    return centre.plus(toward.scale(Math.cos(angle)*length)).plus(right.scale(Math.sin(angle)*length));
                }
                function cut(next:CombatAction):void {
                    const access=next.world(),body=access.observe(actor);if(!body){return;}
                    const before=body.position();
                    access.displace(actor,reverse.scale(distance/3));
                    const centre=next.origin(),start=bladePoint(before,tick/3);tick++;
                    // The whole blade, from the body to its tip, sweeps the visible return arc.
                    // Subsegments share the rendered endpoints and never pass through a native wall.
                    let previous=start;
                    for(let part=1;part<=3;part++){
                        const t=(tick-1+part/3)/3,bladeBase=before.plus(centre.minus(before).scale(part/3)),desired=bladePoint(bladeBase,t);
                        const radialBlock=WorldGeometry.blockHit(access,bladeBase,desired);
                        let tip=radialBlock?radialBlock.position():desired;
                        const edgeBlock=WorldGeometry.blockHit(access,previous,tip);
                        if(edgeBlock)tip=edgeBlock.position();
                        streak(next,previous,tip,"return");
                        const shape=WorldGeometry.bodySegment(bladeBase,tip,thickness);
                        WorldGeometry.selectBodies(access,shape,(victim,facts)=>{
                            const key=String(victim.ref());
                            if(key===String(actor.ref())||facts.friendly()||hitSet[key])return;
                            const contact=access.closestPoint(victim,centre);
                            if(WorldGeometry.blockHit(access,centre,contact))return;
                            hitSet[key]=true;
                            if(hurt(next,victim,"aerialace",power,{segment:"returnPower",contact:true,slice:true})){
                                landed=true;
                                WorldFeedback.emit(access,aerialaceScene,1,contact,{moment:"hit"},8);
                                access.sound("cobblemon:impact.flying",contact,14,"{}");
                            }
                        });
                        previous=tip;
                    }
                    next.face(centre.plus(toward),180,90);
                    if(tick<3)next.after(1,cut);else finish(next);
                }
                current.after(1,cut);
            }
            function ingress(current:CombatAction):void {
                const scope=current.world(),body=scope.observe(actor);if(!body)return;
                const from=body.position(),foe=aimedTarget?scope.observe(aimedTarget):null;
                const remaining=outward-spent;
                if(++steps>maxSteps||remaining<.02){fold(current);return;}
                if(corner&&foe&&scope.clear(from,foe.position())){
                    // Recompute a bounded flank from current bodies; a shove does not send us back to an obsolete waypoint.
                    const updated=aerialaceRoute(scope,actor,aimedTarget,foe.position(),incoming,remaining+reserve);
                    if(dot3(updated.side,route.side)>0)route=updated;
                }
                const delta=(corner?route.goal:route.waypoint).minus(from);
                if(delta.length()<.08){if(!corner){corner=true;ingress(current);}else fold(current);return;}
                const step=delta.unit().scale(Math.min(delta.length(),remaining,speed));
                // This harmless pass uses Minecraft body movement; living contact is not an attack or an early finish.
                scope.displace(actor,step);
                const actual=current.origin().minus(from);spent+=actual.length();
                if(actual.length()>.01)incoming=WorldGeometry.basis(actual,incoming).forward;
                streak(current,from,current.origin(),"dash");current.face(current.origin().plus(incoming),90,60);
                if(actual.length()<Math.min(.03,step.length()*.2)){fold(current);return;}
                if(!corner&&delta.length()<=speed+.08){corner=true;current.after(1,ingress);}
                else if(corner&&delta.length()<=speed+.08)fold(current);
                else current.after(1,ingress);
            }
            sound(action,"cobblemon:move.aerialace.actor_1");ingress(action);
        }
    });
}
