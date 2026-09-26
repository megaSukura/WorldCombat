/** A bounded held charge makes final spread depend on recent aim stability, then launches one heavy projectile. */
namespace PokemonSkills {
    const focusblastScene = "world_combat:move_focusblast";
    const focusblastSunderText = "world_combat.move.focusblast.text.sunder";

    function focusblastAim(action:CombatAction):CombatPoint {
        const input=JSON.parse(action.control()||"{}"),sample=input.samples&&input.samples[0];
        const point=sample&&sample.point?WorldCombat.point(sample.point[0],sample.point[1],sample.point[2]):action.targetPosition();
        const delta=point.minus(action.origin());return delta.length()>.001?delta.unit():action.direction();
    }
    define({
        id: "focusblast",
        name: "Focus Blast",
        description: "按住蓄势，准备完成后松手打出真气重弹，额外至多十六刻便自动放出。最后短窗瞄得越稳，散射越小，最低降到四分之一；威力沿原预算，命中推开并可能降特防。",
        uses: ["拉开距离对站桩目标砸出最重的一发", "把贴脸的对手或掩体后的人推出去", "用最高单发伤害先行减员"],
        kind: "aim",
        range: 16,
        maxRange: 22,
        prepare: 26,
        active: 80,
        recover: 12,
        cooldown: 40,
        style: "focus",
        stationary: true,
        defaults: { unleash: false, ai: { maxChase: 20, minRange: 6, bulkFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("focusblast", "reach", pokemon), geometry: "line", style: "focus",
                color: 0xE8C86A, label: config && config.unleash === true ? "全力真气弹" : "真气弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["focusblast"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const unleash = !!(config && config.unleash);
            return {
                prepare: Math.round(p("focusblast", "charge", context)),
                recover: 12,
                cooldown: 40 + (unleash ? 4 : 0),
                active: 80,
                range: p("focusblast", "reach", context)
            };
        },
        windup:function(action,config,prepare){
            const start=action.sense().tick(),input=JSON.parse(action.control()||"{}"),direction=focusblastAim(action);
            action.data("focusblast/charge",JSON.stringify({start:start,ready:start+prepare,stable:0,direction:[direction.x(),direction.y(),direction.z()],manual:!!input.token,released:false,fired:false}));
            action.on("world_combat:input-release",function(current){
                const state=JSON.parse(current.data("focusblast/charge")||"{}");if(state.fired)return;
                if(current.sense().tick()<state.ready){current.reject("charge-incomplete");return;}
                state.released=true;current.data("focusblast/charge",JSON.stringify(state));
            });
            function sample(current:CombatAction):void {
                const state=JSON.parse(current.data("focusblast/charge")||"{}");if(state.fired)return;
                const now=focusblastAim(current),old=WorldCombat.point(state.direction[0],state.direction[1],state.direction[2]);
                const dot=now.x()*old.x()+now.y()*old.y()+now.z()*old.z();
                state.stable=dot>=Math.cos(2*Math.PI/180)?Math.min(8,state.stable+1):Math.max(0,state.stable-4);
                state.direction=[now.x(),now.y(),now.z()];current.data("focusblast/charge",JSON.stringify(state));
                const spread=p("focusblast","scatter",current)*(1-.75*state.stable/8);
                current.present("world_combat:focusblast/charge",focusblastScene,1,current.origin(),JSON.stringify({moment:"charge",jitter:.12+spread*.025,motes:p("focusblast","motes",current),unleash:config&&config.unleash?1:0}));
                current.after(1,sample);
            }
            sample(action);return prepare;
        },
        execute: function (action, move, config, done) {
            function release(current:CombatAction):void {
                const state=JSON.parse(current.data("focusblast/charge")||"{}");
                current.stopMovement();
                const elapsed=current.world().tick()-state.ready;
                if(!state.released && elapsed < (state.manual?16:6)){current.after(1,release);return;}
                state.fired=true;current.data("focusblast/charge",JSON.stringify(state));
                current.present("world_combat:focusblast/charge",focusblastScene,1,current.origin(),JSON.stringify({moment:"charge",lifecycle:{reason:"released",tick:current.world().tick()}}));
                launch(current,state);
            }
            function launch(action:CombatAction,state:any):void {
            const world = action.world();
            const origin = action.origin();
            const power = p("focusblast", "core", action);
            const scatter = p("focusblast", "scatter", action)*(1-.75*Math.min(8,state.stable)/8);
            const speed = p("focusblast", "velocity", action);
            const radius = p("focusblast", "radius", action);
            const chance = p("focusblast", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("focusblast", "sunderStage", action)));
            const blowback = p("focusblast", "blowback", action);
            const motes = Math.max(16, Math.round(p("focusblast", "motes", action)));
            const scale = Math.max(0.6, Math.min(2.6, power / 116));
            const intensity = Math.max(0.6, Math.min(2.6, power / 116));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            // 散布：把准线在水平面上随机偏转 `scatter` 度以内的一个角度，这就是原生 70 命中的即时翻译。
            const base = focusblastAim(action);
            action.releaseTarget();
            const tilt = (world.random() * 2 - 1) * scatter * Math.PI / 180;
            const side = WorldCombat.point(-base.z(), 0, base.x());
            const lateral = side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
            const heading = base.scale(Math.cos(tilt)).plus(lateral.scale(Math.sin(tilt))).unit();

            sound(action, "cobblemon:impact.fighting");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: heading,
                lifetime: Math.max(30, Math.round(action.range() / Math.max(0.2, speed) + 24)),
                appearance: {
                    sprite: "cobblemon:generic/orb/largefadeorb", tint: 0xE8C86A, glow: true,
                    scale: Math.max(0.9, Math.min(2.2, radius / 0.3))
                },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, "focusblast", power, { damage: damageSpec("focusblast", "core") });
                        if (landed) {
                            const outward = point.minus(origin);
                            if (outward.length() > 0.1 && scope.valid(victim))
                                scope.hitDisplace(victim, WorldCombat.point(outward.x(), 0, outward.z()).unit().scale(blowback));
                            if (scope.valid(victim) && scope.random() < chance) {
                                NativeEffects.boost(scope, victim, "spd", -stages);
                                const body = scope.observe(victim);
                                if (body !== null)
                                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), focusblastSunderText, [stages], 30);
                            }
                        }
                        WorldFeedback.emit(scope, focusblastScene, 1, point,
                            { moment: "blast", target: String(victim.ref()), motes: motes, scale: scale, intensity: intensity }, 28);
                        sound(current, "cobblemon:impact.fighting");
                    } else {
                        WorldFeedback.emit(scope, focusblastScene, 1, point,
                            { moment: "fizzle", motes: motes, scale: scale }, 22);
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.actionScenes(focusblastScene).show(action,"flight",origin,{moment:"travel",projectile:flight,motes:motes,scale:scale,intensity:intensity});
            }
            release(action);
        }
    });
    WorldCombat.preview("world_combat:focusblast",JSON.stringify({radius:.3,lineOfSight:true,input:{version:1,steps:["point"],sustained:true}}));
}
