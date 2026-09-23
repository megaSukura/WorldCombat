/**
 * 萤火 / tailglow 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：威胁还隔着一段安全距离时才入定——凝神是一层会被打散的光，贴着对手起手等于白送；
 *   有交战需求时才准备凝神。
 * 什么时候最想出手：差距 ≥ ai.safeGap（默认 10）且 ≤ ai.maxChase（默认 18）时 priority 100 越过共享交战次序；
 *   生命低于一半时抬到 110——被打残之前先把特攻拉起来反打，正是最需要它的时候。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：特攻 +3、身上挂着凝神窗口；窗口还在时不再重复凝神，交回共享交战计划。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("tailglow", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "tailglow")) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            return gap >= CompanionBehavior.ai<number>(capability, "safeGap", 10)
                && gap <= CompanionBehavior.ai<number>(capability, "maxChase", 18);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "safeGap", 10)) return 0;
            return CompanionBehavior.ratio(self) < 0.5 ? 110 : 100;
        }
    });

    addPreferences("tailglow", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁不超过这个距离才考虑凝神；调大愿意隔着更远先起手。"
        }),
        field(pathOf("ai.safeGap"), "安全距离", "number", {
            min: 3, max: 24, step: 1,
            help: "威胁近于这个距离时不再凝神、交回交战；凝神的光被打散会前功尽弃，调大更保守。"
        })
    ]);
}
