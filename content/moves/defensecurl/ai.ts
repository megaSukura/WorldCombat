/**
 * 变圆 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且在 ai.maxChase 内时先卷成球，靠滚劲换身位、扛贴身。
 * 什么时候最想出手：威胁贴到 ai.close 以内（马上要挨打）或血量掉到 ai.panic 以下时 priority 100，
 *   抢在共享次序前；只是有威胁时退回 50。它是本族里最便宜的防守起手。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：防御等级已写进公共能力阶梯，卷球窗口内不再重复；窗口走完才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("defensecurl", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "defensecurl")) return false;
            if (!threat) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, threat.point);
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.6);
            if (CompanionBehavior.ratio(self) < panic || gap <= CompanionBehavior.ai<number>(capability, "close", 3)) return 100;
            return 50;
        }
    });

    addPreferences("defensecurl", {}, [
        field(pathOf("ai.maxChase"), "卷球距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑卷成球；越大越早准备。"
        }),
        field(pathOf("ai.close"), "贴身距离", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁贴到这么近时优先卷成球（马上要挨打了）；越大越早抢在挨打前卷。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前卷成球；调高更早进入防守姿态，调低只在濒危时才卷。"
        })
    ]);
}
