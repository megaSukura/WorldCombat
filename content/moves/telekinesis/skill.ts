/** A scoped gravity contribution and permission-aware received displacement hold one real body at a low fixed point. */
namespace PokemonSkills {
    const telekinesisScene="world_combat:move_telekinesis",telekinesisField="world_combat:telekinesis_field",telekinesisMark="world_combat:telekinesis_mark",telekinesisRefused="world_combat:telekinesis_refused",telekinesisStatus="telekinesis";
    const telekinesisBurrowers=["diglett","dugtrio","palossand","sandygast"];
    WorldCombat.effect(telekinesisRefused,1,160,"actor",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(telekinesisRefused,"start",function(){});
    WorldCombat.effect(telekinesisMark,1,1200,"actor",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(telekinesisMark,"start",function(effect){
        const world=effect.world(),target=effect.target(),data=JSON.parse(effect.state());
        if(!MobEffects.matches(world,target,data.carrier)||!world.attribute(target,"minecraft:generic.gravity",-1,"add_multiplied_total")){effect.end();return;}
        MobEffects.bind(world,target,telekinesisField);world.attribute(target,"minecraft:generic.movement_speed",-Math.max(0,Math.min(.95,data.hold)),"add_multiplied_total");
        const body=world.observe(target);if(body)WorldFeedback.onEffect(world,effect.id(),"lift",telekinesisScene,1,body.position(),{moment:"hover",target:String(target.ref()),rings:data.rings,path:[data.cast,String(target.ref())]});
        effect.schedule("lift","lift",1,"{}");
    });
    WorldCombat.effectHandler(telekinesisMark,"lift",function(effect){
        const world=effect.world(),target=effect.target(),data=JSON.parse(effect.state()),source=world.actor(data.cast),body=world.observe(target);
        if(!source||!world.valid(source)||!body||!MobEffects.matches(world,target,data.carrier)||CombatStatus.has(world,target,"smackdown")||CombatStatus.has(world,target,"ingrain")){effect.end();return;}
        const goal=WorldCombat.point(data.anchor[0],data.anchor[1]+body.height()/2,data.anchor[2]),offset=goal.minus(body.position());
        if(Math.sqrt(offset.x()*offset.x()+offset.z()*offset.z())>1.4||body.velocity().length()>.8){effect.end();return;}
        if(offset.length()>.02){
            const step=offset.length()>.18?offset.unit().scale(.18):offset;
            const moved=data.friendly?world.displace(target,step):world.hitDisplace(target,step);
            if(moved<.001){effect.end();return;}
        }
        data.age++;if(data.age>12&&body.boundsMin().y()-data.floor<.12){effect.end();return;}
        effect.state(JSON.stringify(data));effect.schedule("lift","lift",1,"{}");
    });
    WorldCombat.effectHandler(telekinesisMark,"operation:world_combat:dispel",effect=>effect.end());
    WorldCombat.effectHandler(telekinesisMark,"end",function(effect){const body=effect.world().observe(effect.target());if(body)WorldFeedback.emit(effect.world(),telekinesisScene,1,body.position(),{moment:"settle",target:String(effect.target().ref())},18);});
    NativeEffects.appliedRules.define({id:"world_combat:telekinesis/release",apply:function(hit){if(hit.data.actual>0)hit.world.effects(hit.target,telekinesisMark).forEach(view=>hit.world.operation(view.id(),"world_combat:dispel","{}"));}});
    NativeEffects.incomingRules.define({id:"world_combat:telekinesis/ground",apply:function(hit){
        if(!(hit.data.amount>0)||hit.data.bypassesInvulnerability||String(hit.data.type||"").toLowerCase()!=="ground")return;
        const world=hit.world,body=world.observe(hit.target);if(!body||body.grounded())return;
        const marks=world.effects(hit.target,telekinesisMark);if(!marks.some(view=>MobEffects.matches(world,hit.target,JSON.parse(String(view.data())).carrier)))return;
        const feet=WorldCombat.point(body.position().x(),body.boundsMin().y(),body.position().z()),floor=SurfacePaths.support(world,feet,.05,2);
        if(!floor||feet.y()-floor.y()<.2)return;
        hit.data.amount=0;WorldFeedback.emit(world,telekinesisScene,1,body.position(),{moment:"negate",target:String(hit.target.ref()),source:"ground"},16);
    }});
    define({
        id: "telekinesis",
        cooldownParameter: "recharge",
        name: "意念移物",
        description: "把一名可抬身体真实托到低空，敌人受原生抗性和控制许可约束，也可托起明确选中的伙伴。顶棚限制实际高度，受伤、解除或失距松开；只有实际离地的持有者才免地面招。",
        uses: ["把要跑的对手吊在半空集火", "让地面招式打不到它（也保护它免受地面招）", "在对手挪不动时集火"],
        kind: "aim",
        range: 7,
        maxRange: 13,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "lift",
        defaults: { pin: false, ai: { maxChase: 13, requireGrounded: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["telekinesis"], detail: { values: config } };
            return { radius: p("telekinesis", "reach", context), geometry: "line", style: "lift", color: 0x8A5CF0,
                label: config && config.pin === true ? "意念移物 · 压住" : "意念移物" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["telekinesis"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("telekinesis", "tempo", context)),
                recover: Math.round(p("telekinesis", "aftercast", context)),
                cooldown: Math.round(p("telekinesis", "recharge", context)),
                active: 1,
                range: p("telekinesis", "reach", context)
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, target, telekinesisStatus)) return "already-lifted";
            if (CombatStatus.has(world, target, "smackdown") || CombatStatus.has(world, target, "ingrain")) return "anchored";
            if (String(target.domain()) === "cobblemon") {
                const species = String(CobblemonCombat.pokemon(target).species()).replace("cobblemon:", "");
                if (telekinesisBurrowers.indexOf(species) >= 0) return "cannot-lift";
            }
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (world.closestPoint(target,action.origin()).minus(action.origin()).length() > p("telekinesis", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), world.closestPoint(target,action.origin()))) return "no-line";
            return "";
        },
        windup: function (action, _config, prepare) {
            const actor = action.actor(), target = action.target();
            action.present("world_combat:telekinesis:gather", telekinesisScene, 1, action.origin(), JSON.stringify({
                moment: "gather", target: target === null ? "" : String(target.ref()),
                path: target === null ? [String(actor.ref())] : [String(actor.ref()), String(target.ref())],
                rings: p("telekinesis", "rings", action)
            }));
            return prepare;
        },
        execute:function(action,_move,config,done){
            const world=action.world(),target=action.target();if(!target||!world.valid(target)){done(action);return;}
            const body=world.observe(target);if(!body){done(action);return;}
            const feet=WorldCombat.point(body.position().x(),body.boundsMin().y(),body.position().z());
            const support=SurfacePaths.support(world,feet,.1,2);if(!support){done(action);return;}
            const friendly=world.friendly(target),lift=WorldCombat.point(0,.08,0);
            const moved=friendly?world.displace(target,lift):world.hitDisplace(target,lift);
            const window=Math.max(20,Math.round(p("telekinesis","window",action)));
            if(moved<.001 || !CombatStatus.apply(world,target,"telekinesis",telekinesisField,window,0,{beneficial:friendly})){
                world.effect(telekinesisRefused,target,"{}",160);WorldFeedback.emit(world,telekinesisScene,1,body.position(),{moment:"cut",target:String(target.ref())},16);done(action);return;
            }
            const carrier=world.mobEffect(target,telekinesisField);if(!carrier){done(action);return;}
            world.effect(telekinesisMark,target,JSON.stringify({carrier:MobEffects.anchor(carrier),cast:String(action.actor().ref()),friendly:friendly,
                anchor:[body.position().x(),feet.y()+(config&&config.pin?1.2:1.5),body.position().z()],floor:support.y(),height:body.height(),hold:p("telekinesis","hold",action),rings:p("telekinesis","rings",action),age:0}),window);
            sound(action,"minecraft:block.beacon.activate");done(action);
        }
    });
}
