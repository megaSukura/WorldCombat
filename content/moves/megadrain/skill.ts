/** Actual damage becomes a finite owned return pod; only reaching its caster settles healing. */
namespace PokemonSkills {
    const megaDrainScene="world_combat:move_megadrain",megaDrainAttached="world_combat:megadrain_attached",megaDrainReturn="world_combat:megadrain_return";
    WorldBodies.define(megaDrainReturn,{maxTicks:100,start:function(brain){
        const body=brain.world().observe(brain.target());if(body)WorldFeedback.onEffect(brain.world(),brain.id(),"pod",megaDrainScene,1,body.position(),{moment:"return",target:String(brain.target().ref())});
    },tick:{every:1,handler:function(brain){
        const world=brain.world(),data=JSON.parse(brain.state()),owner=world.actor(data.owner),body=world.observe(brain.target());
        if(!owner||!world.valid(owner)||!body){brain.end();return;}
        const at=body.position(),goal=world.closestPoint(owner,at),delta=goal.minus(at);data.age=(data.age||0)+1;
        if(delta.length()<.55 && world.clear(at,goal)){
            data.consumed=true;brain.state(JSON.stringify(data));
            const restored=world.health(owner,data.amount,"world_combat:drain");
            if(restored>0)WorldFeedback.emit(world,megaDrainScene,1,goal,{moment:"collected",target:data.owner,amount:restored},16);
            brain.end();return;
        }
        if(!data.stopped){
            const movement=data.age<=4?WorldCombat.point(0,.07,0):delta.unit().scale(Math.min(.2,delta.length()));
            const block=world.clipBlocks(at,at.plus(movement));
            if(!block){brain.end();return;}
            const moved=world.displace(brain.target(),movement);
            if(block.blocked()||moved<movement.length()*.6)data.stopped=true;
        }
        brain.state(JSON.stringify(data));
    }},end:function(brain){const data=JSON.parse(brain.state()),body=brain.world().observe(brain.target());if(body&&!data.consumed)WorldFeedback.emit(brain.world(),megaDrainScene,1,body.position(),{moment:"fizzle",scale:.4,motes:6},12);}});
    PokemonDamage.onDamageApplied("world_combat:megadrain/return",function(receipt){
        const share=Number(receipt.data.megadrainReturn);if(!(receipt.actual>0)||!(share>0)||!receipt.world.valid(receipt.actor))return;
        const world=receipt.world,body=world.observe(receipt.target);
        if(typeof receipt.x!=="number"&&!body)return;
        const at=typeof receipt.x==="number"?WorldCombat.point(receipt.x,receipt.y!,receipt.z!):body!.position();
        let amount=receipt.actual*share;
        if(String(receipt.actor.domain())==="cobblemon")amount=NativeItems.apply(world,receipt.actor,"drain",{amount:amount},NativeEffects.read(world,receipt.actor)).amount;
        if(!(amount>0))return;
        WorldBodies.spawn(world,at,{appearance:{sprite:"cobblemon:generic/grass/seed",tint:0xA8EA72,glow:true,scale:.5},size:[.22,.22],health:1,gravity:false,pushable:false,invulnerable:true,knockbackResistance:1,silent:true,fireImmune:true},megaDrainReturn,{owner:String(receipt.actor.ref()),amount:amount,age:0,consumed:false,stopped:false},100);
    },{move:"megadrain"});
    WorldCombat.effect(megaDrainAttached,1,160,"actor",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(megaDrainAttached,"start",function(effect){const state=JSON.parse(effect.state());effect.schedule("pulse","pulse",state.interval,"{}");});
    WorldCombat.effectHandler(megaDrainAttached,"pulse",function(effect){
        const world=effect.world(),data=JSON.parse(effect.state()),owner=world.actor(data.owner),target=effect.target();
        if(!owner||!world.valid(owner)||!world.valid(target)){effect.end();return;}
        const body=world.observe(target);if(!body){effect.end();return;}
        hurt(world,target,"megadrain",data.power,{damage:damageSpec("megadrain","pod"),drain:0,megadrainReturn:data.share} as any);
        WorldFeedback.emit(world,megaDrainScene,1,body.position(),{moment:"pod_pulse",target:String(target.ref()),motes:12},12);
        if(--data.remaining<=0){effect.end();return;}effect.state(JSON.stringify(data));effect.schedule("pulse","pulse",data.interval,"{}");
    });
    WorldCombat.effectHandler(megaDrainAttached,"operation:world_combat:dispel",effect=>effect.end());
    define({
        id: "megadrain",
        cooldownParameter: "recharge",
        name: "Mega Drain",
        description: "孢荚命中后按原拍数吸取，每拍把实际伤害的一部分吐成短命绿荚。绿荚缓慢回飞，回到自己身边才治疗；墙会拦住回收路线，可走近取回。爆荚单发较重，缠钩多拍。",
        uses: ["从一段距离外抛荚命中对手", "用连续几拍把伤害和回血一起抽上来", "对拉不开距离的目标持续续航"],
        kind: "aim",
        range: 8.5,
        maxRange: 12.0,
        prepare: 8,
        active: 1,
        recover: 8,
        cooldown: 34,
        style: "grass",
        defaults: { burst: false, ai: { maxChase: 12, healBelow: 0.9 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("megadrain", "reach", pokemon), geometry: "line", style: "grass", color: 0x8CC63F,
                label: config && config.burst === true ? "超级吸取·爆荚" : "超级吸取" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["megadrain"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("megadrain", "tempo", context)),
                recover: Math.round(p("megadrain", "aftercast", context)),
                cooldown: Math.round(p("megadrain", "recharge", context)),
                active: 1,
                range: p("megadrain", "reach", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:megadrain:" + action.id(), megaDrainScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", burst: config && config.burst === true }));
            return prepare;
        },
        execute:function(action,move,config,done){
            const power=p("megadrain","pod",action),share=p("megadrain","sap",action),speed=p("megadrain","seed",action),latch=p("megadrain","latch",action);
            const waves=Math.max(1,Math.min(3,Math.round(p("megadrain","pulses",action)))),interval=Math.max(4,Math.round(p("megadrain","interval",action)));
            const scenes=WorldFeedback.actionScenes(megaDrainScene);let settled=false;
            function finish(current:CombatAction):void{if(settled)return;settled=true;scenes.finish(current,done);}
            action.releaseTarget();sound(action,"cobblemon:move.megadrain.actor");
            const flight=LivingActions.projectile(action,{speed:speed,range:action.range(),radius:.28,
                appearance:{sprite:"cobblemon:generic/grass/seed",tint:0x9BD24B,glow:true,scale:1},
                impact:function(current,hit){
                    const world=current.world(),target=hit.target(),at=hit.position();scenes.stop(current,"flight");
                    if(!target||!world.valid(target)||world.friendly(target)){WorldFeedback.emit(world,megaDrainScene,1,at,{moment:"fizzle",scale:latch/.5,motes:16},16);finish(current);return;}
                    const features:any={damage:damageSpec("megadrain","pod"),drain:0,megadrainReturn:share};
                    const landed=impact(current,hit,"megadrain",power,features);
                    WorldFeedback.emit(world,megaDrainScene,1,at,{moment:"burst",target:String(target.ref()),scale:latch/.5,motes:16,waves:waves,wave:1},16);
                    if(landed && waves>1 && world.valid(target))world.effect(megaDrainAttached,target,JSON.stringify({remaining:waves-1,interval:interval,power:power,share:share,owner:String(current.actor().ref())}),interval*(waves-1)+4);
                    finish(current);
                }},finish);
            scenes.show(action,"flight",action.origin(),{moment:"fly",projectile:flight,scale:latch/.5,motes:16});
        }
    });
}
