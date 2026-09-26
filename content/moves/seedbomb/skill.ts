/** One high thrown pod uses one real native ground rebound, then cracks once at its actual position. */
namespace PokemonSkills {
    const seedbombScene = "world_combat:move_seedbomb";
    const seedbombMissText = "world_combat.move.seedbomb.text.miss";

    define({
        id: "seedbomb",
        cooldownParameter: "recharge",
        name: "Seed Bomb",
        description: "硬种荚高抛，撞敌体立即开壳；首次落地按真实表面浅弹滚动，重荚三刻、散荚至多六刻后裂爆，第二次撞墙提前开壳。伤害只在实际爆点结算一次，墙能遮挡。",
        uses: ["隔着一小块地形把硬种砸到目标头顶", "罩住一小片落点逼对手走位", "中距离单体点射的一记重击"],
        kind: "aim",
        range: 10,
        maxRange: 15,
        prepare: 11,
        active: 0,
        recover: 10,
        cooldown: 32,
        style: "verdant",
        defaults: { heavy: false, ai: { maxChase: 12, preferGround: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("seedbomb", "spread", pokemon), geometry: "circle", style: "verdant",
                color: 0x8FBF3A, label: config && config.heavy === true ? "重荚种子炸弹" : "散荚种子炸弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["seedbomb"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("seedbomb", "tempo", context)),
                recover: Math.round(p("seedbomb", "aftercast", context)),
                cooldown: Math.round(p("seedbomb", "recharge", context)),
                active: skills["seedbomb"].active,
                range: p("seedbomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_seedbomb:windup", seedbombScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy === true }));
            return prepare;
        },
        execute:function(action,move,config,done){
            const world=action.world(),origin=action.origin(),point=action.targetPosition(),delta=point.minus(origin),gravity=.05;
            const power=p("seedbomb","volley",action),spread=p("seedbomb","spread",action),radius=p("seedbomb","seedRadius",action),speed=p("seedbomb","arcSpeed",action),drop=p("seedbomb","dropHeight",action);
            const seeds=p("seedbomb","seeds",action),chaff=p("seedbomb","chaff",action),heavy=!!(config&&config.heavy),scenes=WorldFeedback.actionScenes(seedbombScene);
            // A finite high-arc time; reconstruct the native move/0.99 drag/gravity velocity for that endpoint.
            const duration=Math.ceil(Math.max(Math.sqrt(delta.x()*delta.x()+delta.z()*delta.z())/speed,2*Math.sqrt(2*drop/gravity)));
            const factor=(1-Math.pow(.99,duration))/.01,fall=gravity/.01*(duration-factor);
            const velocity=WorldCombat.point(delta.x()/factor,(delta.y()+fall)/factor,delta.z()/factor);
            let settled=false,bounced=false,burst=false,flight="",last=origin;
            function finish(current:CombatAction):void{if(settled)return;settled=true;scenes.finish(current,done);}
            function crack(current:CombatAction,at:CombatPoint):void{
                if(burst)return;burst=true;const scope=current.world();let hits=0;
                WorldGeometry.selectBodies(scope,WorldGeometry.bodySphere(at,spread),function(victim,facts){
                    if(scope.friendly(victim))return;const contact=scope.closestPoint(victim,at);
                    if(!scope.clear(at,contact))return;
                    if(hurt(current,victim,"seedbomb",power,{damage:damageSpec("seedbomb","volley")}))hits++;
                });
                WorldFeedback.emit(scope,seedbombScene,1,at,{moment:hits?"burst":"miss",seeds:seeds,chaff:chaff,hits:hits,scale:spread/1.5,intensity:power/80},22);
                scope.sound("cobblemon:impact.grass",at,16,"{}");scope.cancelProjectile(flight);finish(current);
            }
            function fuse(current:CombatAction,age:number):void{
                if(burst)return;const scope=current.world(),shots:CombatProjectileFacts[]=JSON.parse(scope.projectiles(current.origin(),32));
                const shot=shots.filter(value=>value.id===flight)[0];if(!shot){finish(current);return;}
                last=WorldCombat.point(shot.position[0],shot.position[1],shot.position[2]);
                scenes.show(current,"shell",last,{moment:"rolling",projectile:flight,crack:age/(heavy?3:6),seeds:seeds,scale:radius*2});
                if(age >= (heavy?3:6)){crack(current,last);return;}current.after(1,next=>fuse(next,age+1));
            }
            action.releaseTarget();sound(action,"cobblemon:move.seedbomb.actor");
            flight=LivingActions.projectile(action,{speed:velocity.length(),direction:velocity.unit(),range:delta.length()+2*drop+8,radius:radius,gravity:gravity,lifetime:duration+30,
                appearance:{item:"minecraft:pumpkin_seeds",scale:Math.max(.7,radius*2.4),bounce:1,restitution:heavy?.12:.35},
                impact:function(current,hit){
                    last=hit.position();
                    if(!bounced&&!hit.hitEntity()&&hit.blockFace()==="up"){
                        bounced=true;scenes.stop(current,"flight");current.after(1,next=>fuse(next,1));return;
                    }
                    crack(current,last);
                }},function(current){if(!burst&&!bounced)WorldFeedback.emit(current.world(),seedbombScene,1,last,{moment:"miss",seeds:seeds,scale:radius},14);finish(current);});
            scenes.show(action,"flight",origin,{moment:"toss",projectile:flight,seeds:seeds,scale:spread/1.5});
        }
    });
}
