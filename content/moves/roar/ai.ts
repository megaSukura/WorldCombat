/** Accepted fear briefly takes precedence over the receiver's companion attack plan; native mobs use their own paths. */
namespace CompanionBehavior {
    function roarFear(context:WorldBehavior.Context):boolean{
        const world=CompanionBehavior.world(context),actor=world.source();
        return world.effects(actor,PokemonSkills.roarRout).some(view=>JSON.parse(String(view.data())).active===true);
    }
    registry.goal({id:"world_combat:roar/flee",propose:context=>roarFear(context)?[{id:"accepted-fear",kind:"world_combat:roar/flee",data:{}}]:[]});
    registry.method({id:"world_combat:roar/flee",propose:(_context,goal)=>goal.kind==="world_combat:roar/flee"?[{id:"receiver-navigation",data:{}}]:[],create:()=>WorldBehavior.step(context=>roarFear(context)?WorldBehavior.running():WorldBehavior.success())});
    orderGoals("world_combat:roar/flee",function(_context,order){order.unshift("world_combat:roar/flee");});
}
namespace CompanionBehavior {
    function roarCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context), nearby = context.facts.nearby as Entity[];
        const access=world(context),actor=access.source();
        const safe=PokemonSkills.p("roar","keepOut",{world:access,actor:actor,skill:PokemonSkills.skills["roar"],detail:{values:{}}});
        const limit = Math.min(item.data.range,ai<number>(item,"maxChase",6),safe);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0 || status(context,other,"routed")) continue;
            const target=access.actor(other.ref);if(!target||access.effects(target,"world_combat:roar_refused").length)continue;
            if (distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    registerUse("roar", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        ready: function (context, item) {
            return item.data.ready !== false && roarCount(context, item) >= ai<number>(item, "minFoes", 1);
        },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            return !status(context, target, "routed");
        },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target) return 0;
            let base = 40 + Math.min(20, roarCount(context, item) * 7);
            if (ratio(source(context)) < 0.5) base += 6;
            return Math.min(88, base);
        }
    });

    PokemonSkills.addPreferences("roar", { ai: { maxChase: 6, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "吼叫距离", 2, 12, 1),
        PokemonSkills.number("ai.minFoes", "圈内最少人数", 1, 6, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
