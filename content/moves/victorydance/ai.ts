/**
 * 胜利之舞 / victorydance 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内时，先立一场凯旋再打；没有威胁时只在整备命令（驻守／自主／工作）下起舞。
 * 什么时候最想出手：差距还在 ai.minGap 之外时 priority 100 越过共享交战次序；对手生命已掉到一半以下时抬到 112——
 *   胜利在望，这时候开仪典，随后的每一次命中都会把这份凯旋延续下去。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：攻防速各 +1、头顶升起冠冕；凯旋还在时不再重复起舞，交回共享交战计划。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("victorydance", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "victorydance")) return false;
            if (!threat)
                return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 3)) return 0;
            return CompanionBehavior.ratio(threat) < 0.5 ? 112 : 100;
        }
    });

    addPreferences("victorydance", {}, [
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑开仪典；越大越早开始立冠。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再起舞、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
