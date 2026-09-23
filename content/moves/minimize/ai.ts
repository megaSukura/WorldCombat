/**
 * 变小 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个在 ai.maxChase 内的威胁时最值得缩起来——缩小是纯自保，躲开来袭。
 * 什么时候最想出手：威胁已经进到 ai.minGap 之外、但不很远（≤ ai.maxChase × 0.75）时 priority 104——
 *   越早缩，越可能在对方出手前就变小；威胁还很远时 96；已经贴身时 0，让位给反击。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：闪避等级与缩小窗口已挂上；窗口内不再重复，窗口走完才重新考虑。
 * 配置 bold 决定缩多大胆（闪避更高、破绽更大）；ai.maxChase 决定威胁多近开始缩。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("minimize", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "minimize")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context), gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14) * 0.75 ? 104 : 96;
        }
    });

    addPreferences("minimize", {}, [
        field(pathOf("ai.maxChase"), "收缩距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑缩小；越大越早缩起来。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再缩小、直接应对；调大更常在近身时放弃缩小。"
        })
    ]);
}
