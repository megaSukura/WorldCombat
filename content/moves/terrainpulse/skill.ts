/** Finite surface waves use actual native collider heights and stop at missing or obstructed ground. */
namespace PokemonSkills {
    const terrainpulseScene="world_combat:move_terrainpulse";
    function terrainpulseStrike(action:CombatAction,config:any,done:(current:CombatAction)=>void):void{
        const world=action.world(),body=world.observe(action.actor());if(!body){done(action);return;}
        const feet=body.boundsMin().plus(WorldCombat.point(body.position().x()-body.boundsMin().x(),0,body.position().z()-body.boundsMin().z()));
        const start=SurfacePaths.support(world,feet,.1,4);if(!start){done(action);return;}
        const terrain=body.grounded()?terrainpulseTerrainAt(world,body.position()):null,colour=terrain?terrain.colour:0x9AA0A8,element=terrain?terrain.type:"normal";
        const power=p("terrainpulse","pulse",action),pace=p("terrainpulse","velocity",action),radius=p("terrainpulse","radius",action),reach=action.range();
        const bursts=p("terrainpulse","bursts",action),ring=p("terrainpulse","ring",action),heading=WorldGeometry.flatUnit(aim(action)),side=WorldCombat.point(-heading.z(),0,heading.x());
        const count=config&&config.resonate?2:1,scenes=WorldFeedback.actionScenes(terrainpulseScene);
        const waves:{point:CombatPoint;distance:number;seen:{[ref:string]:boolean};ended:boolean;width:number}[]=[];
        for(let i=0;i<count;i++){
            const at=SurfacePaths.support(world,start.plus(side.scale(count===1?0:(i?1:-1)*radius*.65)),.6,.6);
            if(at)waves.push({point:at,distance:0,seen:{},ended:false,width:radius*(i?1.35:1)});
        }
        sound(action,"cobblemon:move.bulldoze.actor");
        WorldFeedback.emit(world,terrainpulseScene,1,start,{moment:"stomp",tint:colour,scale:1,charged:terrain?1:0},20);
        action.releaseTarget();
        function advance(current:CombatAction):void{
            const scope=current.world();let active=0;
            waves.forEach(function(wave,index){
                if(wave.ended)return;
                const step=SurfacePaths.advance(scope,wave.point,heading,Math.min(pace,reach-wave.distance),{up:1,down:1,spacing:.25,samples:8});
                for(let i=1;i<step.path.length;i++){
                    const from=step.path[i-1].plus(WorldCombat.point(0,.16,0)),to=step.path[i].plus(WorldCombat.point(0,.16,0));
                    WorldGeometry.selectBodies(scope,WorldGeometry.bodySegment(from,to,wave.width),function(enemy,facts){
                        const ref=String(enemy.ref());if(scope.friendly(enemy)||wave.seen[ref])return;wave.seen[ref]=true;
                        const landed=hurt(current,enemy,"terrainpulse",power,{damage:damageSpec("terrainpulse","pulse"),resolve:function(){return{type:element};}});
                        if(landed)WorldFeedback.emit(scope,terrainpulseScene,1,to,{moment:"impact",target:ref,tint:colour,bursts,scale:ring},22);
                    });
                }
                wave.point=step.point;wave.distance+=step.travelled;
                scenes.show(current,"wave"+index,wave.point,{moment:"surface",tint:colour,path:step.path.map(p=>p.plus(side.scale(-wave.width))).concat(step.path.slice().reverse().map(p=>p.plus(side.scale(wave.width)))).map(p=>[p.x(),p.y()+.04,p.z()]),width:wave.width});
                wave.ended=step.ended||wave.distance>=reach-.01;if(wave.ended)scenes.stop(current,"wave"+index);else active++;
            });
            if(!active){scenes.finish(current,done);return;}current.after(1,advance);
        }
        advance(action);
    }
    define({
        id: "terrainpulse",
        name: "大地波动",
        description: "把脚下地气压成逐段贴地推进的地脉，沿真实台阶起落，断地或高墙会截停。接地场地决定出手元素与加成，共鸣变成相邻的宽窄两道。",
        uses: ["看脚下的场地出手", "在场地里放大威力"],
        kind: "aim",
        range: 12,
        maxRange: 20,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 32,
        style: "ground",
        defaults: { resonate: false },
        fields: [flag("resonate", "共鸣")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["terrainpulse"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("terrainpulse", "charge", context)), recover: 8, cooldown: 32, active: 0,
                range: p("terrainpulse", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var point = body ? body.position() : action.origin();
            var terrain = body && body.grounded() ? terrainpulseTerrainAt(action.sense(), point) : null;
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:terrainpulse:" + action.id(), terrainpulseScene, 1, action.origin(), JSON.stringify({
                moment: "windup", tint: terrain ? terrain.colour : 0x9AA0A8, scale: scale, charged: terrain ? 1 : 0 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            terrainpulseStrike(action, config, done);
        },
        indicator: function () { return { radius: 12, geometry: "line", style: "ground", label: "大地波动" }; }
    });
}
