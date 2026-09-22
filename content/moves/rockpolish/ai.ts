/**
 * 岩石打磨 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且在 ai.maxChase 内时，先站定磨一轮；身边暂时安全时（驻守／自主／工作）也先磨好。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时 priority 110 抢在共享次序前——趁距离还够，把这段要站着不动的时间花掉；
 *   已经贴身就交回普通次序，不站着挨打。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：速度等级已经写进公共能力阶梯、地面留下磨亮的圈；光面还在时不再重复打磨，等它失亮后才重新考虑。
 */
namespace PokemonSkills {
    function rockPolishThreatGap(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    CompanionBehavior.registerUse("rockpolish", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "polished")) return false;
            const gap = rockPolishThreatGap(context);
            if (gap < 0) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = rockPolishThreatGap(context);
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 4) ? 0 : 110;
        }
    });

    addPreferences("rockpolish", {}, [
        field(pathOf("ai.maxChase"), "打磨距离", "number", {
            min: 3, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑打磨；越大越早准备。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 10, step: 1,
            help: "威胁近于这个距离时不再打磨、直接应对；调大更常在近身时放弃提速。"
        })
    ]);
}
