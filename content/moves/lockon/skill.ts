/** Each caster owns its lock; shared native control remains while another live owner still needs it. */
namespace PokemonSkills {
    const lockonGrip = "world_combat:lockon_grip";
    function lockonAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0,1.2,0)); }
    function lockonViews(world:CombatWorld,actor:CombatActor): readonly CombatEffectView[] { return world.effects(actor,lockonMark); }
    function lockonReleaseMark(world:CombatWorld,actor:CombatActor):void {
        lockonViews(world,actor).forEach(view=>world.operation(view.id(),"world_combat:dispel","{}"));
    }
    WorldCombat.effect(lockonGrip,1,1200,"actor",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(lockonGrip,"start",effect=>effect.schedule("watch","watch",1,"{}"));
    WorldCombat.effectHandler(lockonGrip,"watch",function(effect){
        const world=effect.world(),data=JSON.parse(effect.state()),source=world.actor(data.source);
        if(!source || !world.valid(source) || !world.valid(effect.target()) || !MobEffects.matches(world,source,data.focus) || !MobEffects.matches(world,effect.target(),data.carrier)){effect.end();return;}
        effect.schedule("watch","watch",1,"{}");
    });
    WorldCombat.effectHandler(lockonGrip,"operation:world_combat:refresh_carrier",function(effect){const data=JSON.parse(effect.state());data.carrier=JSON.parse(effect.input());effect.state(JSON.stringify(data));});
    WorldCombat.effectHandler(lockonGrip,"operation:world_combat:dispel",effect=>effect.end());
    WorldCombat.effectHandler(lockonGrip,"end",function(effect){
        const world=effect.world(),target=effect.target(),data=JSON.parse(effect.state());if(!world.valid(target))return;
        const another=world.effects(target,lockonGrip).some(view=>view.id()!==effect.id() && JSON.parse(String(view.data())).carrier.id===data.carrier.id);
        if(!another && MobEffects.matches(world,target,data.carrier))world.removeMobEffect(target,data.carrier.id,data.carrier.key);
    });
    WorldCombat.effect(lockonMark,1,1200,"actor",json=>json,EffectProtocols.unchanged);
    WorldCombat.effectHandler(lockonMark,"start",function(effect){
        const world=effect.world(),data=JSON.parse(effect.state()),source=effect.target(),body=world.observe(source);
        if(body)WorldFeedback.onEffect(world,effect.id(),"reticle",lockonScene,1,body.position(),{moment:"link",target:String(source.ref()),path:[String(source.ref()),data.target],motes:data.motes,held:data.held});
        // 目标身上常驻的准星：按真实碰撞箱逐帧勾出，随本层锁定一起结束；控制还在它就不会散。
        const victim=world.actor(data.target),seen=victim===null?null:world.observe(victim);
        if(seen)WorldFeedback.onEffect(world,effect.id(),"lockon-reticle",lockonReticleScene,1,seen.position(),
            {target:data.target,width:seen.width(),height:seen.height(),held:data.held,motes:data.motes});
        effect.schedule("watch","watch",1,"{}");
    });
    WorldCombat.effectHandler(lockonMark,"watch",function(effect){
        const world=effect.world(),data=JSON.parse(effect.state()),target=world.actor(data.target);
        // 控制结束（目标不再带着本招的锁定身份）即散焦点，不留空锁窗口。
        if(!world.valid(effect.target())||!MobEffects.matches(world,effect.target(),data.focus)||!target||!world.valid(target)||!CombatStatus.has(world,target,lockonStatus)){effect.end();return;}
        effect.schedule("watch","watch",1,"{}");
    });
    WorldCombat.effectHandler(lockonMark,"operation:world_combat:dispel",effect=>effect.end());
    WorldCombat.effectHandler(lockonMark,"end",function(effect){
        const world=effect.world(),data=JSON.parse(effect.state());
        world.operation(data.grip,"world_combat:dispel","{}");
        if(world.valid(effect.target())&&MobEffects.matches(world,effect.target(),data.focus))world.removeMobEffect(effect.target(),data.focus.id,data.focus.key);
    });
    NativeEffects.appliedRules.define({id:"world_combat:move_lockon/spend",apply:function(hit){
        if(!hit.data || !(hit.data.actual>0) || ["physical","special"].indexOf(hit.data.category)<0 || !hit.world.valid(hit.source))return;
        const world=hit.world;
        lockonViews(world,hit.source).forEach(view=>{
            const data=JSON.parse(String(view.data()));if(data.target!==String(hit.target.ref()))return;
            world.operation(view.id(),"world_combat:dispel","{}");
            const body=world.observe(hit.target);if(body)WorldFeedback.emit(world,lockonScene,1,body.position(),{moment:"strike",target:String(hit.target.ref()),motes:data.motes,held:data.held,intensity:1},22);
        });
    }});
    define({
        id: lockonId,
        cooldownParameter: "recharge",
        name: "锁定",
        description: "把准星咬住一个对手，在同一段窗口里拖慢它的移动（钉死时连飞行速度一起归零，不抹掉既有动量）；你用物理或特殊伤害命中它时锁即用掉，窗口走完也会散去。",
        uses: ["在对手要逃开前先钉住它", "把目标拖住，为近身追击争取时间", "把跑得快的目标拖慢下来集火"],
        kind: "enemy",
        range: 9,
        maxRange: 13,
        prepare: 7,
        active: 1,
        recover: 4,
        cooldown: 88,
        style: "lock",
        defaults: { hold: false },
        fields: [flag("hold", "钉死")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[lockonId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(2, Math.round(p(lockonId, "tempo", context))),
                recover: Math.round(p(lockonId, "aftercast", context)),
                cooldown: Math.round(p(lockonId, "recharge", context)),
                active: 1,
                range: p(lockonId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(lockonId, "reach", pokemon) : 9, geometry: "line", style: "lock",
                color: 0x6FD8FF, label: config && config.hold ? "锁定·钉死" : "锁定" };
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_lockon:windup", lockonScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hold: config && config.hold ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, lockonScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (point.minus(origin).length() > p(lockonId,"reach",action) || !world.clear(origin, point)) {
                WorldFeedback.emit(world, lockonScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, lockonAbove(point), "world_combat.move.lockon.text.blocked", [], 28);
                done(action);
                return;
            }
            const hold = !!(config && config.hold);
            const ticks = Math.max(40, Math.round(p(lockonId, "lockTicks", action)));
            const motes = Math.max(8, Math.round(p(lockonId, "motes", action)));
            lockonReleaseMark(world, actor);
            const control = hold ? lockonClampEffect : lockonTrackEffect;
            const carrier = MobEffects.apply(world, target, control, ticks, 0);
            if (!carrier) {
                WorldFeedback.emit(world,lockonScene,1,point,{moment:"blocked",target:String(target.ref())},18);
                done(action); return;
            }
            const anchor = MobEffects.anchor(carrier);
            const focus = MobEffects.apply(world, actor, lockonFocusEffect, ticks, 0);
            if (!focus) {
                // 焦点挂不上就不留一个不受控的减速：把刚建立的 carrier 收回。
                world.removeMobEffect(target, anchor.id, anchor.key);
                WorldFeedback.emit(world,lockonScene,1,point,{moment:"blocked",target:String(target.ref())},18);
                done(action); return;
            }
            // Every owner of this move's shared native icon adopts the latest carrier revision.
            world.effects(target,lockonGrip).forEach(view => {
                const old = JSON.parse(String(view.data()));
                if (old.carrier.id === control) world.operation(view.id(),"world_combat:refresh_carrier",JSON.stringify(anchor));
            });
            const grip = world.effect(lockonGrip,target,JSON.stringify({carrier:anchor,focus:MobEffects.anchor(focus),source:String(actor.ref())}),ticks);
            world.effect(lockonMark,actor,JSON.stringify({motes:motes,held:hold?1:0,target:String(target.ref()),grip:grip,focus:MobEffects.anchor(focus),carrier:anchor}),ticks);
            sound(action, "minecraft:block.beacon.power_select");
            if (self !== null) {
                WorldFeedback.emit(world, lockonScene, 1, self.position(),
                    { moment: "lock", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        motes: motes, held: hold ? 1 : 0, scale: Math.max(0.6, Math.min(2, ticks / 180)) }, 32);
                WorldFeedback.text(world, lockonAbove(self.position()), lockonReadyText, [Math.round(ticks / 20)], 30);
            }
            done(action);
        }
    });
}
