namespace PokemonSkills {
    const scene="world_combat:move_swordsdance", carrierId="world_combat:swordsdance_hone";
    define({
        freeMovement:true,id:"swordsdance",cooldownParameter:"wait",name:"剑舞",
        description:"三柄剑随舞步绕身升起，合剑时提高物攻。可以原地完成，也可以缓步前压；舞步被打断时，本次强化尚未获得。",
        uses:["在接战空隙强化接下来的物理攻势","一边缓步前压一边完成剑舞","根据交战空隙选择叠加强化或立即攻击"],
        kind:"self",range:1,maxRange:1,prepare:8,active:1,recover:6,cooldown:110,style:"blade",stationary:true,
        defaults:{press:false,ai:{maxChase:14,minGap:3}},fields:[flag("press","进逼")],
        indicator:()=>({radius:0,geometry:"area",style:"blade",color:0xDCE8FF,label:"剑舞"}),
        resolve:(pokemon,config,world,actor,attributes)=>{
            const context:NumberContext={pokemon,skill:skills["swordsdance"],detail:{values:config},world,actor,attributes};
            return {prepare:p("swordsdance","tempo",context),recover:p("swordsdance","aftercast",context),
                cooldown:p("swordsdance","wait",context),active:1,range:1};
        },
        windup:(action,config,prepare)=>{
            action.present(scene+"/draw",scene,1,action.origin(),JSON.stringify({moment:"draw",start:action.sense().tick(),
                duration:prepare,arc:p("swordsdance","arc",action)}));return prepare;
        },
        execute:(action,_move,config,done)=>{
            const actor=action.actor(),world=action.world(),body=world.observe(actor);
            if(!body){done(action);return;}
            const scenes=WorldFeedback.actionScenes(scene),duration=Math.max(1,Math.round(p("swordsdance","dance",action)));
            const arc=p("swordsdance","arc",action),start=world.tick();
            const stride=config&&config.press?p("swordsdance","step",action)/duration:0;
            const direction=WorldGeometry.flatUnit(action.direction(),WorldGeometry.facing(world,actor)||undefined);
            let age=0;
            function settle(current:CombatAction):void {
                const scope=current.world(),here=scope.observe(actor);if(!here){scenes.finish(current,done);return;}
                const before=NativeEffects.effectiveStage(scope,actor,"atk"),previous=MobEffects.read(scope,actor,carrierId);
                const carrier=MobEffects.apply(scope,actor,carrierId,Math.round(p("swordsdance","hone",current)),0);
                if(carrier){
                    const owned=NativeEffects.boostWindow(scope,actor,{atk:Math.round(p("swordsdance","rise",current))},
                        carrier.duration(),"world_combat:move/swordsdance",carrier,previous);
                    if(owned){
                        const levels=Math.max(0,NativeEffects.effectiveStage(scope,actor,"atk")-before);
                        WorldFeedback.onEffect(scope,owned,scene+"/hone",scene,1,here.position(),{moment:"hone",start:scope.tick(),arc});
                        WorldFeedback.text(scope,here.position(), "world_combat.move.swordsdance.text.honed",[levels],24);
                        scope.sound("cobblemon:move.swordsdance.actor",here.position(),16,"{}");
                    }else scope.removeMobEffect(actor,carrier.id(),carrier.key());
                }
                scenes.finish(current,done);
            }
            function dance(current:CombatAction):void {
                if(stride>0)current.world().displace(actor,direction.scale(stride));
                age++;
                if(age>=duration){settle(current);return;}
                current.after(1,dance);
            }
            scenes.show(action,"dance",body.position(),{moment:"dance",start,duration,arc});
            action.after(1,dance);
        }
    });
    WorldCombat.on("world_combat:move_swordsdance/fade","world_combat:mob_effect_removed","",event=>{
        if(String(JSON.parse(event.data()).id)!==carrierId)return;
        const world=event.world(),actor=event.actor(),body=world.observe(actor);
        if(!body||MobEffects.read(world,actor,carrierId))return;
        WorldFeedback.text(world,body.position(),"world_combat.move.swordsdance.text.faded",[],20);
    });
}
