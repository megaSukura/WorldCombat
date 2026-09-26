/** A short real pincer contact and six-tick owned grip; hauling uses native received displacement. */
namespace PokemonSkills {
    const visegripScene="world_combat:move_visegrip",visegripHold="world_combat:visegrip_hold",visegripLease="world_combat:visegrip_lease";
    WorldCombat.effect(visegripLease,1,8,"action",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(visegripLease,"start",effect=>{const data=JSON.parse(effect.state());MobEffects.bind(effect.world(),effect.target(),data.id);});
    WorldCombat.effectHandler(visegripLease,"operation:world_combat:dispel",effect=>effect.end());
    define({
        freeMovement: true,
        id: "visegrip",
        cooldownParameter: "recharge",
        name: "Vise Grip",
        description: "短靠步后两钳沿真实路径合拢，首次接触结算一次夹伤。可夹身体短留至多六刻，拖拽式边后退边带近；失距、墙挡或中断立即松开，抗抓者只承受单击。",
        uses: ["把逃跑的目标拽回近身", "对钳口相对更小的目标打一记实在的接触伤害", "把远处的敌人拖进队友的射程", "起手不长的一记贴身物理手段"],
        kind: "aim",
        range: 2.6,
        maxRange: 4.0,
        prepare: 6,
        active: 12,
        recover: 7,
        cooldown: 22,
        style: "pincer",
        defaults: { haul: false, ai: { maxChase: 6, opening: "anytime" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("visegrip", "reach", pokemon), geometry: "circle", style: "pincer",
                color: 0xE89080, label: config && config.haul === true ? "拖拽夹住" : "碾夹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["visegrip"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("visegrip", "tempo", context)),
                recover: Math.round(p("visegrip", "aftercast", context)),
                cooldown: Math.round(p("visegrip", "recharge", context)),
                active: 12,
                range: p("visegrip", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("world_combat:move_visegrip:open", visegripScene, 1, action.origin(),
                JSON.stringify({ moment: "open", scale: body ? (body.width() + body.height()) / 2.3 : 1, haul: !!(config && config.haul) }));
            return prepare;
        },
        execute: function(action,move,config,done){
            const world=action.world(),self=action.actor(),body=world.observe(self);if(!body){done(action);return;}
            const direction=aim(action),flat=WorldGeometry.flatUnit(direction),side=WorldCombat.point(-flat.z(),0,flat.x());
            const scenes=WorldFeedback.actionScenes(visegripScene),lunge=p("visegrip","lunge",action),reach=p("visegrip","reach",action);
            const advance=sweepStep(action,flat.scale(lunge),.2),here=action.origin(),end=here.plus(direction.scale(Math.max(.4,reach-lunge)));
            let contact:CombatImpact|null=advance.hit.hitEntity()?advance.hit:null;
            const paths:number[][][]=[];
            [-1,1].forEach(sign=>{
                const shoulder=here.plus(side.scale(sign*Math.max(.3,body.width()*.45)));
                const clear=world.clipBlocks(here,shoulder);if(!clear||clear.blocked())return;
                const hit=action.trace(shoulder,end,.18);paths.push([[shoulder.x(),shoulder.y(),shoulder.z()],[hit.position().x(),hit.position().y(),hit.position().z()]]);
                if(hit.hitEntity()&&(!contact||hit.position().minus(here).length()<contact.position().minus(here).length()))contact=hit;
            });
            paths.forEach((path,index)=>scenes.show(action,"claw"+index,here,{moment:"close",path:path}));
            const target:CombatActor|null=contact?(contact as CombatImpact).target():null;
            if(!target||!world.valid(target)||world.friendly(target)){WorldFeedback.emit(world,visegripScene,1,end,{moment:"miss",scale:1},12);scenes.finish(action,done);return;}
            const context:NumberContext={pokemon:CobblemonCombat.pokemon(self),skill:skills["visegrip"],detail:{values:config},world:world,actor:self,target:{world:world,actor:target}};
            const power=p("visegrip","squeeze",context),drag=p("visegrip","drag",context),motes=p("visegrip","motes",context);
            if(!hurt(action,target,"visegrip",power,{damage:damageSpec("visegrip","squeeze"),contact:true})){scenes.finish(action,done);return;}
            const victim=world.observe(target);if(!victim){scenes.finish(action,done);return;}
            WorldFeedback.emit(world,visegripScene,1,victim.position(),{moment:"clamp",target:String(target.ref()),motes:motes,drag:drag,scale:1,intensity:power/42},12);
            // A real received pull establishes that this body accepts this grip; native refusal leaves the single hit intact.
            if(world.hitDisplace(target,flat.scale(-.05))<.005 || !CombatStatus.apply(world,target,"rooted",visegripHold,6,0)){
                WorldFeedback.emit(world,visegripScene,1,victim.position(),{moment:"miss",target:String(target.ref()),scale:1},8);scenes.finish(action,done);return;
            }
            const carrier=world.mobEffect(target,visegripHold);if(!carrier){scenes.finish(action,done);return;}
            world.effect(visegripLease,target,JSON.stringify(MobEffects.anchor(carrier)),7);
            action.releaseTarget();let age=0,spent=.05;
            function hold(current:CombatAction):void{
                const scope=current.world(),facts=scope.valid(target!)?scope.observe(target!):null;
                if(!facts||!MobEffects.matches(scope,target!,MobEffects.anchor(carrier!))||facts.position().minus(current.origin()).length()>reach+.25||!scope.clear(current.origin(),facts.position())){scenes.finish(current,done);return;}
                if(config&&config.haul&&spent<drag){
                    const step=Math.min(.15,(drag-spent)/(6-age));scope.displace(self,flat.scale(-step));
                    const toward=current.origin().minus(facts.position()),horizontal=WorldCombat.point(toward.x(),0,toward.z());
                    const accepted=horizontal.length()>.01?scope.hitDisplace(target!,horizontal.unit().scale(step)):0;
                    spent+=accepted;if(accepted<.005){scenes.finish(current,done);return;}
                }
                scenes.show(current,"held",facts.position(),{moment:"hold",target:String(target!.ref()),path:[String(self.ref()),String(target!.ref())]});
                if(++age>=6){WorldFeedback.emit(scope,visegripScene,1,facts.position(),{moment:"release",target:String(target!.ref())},8);scenes.finish(current,done);return;}
                current.after(1,hold);
            }
            hold(action);
        }
    });
}
