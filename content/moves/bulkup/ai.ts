/**
 * 健美 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内、但还没贴身（大于 ai.minGap）时先涨一轮再压上去——
 *   健美是抬攻击的，最值得在开打前铺好。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时 priority 105——抢在共享交战次序前先把双攻垫起来；
 *   已经贴身（小于 minGap）就让位给普通攻击，不为强化站着挨打。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：两项等级已写进公共能力阶梯；涨身窗口内不再重复，窗口走完才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("bulkup", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "bulkup")) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 3) ? 0 : 105;
        }
    });

    addPreferences("bulkup", {}, [
        field(pathOf("ai.maxChase"), "练身距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑先涨一轮；越大越早开始。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再健美、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
