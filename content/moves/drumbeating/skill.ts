/** Each beat advances a finite root head along native support; only a completed arrival settles that beat. */
namespace PokemonSkills {
    const drumbeatingScene = "world_combat:move_drumbeating";
    const drumbeatingBound = "world_combat:drumbeating_bound";
    const drumbeatingBindText = "world_combat.move.drumbeating.text.bind";
    const drumbeatingBeatText = "world_combat.move.drumbeating.text.beat";

    const drumbeatingVisual="world_combat:drumbeating_visual";
    WorldCombat.effect(drumbeatingVisual,1,1200,"actor",json=>json,EffectProtocols.unchanged);
    function drumbeatingWatch(effect:CombatEffect):void{const world=effect.world(),data=JSON.parse(effect.state());
        if(!world.valid(effect.target())||!MobEffects.matches(world,effect.target(),data.carrier)){effect.end();return;}effect.schedule("watch","watch",2,"{}");}
    WorldCombat.effectHandler(drumbeatingVisual,"start",drumbeatingWatch);WorldCombat.effectHandler(drumbeatingVisual,"watch",drumbeatingWatch);
    /** 末拍缠住一名目标：共享速度等级、rootbound 身份、短定身与脚下根须。 */
    function drumbeatingBind(world: CombatWorld, target: CombatActor, point: CombatPoint, stages: number,
        bindTicks: number, rootTicks: number, rootCells: number): void {
        NativeEffects.boost(world, target, "spe", -stages);
        const carrier=MobEffects.apply(world,target,drumbeatingBound,bindTicks,0);if(!carrier)return;
        if (rootTicks > 0) WorldEffects.apply(world, target, "rooted", {}, rootTicks);
        const visual=world.effect(drumbeatingVisual,target,JSON.stringify({carrier:MobEffects.anchor(carrier)}),bindTicks);
        world.sound("minecraft:block.mangrove_roots.place", point, 16, "{}");
        const body = world.observe(target);
        WorldFeedback.onEffect(world,visual,"drumbeating:root:"+visual,drumbeatingScene,1,
            body === null ? point : body.position(),
            { moment: "root", target: String(target.ref()), stages: stages, cells: rootCells, tick: bindTicks });
        if (body !== null) {
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), drumbeatingBindText, [stages], 30);
        }
    }

    define({
        id: "drumbeating",
        name: "Drum Beating",
        description: "每拍鼓点把根头沿真实地面逐段送出，拍起时固定那一拍的落点；抵达才破土结算。末拍实际命中后缠脚降速，断地会截停当前根路。",
        uses: ["隔着地面钉住一个对手", "连奏数拍逐拍造成伤害，末拍再压低速度、钉住腿脚", "在目标脚下留下一圈根须"],
        kind: "aim",
        range: 11,
        maxRange: 11,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 44,
        style: "grass",
        defaults: { deep: false, ai: { maxChase: 13, pinRunners: true } },
        fields: [
            flag("deep", "深根")
        ],
        indicator: function (config, pokemon) {
            return { radius: p("drumbeating", "beatRadius", pokemon), geometry: "area", style: "grass",
                color: 0x7CB342, label: config && config.deep === true ? "鼓击·深根" : "鼓击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["drumbeating"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = !!(config && config.deep);
            return { prepare: Math.round(p("drumbeating", "tempo", context)), recover: 10 + (deep ? 3 : 0),
                cooldown: 44 + (deep ? 8 : 0), active: 0, range: p("drumbeating", "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_drumbeating:tune", drumbeatingScene, 1, action.origin(),
                JSON.stringify({ moment: "tune", deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const beatPower = p("drumbeating", "beat", action);
            const finalPower = p("drumbeating", "final", action);
            const beats = Math.max(3, Math.min(4, Math.round(p("drumbeating", "beats", action))));
            const interval = Math.max(4, Math.round(p("drumbeating", "interval", action)));
            const reach = p("drumbeating", "reach", action);
            const pace = Math.max(0.3, p("drumbeating", "wavePace", action));
            const beatRadius = p("drumbeating", "beatRadius", action);
            const stages = Math.max(1, Math.round(p("drumbeating", "slowStages", action)));
            const bindTicks = Math.max(40, Math.round(p("drumbeating", "bindTicks", action)));
            const rootTicks = Math.max(0, Math.round(p("drumbeating", "rootTicks", action)));
            const rootCells = Math.max(4, Math.round(p("drumbeating", "rootCells", action)));
            const notes = Math.max(8, Math.round(p("drumbeating", "notes", action)));
            const scale = beatRadius / 1.1;
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            const locked = action.targetPosition();
            let settled = false;
            const feetOf = (height: number, point: CombatPoint) => point.minus(WorldCombat.point(0, height / 2, 0));
            sound(action, "cobblemon:move.leafstorm.actor");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 一拍：波峰沿地面冲向目标；`travel` 刻后在目标脚下破土。 */
            function beatAt(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const feet = feetOf(self.height(), self.position());
                const live = targetRef === "" ? null : scope.actor(targetRef);
                const liveBody = live === null ? null : scope.observe(live);
                const desired = liveBody === null ? locked : feetOf(liveBody.height(), liveBody.position());
                const start = SurfacePaths.support(scope,feet,.1,1.1), ground = SurfacePaths.support(scope,desired,.1,3);
                const final = index >= beats - 1;
                sound(current,"minecraft:block.note_block.basedrum");
                if(!start||!ground){nextBeat(current,index);return;}
                const delta=ground.minus(start), heading=WorldGeometry.flatUnit(delta), length=Math.min(reach,Math.sqrt(delta.x()*delta.x()+delta.z()*delta.z()));
                let head=start,travelled=0;
                function travel(next:CombatAction):void{
                    const step=SurfacePaths.advance(next.world(),head,heading,Math.min(pace,length-travelled),{up:1,down:1,spacing:.25,samples:8});
                    travelled+=step.travelled;head=step.point;
                    WorldFeedback.emit(next.world(),drumbeatingScene,1,head,{moment:"wave",beat:index+1,beats,notes,scale,final:final?1:0,
                        path:step.path.map(point=>[point.x(),point.y()+.03,point.z()])},5);
                    if(step.ended){nextBeat(next,index);return;}
                    if(travelled>=length-.01){strikeAt(next,index,head,live,final);return;}
                    next.after(1,travel);
                }
                travel(current);
            }
            function nextBeat(current:CombatAction,index:number):void{
                if(index>=beats-1){finish(current);return;}
                current.after(interval,next=>beatAt(next,index+1));
            }

            /** 波峰到达：破土结算这一拍。 */
            function strikeAt(current: CombatAction, index: number, point: CombatPoint, live: CombatActor | null, final: boolean): void {
                const scope = current.world();
                const power = final ? finalPower : beatPower;
                const intensity = Math.max(0.6, Math.min(2.2, power / 50));
                let struck = 0;
                WorldGeometry.selectBodies(scope, WorldGeometry.bodySector(point.plus(WorldCombat.point(0,.2,0)), WorldCombat.point(1,0,0), Math.max(.8,beatRadius), 360, {below:.2,above:1.2}),
                    function (other, facts) {
                        if (struck >= 3 || scope.friendly(other)) return;
                        struck++;
                        const landed = hurt(current, other, "drumbeating", power,
                            { damage: damageSpec("drumbeating", final ? "final" : "beat") });
                        WorldFeedback.emit(scope, drumbeatingScene, 1, facts.position(),
                            { moment: "strike", target: String(other.ref()), beat: index + 1, beats: beats, notes: notes,
                                final: final ? 1 : 0, intensity: intensity, scale: scale }, 26);
                        if (final && landed && scope.valid(other)) drumbeatingBind(scope, other, facts.position(), stages, bindTicks, rootTicks, rootCells);
                    });
                if (struck === 0 && final) {
                    WorldFeedback.emit(scope, drumbeatingScene, 1, point, { moment: "miss", notes: notes, scale: scale }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), drumbeatingBeatText, [], 22);
                }
                if (final) { finish(current); return; }
                current.after(interval, function (next: CombatAction) { beatAt(next, index + 1); });
            }

            action.releaseTarget();
            beatAt(action, 0);
        }
    });
}
