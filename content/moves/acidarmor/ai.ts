/**
 * 溶化 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：身上有 rooted 束缚或 partiallytrapped／trapped 时立刻化开——这招就是用来滑脱的；
 *   有威胁且在 ai.maxChase 内时，先化开再扛。
 * 什么时候最想出手：被束缚时 priority 115 抢在所有行动前；血量掉到 ai.panic 以下时 110；其余情况 45，排在共用增益里。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：防御等级已写进公共能力阶梯，液态窗口内更滑（移动更快）；酸池形态还在地上留下一滩酸。
 *   液态还在时不再重复，凝回后才重新考虑。配置 slick 改变留不留酸池与液态长短。
 */
namespace PokemonSkills {
    function acidarmorThreatGap(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }
    function acidarmorBound(context: WorldBehavior.Context): boolean {
        return CompanionBehavior.bound(context, CompanionBehavior.source(context));
    }

    CompanionBehavior.registerUse("acidarmor", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "acidarmor")) return false;
            if (acidarmorBound(context)) return true;
            const gap = acidarmorThreatGap(context);
            if (gap < 0) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            if (context.facts.mounted) return 0;
            if (acidarmorBound(context)) return 115;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.6);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) < panic ? 110 : 45;
        }
    });

    addPreferences("acidarmor", {}, [
        field(pathOf("ai.maxChase"), "化开距离", "number", {
            min: 2, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑先化开；越大越早准备。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前化开；调高更早进入液态姿态，调低只在濒危时才化。"
        })
    ]);
}
