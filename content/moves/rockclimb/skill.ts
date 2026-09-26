/** Real wall approach, finite upward body movement and a short clear crest; only body contact deals damage. */
namespace PokemonSkills {
    /** 踉跄：被打散时朝随机方向撞开的最大格数，以及短暂减速时长（刻）。 */
    const rockclimbStumble = 0.7;
    const rockclimbStumbleTicks = 30;

    /** 只有当代表载体就是本单元的 id 时，本单元的门禁才接管。 */
    function rockclimbCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === rockclimbEffect ? effect : null;
    }

    /** 把混乱挂到目标身上：借共享身份 confusion，振幅存失手概率百分数，独一无二地替换同类载体。 */
    function rockclimbDaze(world: CombatWorld, victim: CombatActor, at: CombatPoint, ticks: number, fumblePct: number): boolean {
        if (!CombatStatus.apply(world, victim, "confusion", rockclimbEffect, ticks, fumblePct, { unique: true })) return false;
        const body = world.observe(victim);
        const point = body !== null ? body.position() : at;
        WorldFeedback.emit(world, rockclimbScene, 1, at, { moment: "daze", target: String(victim.ref()), fumble: fumblePct }, 24);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.25, 0)), rockclimbDazeText, [], 28);
        return true;
    }

    const rockclimbGrip="world_combat:rockclimb_grip";
    WorldCombat.effect(rockclimbGrip,1,100,"action",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(rockclimbGrip,"start",effect=>effect.world().attribute(effect.target(),"minecraft:generic.gravity",-1,"add_multiplied_total"));
    WorldCombat.effectHandler(rockclimbGrip,"operation:world_combat:dispel",effect=>effect.end());

    define({
        freeMovement: true,
        id: rockclimbId,
        cooldownParameter: "recharge",
        name: "Rock Climb",
        description: "先短冲到真实壁面，再在冲程和攀升高度内向上攀；脚底越过墙沿且身体通得过才翻顶。顶棚会停攀，平地作一次低扑；只在身体真正接触敌人时重击并可能混乱。",
        uses: ["贴身的一次重扑", "越过一小段距离砸进敌群", "用落地范围一次撞到两三个"],
        kind: "aim",
        range: 6,
        maxRange: 10,
        prepare: 12,
        active: 0,
        recover: 11,
        cooldown: 34,
        style: "impact",
        defaults: { vault: false, ai: { maxChase: 11, finish: true, crowd: false } },
        fields: [flag("vault", "跃攀")],
        indicator: function (config, pokemon) {
            return { radius: p(rockclimbId, "reach", pokemon), geometry: "line", style: "impact", color: 0x9A6B3F,
                label: config && config.vault === true ? "攀岩·跃攀" : "攀岩·贴地扑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[rockclimbId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(rockclimbId, "tempo", context)),
                recover: Math.round(p(rockclimbId, "aftercast", context)),
                cooldown: Math.round(p(rockclimbId, "recharge", context)),
                active: 0,
                range: p(rockclimbId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:rockclimb:windup", rockclimbScene, 1, action.origin(),
                JSON.stringify({ moment: "crouch", vault: config && config.vault === true }));
            return prepare;
        },
        execute:function(action,move,config,done){
            const world=action.world(),actor=action.actor(),first=world.observe(actor);if(!first){done(action);return;}
            const reach=p(rockclimbId,"reach",action),arc=p(rockclimbId,"arc",action),duration=Math.max(1,Math.round(p(rockclimbId,"leapTicks",action)));
            const power=p(rockclimbId,"ram",action),chance=p(rockclimbId,"confuseChance",action),daze=Math.round(p(rockclimbId,"dazeTicks",action)),fumble=Math.round(p(rockclimbId,"fumble",action)*100),motes=p(rockclimbId,"motes",action);
            const direction=WorldGeometry.flatUnit(NativeSemantics.aim(action,move,WorldGeometry.flatUnit(aim(action)),p(rockclimbId,"spread",action)));
            const scenes=WorldFeedback.actionScenes(rockclimbScene);let phase="approach",age=0,used=0,crest=0,grip=0,ended=false;
            const base=first.boundsMin().y(),height=arc,maximumTicks=duration+Math.ceil(height/.3)+4;
            function finish(current:CombatAction):void{if(ended)return;ended=true;if(grip)current.world().operation(grip,"world_combat:dispel","{}");scenes.finish(current,done);}
            function contact(current:CombatAction,hit:CombatImpact):void{
                const scope=current.world(),target=hit.target();if(target&&scope.valid(target)&&!scope.friendly(target)){
                    const landed=impact(current,hit,rockclimbId,power,{damage:damageSpec(rockclimbId,"ram"),contact:true});
                    WorldFeedback.emit(scope,rockclimbScene,1,hit.position(),{moment:"slam",target:String(target.ref()),motes:motes,scale:1,intensity:power/90},20);
                    if(landed&&scope.valid(target)&&scope.random()<chance)rockclimbDaze(scope,target,hit.position(),daze,fumble);
                }
                finish(current);
            }
            function step(current:CombatAction):void{
                const scope=current.world(),body=scope.observe(actor);if(!body||++age>maximumTicks||used>=reach){finish(current);return;}
                const from=current.origin(),feet=WorldCombat.point(from.x(),body.boundsMin().y()+.12,from.z()),probeDistance=body.width()/2+.45;
                const wall=scope.clipBlocks(feet,feet.plus(direction.scale(probeDistance)));
                let delta:CombatPoint;
                if(phase==="climb"){
                    if(body.boundsMin().y()-base>=height-.02){finish(current);return;}
                    if(wall&&!wall.blocked()){phase="crest";crest=0;}
                }
                if(phase==="climb")delta=WorldCombat.point(0,Math.min(.3,height-(body.boundsMin().y()-base),reach-used),0);
                else if(phase==="crest")delta=direction.scale(Math.min(.35,reach-used));
                else delta=direction.scale(Math.min(reach/duration,reach-used)).plus(WorldCombat.point(0,age===1?Math.min(.3,arc):0,0));
                const swept=sweepStep(current,delta,.01);used+=swept.moved;
                if(swept.hit.hitEntity()){contact(current,swept.hit);return;}
                const now=scope.observe(actor);if(!now){finish(current);return;}
                if(phase==="approach"&&swept.hit.blocked()){
                    const actual=scope.clipBlocks(now.position(),now.position().plus(direction.scale(probeDistance)));
                    if(!actual||!actual.blocked()||actual.blockFace()==="up"||actual.blockFace()==="down"){finish(current);return;}
                    phase="climb";grip=current.effect(rockclimbGrip,actor,"{}",maximumTicks);scope.motion(actor,WorldCombat.point(0,0,0),false);
                }else if(swept.hit.blocked()||swept.moved<.01){finish(current);return;}
                if(phase==="climb"&&wall&&wall.blocked()){
                    WorldFeedback.emit(scope,rockclimbScene,1,wall.position(),{moment:"grip",point:[wall.position().x(),wall.position().y(),wall.position().z()],motes:2},Math.min(20,p(rockclimbId,"scuffTicks",current)));
                }
                const after=current.origin();scenes.show(current,"route",after,{moment:"route",path:[[from.x(),from.y(),from.z()],[after.x(),after.y(),after.z()]],motes:motes});
                if(phase==="crest"&&++crest>=3){finish(current);return;}current.after(1,step);
            }
            action.releaseTarget();step(action);
        }
    });

    // 混乱存续期：低密度的飞鸟与土点每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_rockclimb/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rockclimbEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "rockclimb:daze:" + String(actor.ref()), rockclimbScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
