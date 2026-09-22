/**
 * 变硬 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且进入 ai.maxChase 时先结晶，把接下来每一击都磨钝；身边暂时安全时
 *   （驻守／自主／工作）也先备上。
 * 什么时候最想出手：血量掉到 ai.panic 以下时 priority 95，抢在共享次序前把壳支起来（怕这一点没挨住）；
 *   一般有威胁时 55，属于常规防守起手。它便宜、好补，所以不会像大防守那样只在濒危才用。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：防御等级已写进公共能力阶梯，晶壳窗口内不再重复；壳被打裂或到期后才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("harden", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "harden")) return false;
            if (!threat) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.55);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) < panic ? 95 : 55;
        }
    });

    addPreferences("harden", {}, [
        field(pathOf("ai.maxChase"), "结晶距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑结晶；越大越早准备。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前结晶；调高更早进入硬化姿态，调低只在濒危时才硬。"
        })
    ]);
}
