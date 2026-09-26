/**
 * 欢乐时光 / happyhour 的伙伴 AI 用途：这是这招自己的一套出手计划——开打前先摆开庆典，把之后的战果变现。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，身上还没有庆典光环，且圈里至少站着 ai.minFoes 个
 *   看得见的非友方。圈里人越多这圈越值，优先级越高。
 * 对谁出手：自己；庆典以自身为圆心铺开，不需要选中谁。
 * 够不到怎么办：不需要够——对手太远就先不铺，等它靠近再开，免得场地空放。
 * 放完之后：场地亮着的那段时间里，圈内每倒下一名对手都留下一捧真币；光环还在时不再重复施放。
 */
namespace CompanionBehavior {
    registerFact("world_combat:happyhour/radius", (access, actor, config) => PokemonSkills.p("happyhour", "radius",
        { world: access, actor: actor, detail: { values: config } }));
    function happyhourRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        return fact<number>(context, "world_combat:happyhour/radius", source(context), item.data.config)!;
    }
    /** 庆典半径内看得见的非友方数量。 */
    function happyhourCrowd(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) <= radius) count++;
        }
        return count;
    }

    registerUse("happyhour", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            const self = source(context);
            if (status(context, self, "happyhour")) return false;
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (distance(self.point, threat.point) > ai<number>(capability, "maxChase", 12)) return false;
            const radius = happyhourRadius(context, capability);
            return happyhourCrowd(context, self, radius) >= ai<number>(capability, "minFoes", 1);
        },
        accepts: function (context, _capability, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, capability) {
            const self = source(context);
            const radius = happyhourRadius(context, capability);
            const crowd = happyhourCrowd(context, self, radius);
            return crowd > 0 ? Math.min(72, 48 + (crowd - 1) * 8) : 0;
        }
    });

    PokemonSkills.addPreferences("happyhour", { ai: { maxChase: 12, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 24, 1),
        PokemonSkills.number("ai.minFoes", "庆典最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
