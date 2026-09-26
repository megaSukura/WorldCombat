/** A close, finite two-body carry uses collision-aware self motion and permission-aware hostile motion. */
namespace PokemonSkills {
    const skydropScene="world_combat:move_skydrop",skydropCarried="world_combat:skydrop_carried",skydropCarry="world_combat:skydrop_carry",skydropSelf="world_combat:skydrop_self",skydropRefused="world_combat:skydrop_refused";
    export function skydropMass(world:CombatWorld,target:CombatActor):number{
        if(String(target.domain())==="cobblemon")return Number(CobblemonCombat.pokemon(target).weight())/10;
        const body=world.observe(target);if(!body)return Infinity;
        const size=body.boundsMax().minus(body.boundsMin());return size.x()*size.y()*size.z()*80;
    }
    export function skydropEligible(world:CombatWorld,source:CombatActor,target:CombatActor,capacity:number,reach:number):boolean{
        if(!world.valid(source)||!world.valid(target)||world.friendly(target)||world.effects(target,skydropCarry).length||world.effects(target,skydropRefused).length)return false;
        const self=world.observe(source),body=world.observe(target);if(!self||!body)return false;
        if(skydropMass(world,target)>capacity||body.width()>Math.max(1.5,self.width()*1.5)||body.height()>Math.max(2.5,self.height()*1.5))return false;
        const resistance=world.attributeValue(target,"minecraft:generic.knockback_resistance");if(resistance&&resistance.value()>=1)return false;
        const closest=world.closestPoint(target,self.position());
        return closest.minus(self.position()).length()<=reach&&world.clear(self.position(),closest)&&!CombatStatus.has(world,target,"ingrain");
    }
    function skydropReset(world:CombatWorld,target:CombatActor):void{const native=world.nativeEntity(target);if(native)native.fallDistance=0;}
    function skydropSafeRelease(world:CombatWorld,target:CombatActor):void{
        if(!world.valid(target))return;skydropReset(world,target);const body=world.observe(target);
        if(body&&!body.grounded()&&!world.mobEffect(target,"minecraft:slow_falling"))MobEffects.apply(world,target,"minecraft:slow_falling",40,0);
    }
    WorldCombat.effect(skydropRefused,1,160,"actor",json=>json,EffectProtocols.unchanged);WorldCombat.effectHandler(skydropRefused,"start",function(){});
    WorldCombat.effect(skydropSelf,1,260,"action",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(skydropSelf,"start",effect=>effect.world().attribute(effect.target(),"minecraft:generic.gravity",-1,"add_multiplied_total"));
    WorldCombat.effectHandler(skydropSelf,"end",effect=>skydropSafeRelease(effect.world(),effect.target()));
    WorldCombat.effect(skydropCarry,1,260,"action",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(skydropCarry,"start",function(effect){
        const world=effect.world(),data=JSON.parse(effect.state());if(!MobEffects.matches(world,effect.target(),data.carrier)){effect.end();return;}
        MobEffects.bind(world,effect.target(),skydropCarried);world.attribute(effect.target(),"minecraft:generic.gravity",-1,"add_multiplied_total");
        world.attribute(effect.target(),"minecraft:generic.movement_speed",-1,"add_multiplied_total");world.attribute(effect.target(),"minecraft:generic.flying_speed",-1,"add_multiplied_total");
    });
    WorldCombat.effectHandler(skydropCarry,"operation:world_combat:dispel",effect=>effect.end());
    WorldCombat.effectHandler(skydropCarry,"end",effect=>skydropSafeRelease(effect.world(),effect.target()));
    function skydropFinish(action:CombatAction):void{
        const ticks=Number(JSON.parse(action.data("skydrop:recover")||"{}").ticks||0);action.releaseTarget();
        function recover(current:CombatAction,left:number):void{if(left<=0){current.finish();return;}current.stage("recovering");current.after(1,next=>recover(next,left-1));}recover(action,ticks);
    }
    function skydropBegin(action:CombatAction,target:CombatActor,config:any):void{
        const world=action.world(),self=world.observe(action.actor()),victim=world.observe(target);if(!self||!victim){skydropFinish(action);return;}
        if(world.hitDisplace(target,WorldCombat.point(0,.08,0))<.001||!CombatStatus.apply(world,target,"skydrop",skydropCarried,240,0)){
            world.effect(skydropRefused,target,"{}",160);WorldFeedback.emit(world,skydropScene,1,victim.position(),{moment:"release",target:String(target.ref())},12);skydropFinish(action);return;
        }
        const carrier=world.mobEffect(target,skydropCarried);if(!carrier){skydropFinish(action);return;}
        action.releaseTarget();
        const carry=action.effect(skydropCarry,target,JSON.stringify({carrier:MobEffects.anchor(carrier)}),240),own=action.effect(skydropSelf,action.actor(),"{}",240);
        world.deliver(target,"world_combat:interrupt");world.motion(action.actor(),WorldCombat.point(0,0,0),false);
        const before=world.observe(target)!;if(before.velocity().length()>.01&&!world.hitImpulse(target,before.velocity().scale(-1))){world.operation(carry,"world_combat:dispel","{}");skydropFinish(action);return;}
        const offset=before.position().minus(self.position()),base=victim.boundsMin().y(),height=p("skydrop","altitude",action),lift=Math.max(.15,p("skydrop","liftSpeed",action)),drop=Math.max(.3,p("skydrop","dropSpeed",action)),hold=Math.max(4,Math.round(p("skydrop","holdTicks",action)));
        const context:NumberContext={pokemon:CobblemonCombat.pokemon(action.actor()),skill:skills["skydrop"],detail:{values:config},world:world,actor:action.actor(),target:{world:world,actor:target}};
        const power=p("skydrop","slam",context),scenes=WorldFeedback.actionScenes(skydropScene);let phase="rise",age=0,total=0,raised=0,ended=false;
        function finish(current:CombatAction):void{if(ended)return;ended=true;const scope=current.world();if(scope.valid(target)&&scope.effects(target,skydropCarry).some(view=>view.id()===carry))scope.operation(carry,"world_combat:dispel","{}");scenes.stop(current);skydropFinish(current);}
        function step(current:CombatAction):void{
            const scope=current.world(),actor=current.actor(),a=scope.observe(actor),b=scope.valid(target)?scope.observe(target):null;
            if(!a||!b||++total>200||!MobEffects.matches(scope,target,MobEffects.anchor(carrier!))){finish(current);return;}
            skydropReset(scope,actor);skydropReset(scope,target);
            if(phase!=="drop"&&(b.position().minus(a.position().plus(offset)).length()>1.1||!scope.clear(a.position(),b.position()))){finish(current);return;}
            if(phase==="rise"||phase==="hold"){
                const rise=phase==="rise"?Math.min(lift,Math.max(0,height-raised)):0;
                const moved=rise>0?scope.displace(actor,WorldCombat.point(0,rise,0)):0;
                const now=scope.observe(actor)!;const correction=now.position().plus(offset).minus(b.position());
                if(correction.length()>.005){const applied=scope.hitDisplace(target,correction.length()>lift?correction.unit().scale(lift):correction);if(applied<.001){finish(current);return;}}
                const actual=scope.observe(target)!;raised=Math.max(raised,actual.boundsMin().y()-base);
                scenes.show(current,"grip",actual.position(),{moment:"hold",target:String(target.ref()),path:[String(actor.ref()),String(target.ref())],altitude:raised});
                if(phase==="rise"&&(moved<rise*.5||raised>=height-.1||++age>Math.ceil(height/lift)+8)){if(raised<.12){finish(current);return;}phase="hold";age=0;}
                else if(phase==="hold"&&++age>=hold){phase="drop";age=0;}
            }else{
                const feet=WorldCombat.point(b.position().x(),b.boundsMin().y(),b.position().z()),floor=SurfacePaths.support(scope,feet,.1,.25);
                if(b.grounded()||floor&&feet.y()-floor.y()<.12){
                    scope.operation(carry,"world_combat:dispel","{}");
                    if(raised>.12)hurt(current,target,"skydrop",power*Math.max(.05,Math.min(1,raised/height)),{damage:damageSpec("skydrop","slam"),contact:true});
                    WorldFeedback.emit(scope,skydropScene,1,b.position(),{moment:"slam",target:String(target.ref()),intensity:raised/height,count:20},20);finish(current);return;
                }
                if(scope.hitDisplace(target,WorldCombat.point(0,-drop,0))<.001){finish(current);return;}
                scope.displace(actor,WorldCombat.point(0,-drop,0));
                scenes.show(current,"grip",b.position(),{moment:"fall",target:String(target.ref()),rate:30,drop:drop});
            }
            current.after(1,step);
        }
        WorldFeedback.emit(world,skydropScene,1,victim.position(),{moment:"grab",target:String(target.ref()),altitude:height,scale:1},16);step(action);
    }
    define({
        freeMovement: true,
        id: "skydrop",
        name: "Sky Drop",
        description: "贴身抓起一名体型、重量和原生受力许可都允许的对手，一同升空、短停再摔落。两具身体受墙和顶棚限制，伤害随实际升高结算；失距、拒控或中断立即松开。",
        uses: ["把关键目标从战场里摘出去一段时间", "抓住一个近身的对手再连本带利摔回来", "用一次重摔换取一段暴露的滞空"],
        kind: "enemy",
        range: 4,
        maxRange: 6,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 46,
        style: "aerial",
        maximumTicks: 260,
        interruptible: true,
        defaults: { carryHigh: false, ai: { maxChase: 8, maxWeight: 300, preferIsolated: true } },
        fields: [field(pathOf("carryHigh"), "高抛", "boolean", {
            help: "开启：提得更高、滞空更久、摔落约 ×1.15，但起手 +3 刻、冷却 +10 刻。关闭（低位速摔）：提得低、摔得轻（约 ×0.85），但收手更快、冷却更短。"
        })],
        indicator: function (config, pokemon) {
            return { radius: p("skydrop", "reach", pokemon), geometry: "circle", style: "aerial", color: 0x9FC6E8,
                label: config && config.carryHigh === true ? "高抛自由落体" : "低位速摔" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["skydrop"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const high = skydropHigh(config);
            return {
                prepare: Math.max(4, Math.round(p("skydrop", "prepare", context)) + (high ? 3 : -1)),
                recover: Math.max(4, Math.round(p("skydrop", "recover", context)) + (high ? 2 : -2)),
                cooldown: Math.max(20, Math.round(p("skydrop", "cooldown", context)) + (high ? 10 : -6)),
                active: 0,
                range: p("skydrop", "reach", context)
            };
        },
        run:function(action,move,config){
            const high=skydropHigh(config),prepare=Math.max(4,Math.round(p("skydrop","prepare",action))+(high?3:-1));
            action.data("skydrop:recover",JSON.stringify({ticks:Math.max(4,Math.round(p("skydrop","recover",action))+(high?2:-2))}));
            LivingActions.lifecycle(action,{interruptible:true});action.present("skydrop:windup",skydropScene,1,action.origin(),JSON.stringify({moment:"windup",high:high?1:0}));
            action.after(prepare,function(current){
                const world=current.sense(),target=current.target();
                if(!target||!skydropEligible(world,current.actor(),target,p("skydrop","liftCap",current),current.range())){current.reject("cannot-carry");return;}
                current.commit(Math.max(20,Math.round(p("skydrop","cooldown",current))+(high?10:-6)));
                skydropBegin(current,target,config);
            });
        }
    });
    CombatStatus.actions.define({id:"world_combat:move_skydrop/carry-gate",apply:function(context){if(CombatStatus.has(context.world,context.actor,"skydrop"))context.blocked.skycarried=true;}});
    WorldCombat.on("world_combat:move_skydrop/roots","world_combat:navigate","",function(event){if(!CombatStatus.has(event.world(),event.actor(),"skydrop"))return;const data=JSON.parse(event.data());data.speed=0;event.data(JSON.stringify(data));});
}
