/** A finite set of supported root arms visibly rises and sweeps inward; buildings stop their tips. */
namespace PokemonSkills {
    const frenzyplantScene = "world_combat:move_frenzyplant";
    const frenzyplantSpentEffect = "world_combat:frenzyplant_spent";
    const frenzyplantHitText = "world_combat.move.frenzyplant.text.hit";
    const frenzyplantSnareText = "world_combat.move.frenzyplant.text.snare";
    const frenzyplantSpentText = "world_combat.move.frenzyplant.text.spent";
    const frenzyplantMissText = "world_combat.move.frenzyplant.text.miss";

    /** 根须褪去：挂上力竭状态（共享身份 mustrecharge）并停步，播放收场表现与浮字。 */
    function frenzyplantSpent(action: CombatAction, ticks: number, hits: number, intensity: number): void {
        const world = action.world();
        MobEffects.apply(world, action.actor(), frenzyplantSpentEffect, ticks, 0);
        WorldEffects.apply(world, action.actor(), "rooted", {}, ticks);
        world.stopMovement(action.actor());
        const body = world.observe(action.actor());
        if (body !== null) {
            WorldFeedback.emit(world, frenzyplantScene, 1, body.position(),
                { moment: "spent", scale: intensity, seconds: ticks / 20, hits: hits, count: Math.round(8 + (ticks / 20) * 5) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), frenzyplantSpentText,
                [Math.round(ticks / 20 * 10) / 10], 30);
        }
        sound(action, "cobblemon:impact.grass");
    }

    define({
        freeMovement: true,
        id: "frenzyplant",
        name: "Frenzy Plant",
        description: "几条粗根从落点周边的真实支撑面升起，再向中心抽合。根尖实际扫到才受击，每敌一次；墙截住根臂，收根后力竭。",
        uses: ["从地面窜出的巨木根须", "同时抽打挤在一块地上的对手", "把目标按在原地再交给队友"],
        kind: "point",
        range: 10,
        maxRange: 18,
        prepare: 12,
        active: 26,
        recover: 10,
        cooldown: 74,
        style: "growth",
        stationary: true,
        defaults: { grip: false, ai: { minTargets: 1, minHealth: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("frenzyplant", "radius", pokemon), geometry: "area", style: "growth", color: 0x7FB04A, label: "疯狂植物" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["frenzyplant"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("frenzyplant", "charge", context)),
                recover: 10,
                cooldown: Math.round(p("frenzyplant", "exhaust", context)) + 16,
                range: p("frenzyplant", "reach", context)
            };
        },
        ready: function(action){return SurfacePaths.support(action.sense(),action.targetPosition(),1,4)?"":"no-supported-ground";},
        windup: function (action, config, prepare) {
            const world=action.sense(),point=SurfacePaths.support(world,action.targetPosition(),1,4),radius=p("frenzyplant","radius",action);
            if(point){const count=Math.max(3,Math.min(5,Math.round(radius+1)));
                for(let i=0;i<count;i++){const a=i/count*Math.PI*2,at=SurfacePaths.support(world,point.plus(WorldCombat.point(Math.cos(a)*radius,0,Math.sin(a)*radius)),1,1);
                    if(at)action.present("frenzyplant:entry:"+i,frenzyplantScene,1,at,JSON.stringify({moment:"root_hint"}));}}
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const support=SurfacePaths.support(world,action.targetPosition(),1,4);if(!support){done(action);return;}
            const ground:CombatPoint=support;
            const radius=p("frenzyplant","radius",action),power=p("frenzyplant","bloom",action),rise=p("frenzyplant","rise",action);
            const snare=Math.max(0,Math.round(p("frenzyplant","snareTicks",action))),exhaust=Math.round(p("frenzyplant","exhaust",action)),leaves=Math.round(p("frenzyplant","leaves",action));
            const grip=!!(config&&config.grip),intensity=Math.max(.6,Math.min(2.6,power/150)),seen:{[ref:string]:boolean}={};
            const arms:{base:CombatPoint;tip:CombatPoint;stopped:boolean}[]=[],count=Math.max(3,Math.min(5,Math.round(radius+1)));
            for(let i=0;i<count;i++){
                const angle=i/count*Math.PI*2,probe=ground.plus(WorldCombat.point(Math.cos(angle)*radius,0,Math.sin(angle)*radius));
                const at=SurfacePaths.support(world,probe,1,1);if(at)arms.push({base:at,tip:at.plus(WorldCombat.point(0,.05,0)),stopped:false});
            }
            const scenes=WorldFeedback.actionScenes(frenzyplantScene);let age=0,hits=0;
            action.releaseTarget();sound(action,"cobblemon:move.leafstorm.actor");
            function extend(current:CombatAction):void{
                const scope=current.world();age++;
                arms.forEach(function(arm,index){
                    if(arm.stopped)return;
                    const progress=Math.min(1,Math.max(0,(age-5)/10));
                    const desired=age<=5?arm.base.plus(WorldCombat.point(0,rise*age/5,0)):
                        arm.base.plus(ground.minus(arm.base).scale(progress)).plus(WorldCombat.point(0,.35+(rise-.35)*(1-progress),0));
                    const clip=scope.clipBlocks(arm.tip,desired);if(!clip){arm.stopped=true;return;}
                    const end=clip.blocked()?clip.position():desired;
                    if(age>5)WorldGeometry.selectBodies(scope,WorldGeometry.bodySegment(arm.tip,end,.32),function(enemy,facts){
                        const ref=String(enemy.ref());if(scope.friendly(enemy)||seen[ref])return;seen[ref]=true;
                        if(hurt(current,enemy,"frenzyplant",power,{damage:damageSpec("frenzyplant","bloom")})){
                            hits++;if(grip&&snare>0&&scope.valid(enemy))WorldEffects.apply(scope,enemy,"rooted",{},snare);
                            WorldFeedback.emit(scope,frenzyplantScene,1,facts.position(),{moment:"slam",target:ref,notes:Math.round(14+power*.3),scale:1,intensity},22);
                        }
                    });
                    arm.tip=end;arm.stopped=clip.blocked();
                    scenes.show(current,"arm"+index,arm.base,{moment:"arm",path:[[arm.base.x(),arm.base.y(),arm.base.z()],[end.x(),end.y(),end.z()]],intensity});
                });
                if(age>=15||arms.every(arm=>arm.stopped)){
                    WorldFeedback.emit(scope,frenzyplantScene,1,ground,{moment:"leaves",scale:radius/2.4,radius,seconds:leaves/20,hits},Math.min(40,leaves));
                    frenzyplantSpent(current,exhaust,hits,intensity);scenes.finish(current,done);return;
                }current.after(1,extend);
            }
            extend(action);
        }
    });

    // 力竭的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:frenzyplant/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    // 力竭挂上的一刻立刻停步，避免带着残余动量滑出去。
    WorldCombat.on("world_combat:move_frenzyplant/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== frenzyplantSpentEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 力竭期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_frenzyplant/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), frenzyplantSpentEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 力竭期间维持低密度的落叶与土屑：少而稳，靠近脚边，让玩家看清目标。
    WorldCombat.on("world_combat:move_frenzyplant/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== frenzyplantSpentEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_frenzyplant/recharge/" + String(actor.ref()), frenzyplantScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });
}
