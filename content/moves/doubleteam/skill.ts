/** A short real sidestep leaves attackable, one-hit afterimages at visited positions. */
namespace PokemonSkills {
    function doubleteamAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0,1,0)); }
    const doubleteamBody="world_combat:doubleteam_body";
    WorldBodies.define(doubleteamBody,{maxTicks:600,start:function(brain){
        const world=brain.world(),body=world.observe(brain.target()); if(!body)return;
        const data=JSON.parse(brain.state()),ref=String(brain.target().ref()),point=body.position();
        WorldFeedback.onEffect(world,brain.id(),"doubleteam:body:"+brain.id(),doubleteamScene,1,point,{moment:"sustain",target:ref,copies:1,intensity:.5});
        // The live native source model is drawn at the decoy's actual body, with no additional visual entity.
        WorldFeedback.onEffect(world,brain.id(),"doubleteam:shape:"+brain.id(),doubleteamDecoyScene,1,point,
            {target:ref,model:data.owner,width:body.width(),height:body.height(),created:world.tick(),expires:world.tick()+brain.remaining()});
    },tick:{every:4,handler:function(brain){
        const world=brain.world(),data=JSON.parse(brain.state()),owner=world.actor(data.owner);
        if(!owner || !world.valid(owner) || !MobEffects.matches(world,owner,data.carrier))brain.end();
    }},operations:{"world_combat:doubleteam/attracted":function(brain){
        const data=JSON.parse(brain.state()),input=JSON.parse(brain.input());data.attracted.push(input.ref);brain.state(JSON.stringify(data));
    }},end:function(brain){
        const world=brain.world(),data=JSON.parse(brain.state()),self=brain.target(),owner=world.actor(data.owner);
        data.attracted.forEach(function(ref:string){const enemy=world.actor(ref),body=enemy&&world.observe(enemy),target=body&&body.attacking();
            if(enemy&&target&&String(target.ref())===String(self.ref()))world.target(enemy,owner&&world.valid(owner)?owner:null);});
        const live=world.valid(self)?world.observe(self):null;
        const at=live?live.position():WorldCombat.point(data.position[0],data.position[1],data.position[2]);
        // Broken/cleared shadows shatter where they actually stand; a timed-out shadow quietly thins out.
        WorldFeedback.emit(world,doubleteamScene,1,at,
            {moment:String(brain.reason())==="expired"?"collapse":"shatter",intensity:.65,copies:1},18);
    }});
    define({
        freeMovement: true,
        id: doubleteamId,
        cooldownParameter: "recharge",
        name: "影子分身",
        description: "向选定侧方短移，在真正走过的位置隔开放下数个一击即破的诱饵身体；追兵可能把矛头转向旧位置，本体仍正常承受命中的伤害。加速短暂，宝可梦的1级闪避提升是持久的等级提升。",
        uses: ["在被集火前先手留影，把伤害引到影子上", "被追击时借加速脱身，让残影替你挨打", "为换位或撤退争取几秒"],
        kind: "motion",
        range: 4,
        maxRange: 5,
        prepare: 12,
        active: 1,
        recover: 6,
        cooldown: 140,
        style: "afterimage",
        defaults: { deploy: "swarm" },
        fields: [
            choice("deploy", "留影方式", ["swarm", "swift"], ["群影", "疾影"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[doubleteamId], detail: { values: config }, world, actor, attributes };
            const swarm = config.deploy !== "swift";
            return {
                prepare: Math.round(p(doubleteamId, "tempo", context)) + (swarm ? 3 : -2),
                recover: Math.round(p(doubleteamId, "aftercast", context)),
                cooldown: Math.round(p(doubleteamId, "recharge", context) * (swarm ? 1.2 : 0.75)),
                range: 4,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_doubleteam:windup", doubleteamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", swift: config.deploy === "swift" ? 1 : 0 }));
            return prepare;
        },
        indicator: function () { return { radius: 1.4, geometry: "circle", style: "afterimage", color: 0x9AA8C8, label: "影子分身" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor); if (!body) { done(action); return; }
            const swarm = config.deploy !== "swift", copies = Math.max(1, Math.min(5, Math.round(p(doubleteamId,"copies",action)) + (swarm ? 1 : -1)));
            const window = Math.max(40,Math.round(p(doubleteamId,"mirrorWindow",action)*(swarm ? 1.25 : .8)));
            const distance = Math.min(4,p(doubleteamId,"mirrorPool",action)*(swarm ? .85 : 1.15));
            const heading = WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()),action.direction()), path = [body.position()];
            const carrier = MobEffects.apply(world,actor,doubleteamEffect,window,0);
            if (!carrier) { done(action); return; }
            if (String(actor.domain()) === "cobblemon") NativeEffects.boost(world,actor,"evasion",1);
            if (!swarm) MobEffects.apply(world,actor,"minecraft:speed",window,1);
            let travelled=0;
            function deploy(current: CombatAction): void {
                const scope=current.world(), created: CombatActor[]=[];
                // Walk the actually-visited centres and keep a minimum body-scaled gap, so a wall-shortened
                // path leaves fewer, non-overlapping decoys instead of stacking them on one spot.
                const minGap=Math.max(.6,body!.width()*1.15), centres: CombatPoint[]=[];
                for(let i=0;i<path.length&&centres.length<copies;i++){
                    if(centres.length&&path[i].minus(centres[centres.length-1]).length()<minGap)continue;
                    centres.push(path[i]);
                }
                for (let i=0;i<centres.length;i++) {
                    const at=centres[i].minus(WorldCombat.point(0,body!.height()/2,0));
                    if(!scope.freeSpace(at,body!.width(),body!.height()))continue;
                    const shadow=WorldBodies.spawn(scope,at,{size:[body!.width(),body!.height()],health:1,gravity:false,pushable:false,knockbackResistance:1,silent:true},doubleteamBody,
                        { owner:String(actor.ref()),carrier:MobEffects.anchor(carrier!),attracted:[],position:[at.x(),at.y(),at.z()] },window);
                    created.push(shadow);
                }
                const nearby=scope.query(path[0],7,true);
                for(let i=0;i<nearby.length && created.length;i++) {
                    const enemy=nearby[i], facts=scope.observe(enemy); if(!facts || scope.friendly(enemy))continue;
                    const attacking=facts.attacking(); if(!attacking || String(attacking.ref())!==String(actor.ref()))continue;
                    const shadow=created[i%created.length];
                    if(scope.target(enemy,shadow))WorldBodies.operate(scope,shadow,"world_combat:doubleteam/attracted",{ref:String(enemy.ref())});
                }
                WorldFeedback.emit(scope,doubleteamScene,1,current.origin(),{moment:"deploy",copies:created.length,motes:p(doubleteamId,"motes",current)},24);
                WorldFeedback.text(scope,doubleteamAbove(current.origin()),"world_combat.move.doubleteam.text.deploy",[created.length],24);
                done(current);
            }
            function shift(current: CombatAction): void {
                const step=Math.min(.65,distance-travelled), before=current.origin();
                const moved=current.world().displace(current.actor(),heading.scale(step));
                travelled+=moved;path.push(current.origin());
                if(moved<step-.02 || travelled>=distance-.01){deploy(current);return;}
                current.after(1,shift);
            }
            sound(action,"minecraft:entity.illusioner.mirror_move"); shift(action);
        }
    });

}
