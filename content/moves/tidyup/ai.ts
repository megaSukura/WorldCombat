/**
 * 大扫除 / tidyup 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：身边这片场地里有别人留下的陷阱或替身时最值得扫（清干净本身就是目的，priority 108）；
 *   否则有威胁时也能当作一支抬攻速的整备招（priority 100）。已经在轻快窗口里就不再重复。
 * 什么时候最想出手：陷阱在附近时抢在共享交战次序前扫掉；没有陷阱时按常规整备节奏出手，贴身下限内让位给普通攻击。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：陷阱被收走、攻与速抬起来；窗口内不再重复，窗口走完才重新考虑。
 * 检测用只读、决策内缓存的事实探针，扫附近 8 格内四条陷阱规则与替身数量。
 */
namespace PokemonSkills {
    /** 只读、决策内缓存：附近可被大扫除收走的东西数量；半径取常规清扫范围，够不到的不算。 */
    CompanionBehavior.registerFact("world_combat:move_tidyup/hazards", function (access, actor, _argument) {
        const body = access.observe(actor);
        if (body === null) return 0;
        const centre = body.position(), reach = 5;
        return tidyupHazardsNear(access, centre, reach).length + tidyupWardsNear(access, centre, reach).length;
    });

    CompanionBehavior.registerUse(tidyupId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "tidyup")) return false;
            const hazards = CompanionBehavior.fact<number>(context, "world_combat:move_tidyup/hazards", self);
            if (hazards !== null && hazards > 0) return true;
            if (!threat) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            return CompanionBehavior.distance(self.point, threat.point) >= CompanionBehavior.ai<number>(capability, "minGap", 2);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const self = CompanionBehavior.source(context);
            const hazards = CompanionBehavior.fact<number>(context, "world_combat:move_tidyup/hazards", self);
            if (hazards !== null && hazards > 0) return 108;
            return context.senses["world_combat:threat"] ? 100 : 0;
        }
    });

    addPreferences(tidyupId, {}, [
        field(pathOf("ai.maxChase"), "扫除距离", "number", {
            min: 3, max: 24, step: 1,
            help: "没有陷阱时，威胁进入这个距离内才考虑把大扫除当整备用；越大越早把攻速垫起来。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再扫、直接应对；调大更常在近身时放弃整备。"
        })
    ]);
}
