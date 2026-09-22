/**
 * 铁壁 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且在 ai.maxChase 内时，先站成铁像再扛；身边暂时安全时（驻守／自主／工作）也先浇上。
 * 什么时候最想出手：血量掉到 ai.panic 以下（正在挨压）时 priority 110 抢在共享次序前——防招要在被打崩之前站住；
 *   血量还行就退回普通次序，先输出。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：防御等级已写进公共能力阶梯，铁壳还带击退抗性与减速；铁壳还在时不再重复，被磨掉后才重新考虑。
 */
namespace PokemonSkills {
    function ironDefenseThreatGap(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    CompanionBehavior.registerUse("irondefense", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "irondefense")) return false;
            const gap = ironDefenseThreatGap(context);
            if (gap < 0) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.55);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) < panic ? 110 : 45;
        }
    });

    addPreferences("irondefense", {}, [
        field(pathOf("ai.maxChase"), "浇铸距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑浇成铁壁；越大越早准备。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前站成铁像；调高更早进入防守姿态，调低只在濒危时才浇。"
        })
    ]);
}
