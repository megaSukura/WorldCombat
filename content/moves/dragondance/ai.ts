/**
 * 龙之舞 / dragondance 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内时，先盘旋一圈再打。
 * 什么时候最想出手：差距还在 ai.minGap 之外时 priority 100 越过共享交战次序；生命低于一半时抬到 110——
 *   龙之舞先给速度，被压制时正是最需要那一段位移的时候。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：攻速各 +1、身上挂着龙势窗口；窗口还在时不再重复起舞，交回共享交战计划。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("dragondance", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "dragondance")) return false;
            if (!threat) return false;
            const distance = CompanionBehavior.distance(self.point, threat.point);
            return distance >= CompanionBehavior.ai<number>(capability, "minGap", 3)
                && distance <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 3)) return 0;
            return CompanionBehavior.ratio(self) < 0.5 ? 110 : 100;
        }
    });

    addPreferences("dragondance", {}, [
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑先盘旋；越大越早开始叠攻速。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再起舞、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
