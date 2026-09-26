/** A breakable bone follows a fixed outward line and a return line to the moving caster; damage follows actual contact only. */
namespace PokemonSkills {
    const bonemerangScene="world_combat:move_bonemerang",bonemerangBoneEffect="world_combat:move/bonemerang/bone",bonemerangLease="world_combat:bonemerang_lease";
    WorldBodies.define(bonemerangBoneEffect,{maxTicks:180,start:function(){},operations:{"world_combat:dispel":brain=>brain.end()},end:function(brain){
        const world=brain.world(),body=world.observe(brain.target());if(body&&brain.reason()==="died"){
            WorldFeedback.emit(world,bonemerangScene,1,body.position(),{moment:"drop",scale:1},14);
            world.dropItem(body.position(),"minecraft:bone",1,JSON.stringify({pickupDelay:20}));
        }
    }});
    WorldCombat.effect(bonemerangLease,1,180,"action",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(bonemerangLease,"start",function(){});
    WorldCombat.effectHandler(bonemerangLease,"end",effect=>{if(effect.world().valid(effect.target()))WorldBodies.operate(effect.world(),effect.target(),"world_combat:dispel",{});});
    define({
        id: "bonemerang",
        freeMovement: true,
        maximumTicks: 190,
        cooldownParameter: "recharge",
        name: "骨头回力镖",
        description: "把可打碎的骨体掷向固定折返点，回程直接追自己的当前接取位置。去、回各只打实际接触的第一名敌人；移动自己能改变回扫路线，碰墙碎落，接回不补伤。",
        uses: ["中距离投出骨头，去与回各打一下", "让回旋的第二下补上第一下的空档", "在对手走位前先手掷出、逼它离开原位"],
        kind: "aim",
        range: 7.5,
        maxRange: 14,
        prepare: 7,
        active: 40,
        recover: 6,
        cooldown: 32,
        style: "bone",
        defaults: { arc: false, ai: { maxChase: 11, minGap: 1.5 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bonemerang", "throwRange", pokemon), geometry: "line", style: "bone",
                color: 0xEAE0C8, label: config && config.arc === true ? "回旋骨头回力镖" : "骨头回力镖" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bonemerang"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bonemerang", "tempo", context)),
                recover: Math.round(p("bonemerang", "recover", context)),
                cooldown: Math.round(p("bonemerang", "recharge", context)),
                active: skills["bonemerang"].active,
                range: p("bonemerang", "throwRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("bonemerang:draw", bonemerangScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", arc: config && config.arc === true }));
            return prepare;
        },
        execute:function(action,move,config,done){
            const world=action.world(),actor=action.actor(),body=world.observe(actor);if(!body){done(action);return;}
            const heading=aim(action),side=WorldGeometry.flatUnit(WorldCombat.point(-heading.z(),0,heading.x()));
            const reach=p("bonemerang","throwRange",action),speed=p("bonemerang","flight",action),bow=p("bonemerang","bow",action),radius=p("bonemerang","hitRadius",action);
            const span=Math.min(reach,Math.max(1,action.targetPosition().minus(action.origin()).length())+p("bonemerang","overshoot",action));
            const hand=action.origin(),turn=hand.plus(heading.scale(span)).plus(side.scale(bow)),catchRange=p("bonemerang","catchRadius",action);
            const bone=WorldBodies.spawn(world,hand.minus(WorldCombat.point(0,.125,0)),{appearance:{item:"minecraft:bone",spin:true,scale:1},size:[.25,.25],health:p("bonemerang","boneHealth",action),gravity:false,pushable:false,invulnerable:false,knockbackResistance:1,silent:true,fireImmune:true},bonemerangBoneEffect,{},160);
            action.effect(bonemerangLease,bone,"{}",160);action.releaseTarget();
            const scenes=WorldFeedback.actionScenes(bonemerangScene);let phase="out",age=0,hit=false,hits=0,ended=false;
            function finish(current:CombatAction,moment:string):void {
                if(ended)return;ended=true;const scope=current.world(),facts=scope.valid(bone)?scope.observe(bone):null;
                if(facts)WorldFeedback.emit(scope,bonemerangScene,1,facts.position(),{moment:moment,hits:hits,scale:radius/.7,count:12},14);
                if(scope.valid(bone))WorldBodies.operate(scope,bone,"world_combat:dispel",{});
                scenes.finish(current,done);
            }
            function fly(current:CombatAction):void{
                const scope=current.world(),facts=scope.valid(bone)?scope.observe(bone):null,owner=scope.observe(actor);
                if(!facts||!owner){finish(current,"drop");return;}
                const at=facts.position(),home=scope.closestPoint(actor,at);
                if(phase==="back"&&at.minus(home).length()<=catchRange&&scope.clear(at,home)){finish(current,"catch");return;}
                if(phase==="out"&&(at.minus(turn).length()<=.15||age>=Math.ceil(span/speed)+5)){phase="back";hit=false;age=0;}
                const goal=phase==="out"?turn:owner.position(),delta=goal.minus(at),step=delta.length()<=speed?delta:delta.unit().scale(speed);
                const block=scope.clipBlocks(at,at.plus(step));if(!block){finish(current,"drop");return;}
                const travelled=scope.displace(bone,step),after=scope.observe(bone);if(!after){finish(current,"drop");return;}
                const actual=after.position();
                if(!hit){
                    const contact=current.trace(at,actual,radius),victim=contact.target();
                    if(victim&&scope.valid(victim)&&!scope.friendly(victim)){
                        hit=true;
                        if(impact(current,contact,"bonemerang",p("bonemerang",phase,current),{segment:phase})){
                            hits++;WorldFeedback.emit(scope,bonemerangScene,1,contact.position(),{moment:"strike",target:String(victim.ref()),segment:phase,hits:hits,count:12,scale:radius/.7},16);
                        }
                    }
                }
                scenes.show(current,"flight",actual,{moment:phase,path:[[at.x(),at.y(),at.z()],[actual.x(),actual.y(),actual.z()]],target:String(bone.ref()),count:p("bonemerang","spin",current),scale:radius/.7});
                if(block.blocked()||travelled<step.length()*.5){finish(current,"drop");return;}
                if(++age>80){finish(current,"drop");return;}current.after(1,fly);
            }
            sound(action,"minecraft:entity.fishing_bobber.throw");fly(action);
        }
    });
}
