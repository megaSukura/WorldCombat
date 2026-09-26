/** Accepted fear gives each receiver a temporary native-navigation intent, without periodic body displacement. */
namespace PokemonSkills {
    const roarRefused="world_combat:roar_refused";
    WorldCombat.effect(roarRefused,1,160,"actor",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(roarRefused,"start",function(){});
    StatusContributions.define(roarRouted);
    interface RoarFear { caster:string; point:number[]; keepOut:number; speed:number; }
    function roarRoutBody(world:CombatWorld,caster:CombatActor,target:CombatActor,centre:CombatPoint,body:CombatObservation,
        flee:number,panic:number,keepOut:number,token:string):boolean {
        const ticks=Math.max(20,Math.round(flee));
        if(!CombatStatus.apply(world,target,"routed",roarRouted,ticks)){world.effect(roarRefused,target,"{}",160);return false;}
        const id=StatusContributions.upsert(world,target,roarRouted,token,{caster:String(caster.ref()),point:[centre.x(),centre.y(),centre.z()],keepOut:keepOut,speed:Math.max(.5,Math.min(1.4,panic))},ticks);
        if(!id)return false;
        // Players retain their own steering; this move's accepted immediate interruption remains available.
        world.interrupt(target,"world_combat:interrupt");
        return true;
    }
    WorldCombat.effect(roarRout,1,400,"actor",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(roarRout,"start",effect=>effect.schedule("flee","flee",1,"{}"));
    WorldCombat.effectHandler(roarRout,"operation:world_combat:dispel",effect=>effect.end());
    function roarRelease(effect:CombatEffect,state:any):void {
        if(!state.active)return;
        const world=effect.world();if(world.valid(effect.target())){world.stopMovement();world.controlled(false);}
        state.active=false;
    }
    WorldCombat.effectHandler(roarRout,"end",effect=>roarRelease(effect,JSON.parse(effect.state())));
    function roarGoal(world:CombatWorld,body:CombatObservation,threat:CombatPoint,distance:number,turn:number):CombatPoint|null {
        const here=body.position(),delta=WorldGeometry.flatUnit(here.minus(threat)),angles=[0,45,-45,90,-90];
        for(let offset=0;offset<angles.length;offset++){
            const angle=angles[(turn+offset)%angles.length]*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
            const direction=WorldCombat.point(delta.x()*c-delta.z()*s,0,delta.x()*s+delta.z()*c),point=here.plus(direction.scale(distance));
            const feet=WorldCombat.point(point.x(),body.boundsMin().y(),point.z()),floor=SurfacePaths.support(world,feet,1,1.1);
            const fluid=floor?world.fluid(floor.plus(WorldCombat.point(0,.03,0))):null;
            if(!floor||!fluid||!fluid.empty()||!world.freeSpace(floor.plus(WorldCombat.point(0,.03,0)),body.width(),body.height()))continue;
            const candidate=floor.plus(WorldCombat.point(0,body.height()/2,0));
            if(candidate.minus(threat).length()<=here.minus(threat).length()+.1)continue;
            const result=world.navigate(candidate,.45,1);
            if(result==="moving"||result==="arrived")return candidate;
        }
        return null;
    }
    WorldCombat.effectHandler(roarRout,"flee",function(effect){
        const world=effect.world(),actor=effect.target(),body=world.observe(actor),state=JSON.parse(effect.state()),carrier=world.mobEffect(actor,roarRouted);
        if(!body||body.player()||String(world.source().key())!==String(actor.key())||!carrier){effect.end();return;}
        const contributions=StatusContributions.list<RoarFear>(world,actor,roarRouted).filter(item=>world.actor(String(item.source.ref()))!==null);
        if(!contributions.length){effect.end();return;}
        const generation=contributions.map(item=>item.id).join(",");
        if(state.generation!==generation){state.generation=generation;state.blocked=false;state.failed=0;state.goal=null;}
        if(state.blocked){effect.state(JSON.stringify(state));effect.schedule("flee","flee",10,"{}");return;}
        effect.remaining(Math.max(1,Math.min(400,carrier.duration())));
        let chosen=contributions[0],threat=world.observe(chosen.source)!.position(),gap=chosen.payload.keepOut-body.position().minus(threat).length();
        contributions.forEach(item=>{const source=world.observe(item.source);if(!source)return;const next=item.payload.keepOut-body.position().minus(source.position()).length();if(next>gap){chosen=item;threat=source.position();gap=next;}});
        if(gap<=0){
            if(state.active&&!state.arrived)world.stopMovement();state.arrived=true;state.goal=null;
        }else{
            state.arrived=false;
            const at=body.position();
            if(state.previous&&at.minus(WorldCombat.point(state.previous[0],state.previous[1],state.previous[2])).length()<.05)state.stale=(state.stale||0)+2;else state.stale=0;
            state.previous=[at.x(),at.y(),at.z()];
            if(!state.goal||world.tick()>=(state.replan||0)||state.stale>=10){
                if(state.stale>=10){state.turn=((state.turn||0)+1)%5;state.failed=(state.failed||0)+1;}
                if(state.failed>=3){roarRelease(effect,state);state.blocked=true;effect.state(JSON.stringify(state));effect.schedule("flee","flee",10,"{}");return;}
                const goal=roarGoal(world,body,threat,Math.min(6,Math.max(2,gap+1)),state.turn||0);
                if(!goal){
                    state.failed=(state.failed||0)+1;roarRelease(effect,state);
                    if(state.failed>=3){state.blocked=true;WorldFeedback.emit(world,roarScene,1,body.position(),{moment:"resist",target:String(actor.ref())},12);}
                    effect.state(JSON.stringify(state));effect.schedule("flee","flee",10,"{}");return;
                }
                if(!state.active){world.interrupt(actor,"world_combat:interrupt");world.controlled(true);state.active=true;effect.state(JSON.stringify(state));}
                state.goal=[goal.x(),goal.y(),goal.z()];state.replan=world.tick()+10;
                const moved=world.navigate(goal,.45,chosen.payload.speed);
                if(moved!=="moving"&&moved!=="arrived"){roarRelease(effect,state);state.blocked=true;effect.state(JSON.stringify(state));effect.schedule("flee","flee",10,"{}");return;}
            }
            if(body.velocity().length()>.03)WorldFeedback.emit(world,roarScene,1,body.position(),{moment:"flee",target:String(actor.ref())},8);
        }
        effect.state(JSON.stringify(state));effect.schedule("flee","flee",2,"{}");
    });
    function roarReceiver(event:CombatWorldEvent):void {
        const data=JSON.parse(event.data());if(data.id&&String(data.id)!==roarRouted)return;
        const world=event.world(),actor=event.actor(),body=world.observe(actor);if(!body||body.player())return;
        const carrier=world.mobEffect(actor,roarRouted),current=world.effects(actor,roarRout);
        if(!carrier){current.forEach(view=>world.operation(view.id(),"world_combat:dispel","{}"));return;}
        if(current.length||!StatusContributions.list(world,actor,roarRouted).length)return;
        // This event scope is owned by the receiver, so only its own normal AI/navigation lease is acquired.
        world.effect(roarRout,actor,JSON.stringify({active:false,arrived:false,goal:null,stale:0,failed:0,turn:0}),Math.max(1,Math.min(400,carrier.duration())));
    }
    ["world_combat:mob_effect_added","world_combat:mob_effect_tick","world_combat:mob_effect_removed","world_combat:actor_bound"].forEach(topic=>WorldCombat.on("world_combat:roar/receiver/"+topic.replace(":","_"),topic,"",roarReceiver));
    define({
        id: roarId,
        cooldownParameter: "wait",
        name: "吼叫",
        description: "一吼震慑近敌；接受溃退的生物沿可走路径逃到安全距离，短窗结束恢复正常选择。抵抗者不被接管，玩家保留移动操作；合法后备仍可被真正换上，没有伤害。",
        uses: ["把贴身的敌人一次逐开", "打断围攻、为自己拉开呼吸空间", "在混战里逼退一圈人"],
        kind: "self",
        range: 5,
        maxRange: 10,
        prepare: 9,
        active: 1,
        recover: 8,
        cooldown: 110,
        style: "roar",
        defaults: { unleash: false, ai: { maxChase: 6, minFoes: 1, leaveStation: false } },
        fields: [flag("unleash", "狂啸")],
        resolve: function (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null, attributes?: IndividualAttributes.Context) {
            const context: NumberContext = { pokemon, skill: skills[roarId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(roarId, "tempo", context)), recover: Math.round(p(roarId, "recover", context)),
                cooldown: Math.round(p(roarId, "wait", context)), active: 1, range: p(roarId, "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_roar:windup", roarScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: scale, waves: Math.round(p(roarId, "waves", action)) }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(roarId, "reach", pokemon), geometry: "area", style: "roar", color: 0xE0B24A,
                label: config && config.unleash ? "吼叫·狂啸" : "吼叫" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const reach = p(roarId, "reach", action), flee = p(roarId, "flee", action);
            const panic = p(roarId, "panic", action), keepOut = p(roarId, "keepOut", action);
            const waves = Math.round(p(roarId, "waves", action));
            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, reach, { below: 3, above: 3.5 }), function (target, facts) {
                if (String(target.ref()) === String(actor.ref())) return;
                if (!roarRoutBody(world, actor, target, centre, facts, flee, panic, keepOut, String(action.id()))) {
                    WorldFeedback.emit(world,roarScene,1,facts.position(),{moment:"resist",target:String(target.ref())},16);return;
                }
                if (partyForceOut(world, target, partyFeet(facts)) !== null)
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.1, 0)), roarSwitchText, [], 24);
                hits++;
            });
            WorldFeedback.emit(world, roarScene, 1, centre, { moment: "wave", radius: reach, scale: reach / 5, waves: waves, hits: hits }, 30);
            if (hits === 0) WorldFeedback.emit(world, roarScene, 1, centre, { moment: "miss", scale: reach / 5 }, 18);
            world.sound(hits > 0 ? "minecraft:entity.ravager.roar" : "minecraft:entity.wolf.growl", centre, 22, "{}");
            const above = centre.plus(WorldCombat.point(0, 1.5, 0));
            if (hits > 0) WorldFeedback.text(world, above, roarWaveText, [hits], 30);
            else WorldFeedback.text(world, above, roarMissText, [], 24);
            done(action);
        }
    });
}

