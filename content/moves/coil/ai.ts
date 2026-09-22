/**
 * 盘蜷 / coil 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、在 ai.maxChase（默认 16）内、但还在 ai.minGap（默认 4）之外时先盘一轮再迎上去；
 *   没有威胁时只在整备命令（驻守／自主／工作）下盘一圈。它是慢而完整的架势，所以比同族更不愿意在近身时开。
 * 什么时候最想出手：威胁还在 minGap 之外时 priority 102——抢在共享交战次序前把三项钉住；贴身就让位给普通攻击。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：攻/防/命中已写进公共能力阶梯；盘势窗口内不再重复，窗口走完才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("coil", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "coil")) return false;
            if (!threat) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 4) ? 0 : 102;
        }
    });

    addPreferences("coil", {}, [
        field(pathOf("ai.maxChase"), "盘蜷距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑先盘一圈；越大越早开始把三项垫起来。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 10, step: 1,
            help: "威胁近于这个距离时不再盘蜷、直接攻击；它比同族更保守，调小会更常在近身时冒险盘势。"
        })
    ]);
}
