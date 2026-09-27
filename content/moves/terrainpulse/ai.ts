/**
 * 大地波动 / terrainpulse —— AI 用途。
 *
 * 出手局面：目标是可见敌对的活体、且在 `ai.maxChase`（默认 14）格内时，作为远程攻击出手。
 * 接地且脚下有场地时 priority 抬到 60，优先把场地当成武器；悬空或无场地时只有 20。
 * 配置：多远考虑出手、驻守指令下是否离位。
 */
namespace CompanionBehavior {
    /** 脚下真实支撑脚点上的场地元素；悬空或脚下无场地/无法识别时为 null。接地与同层判定与执行同源。 */
    function terrainpulseLocked(context: WorldBehavior.Context): string | null {
        var subject = CompanionBehavior.source(context);
        if (subject.grounded === false) return null;
        var access = CompanionBehavior.world(context);
        var feet = CompanionBehavior.point([subject.point[0], subject.point[1] - (subject.height || 1.4) / 2, subject.point[2]]);
        var terrain = PokemonSkills.terrainpulseTerrainAtPoint(access, feet, true);
        return terrain ? terrain.type : null;
    }

    function terrainpulseCharged(context: WorldBehavior.Context): boolean { return terrainpulseLocked(context) !== null; }

    /** 锁定元素对目标属性的相性加分：只有真实克制关系才加，不凭空推断。 */
    var terrainpulseStrong: { [element: string]: string[] } = {
        electric: ["water", "flying"],
        grass: ["water", "ground", "rock"],
        fairy: ["dragon", "dark", "fighting"],
        psychic: ["fighting", "poison"]
    };
    function terrainpulseAffinity(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        var element = terrainpulseLocked(context);
        if (element === null) return 0;
        var stats = CompanionBehavior.combatStats(context, target), types = stats && stats.types ? stats.types : [];
        var strong = terrainpulseStrong[element] || [];
        for (var i = 0; i < types.length; i++) if (strong.indexOf(types[i]) >= 0) return 12;
        return 0;
    }

    function terrainpulseConnected(context:WorldBehavior.Context,target:CompanionBehavior.Entity):boolean{
        return CompanionBehavior.observedFlag(context,"terrainpulse:route:"+target.ref,function(){
            const access=CompanionBehavior.world(context),self=CompanionBehavior.source(context);
            const from=SurfacePaths.support(access,WorldCombat.point(self.point[0],self.point[1]-(self.height||1.4)/2,self.point[2]),.1,2);
            if(!from)return false;
            const delta=CompanionBehavior.point(target.point).minus(from),distance=Math.sqrt(delta.x()*delta.x()+delta.z()*delta.z());
            return !SurfacePaths.advance(access,from,delta,distance,{up:1,down:1,spacing:.5,samples:Math.ceil(distance/.5)+1}).ended;
        });
    }
    registerUse("terrainpulse", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!target) return true;
            return distance(source(context).point,target.point)<=ai(item,"maxChase",14)&&terrainpulseConnected(context,target);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if(!target||!terrainpulseConnected(context,target))return 0;
            return (terrainpulseCharged(context)?60:20)-(target.grounded===false?15:0)+terrainpulseAffinity(context,target);
        }
    });

    PokemonSkills.addPreferences("terrainpulse", { ai: { maxChase: 14, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "推波距离", 3, 24, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
