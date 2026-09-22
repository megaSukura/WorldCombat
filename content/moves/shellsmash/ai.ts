/**
 * 破壳 / shellsmash 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：壳一破，防御与特防永久下降，所以伙伴只在**对手还隔着一段距离**、且自己**还扛得住**的时候
 *   先破壳，把爆发留到接下来的交手。移动中（骑乘）不破壳。
 * 什么时候最想出手：威胁在 ai.minGap（默认 4）之外、生命比例不低于 ai.minHealth（默认 0.45）时 priority 100
 *   越过共享交战次序；生命越低越不愿意（防御已经不够用）。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：攻／特攻／速度猛涨、防／特防永久下降；交回共享交战计划，趁窗口扑上去。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("shellsmash", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (!threat)
                return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "minHealth", 0.45)) return false;
            return CompanionBehavior.distance(self.point, threat.point) >= CompanionBehavior.ai<number>(capability, "minGap", 4);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "minHealth", 0.45)) return 0;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 4)) return 0;
            return 100;
        }
    });

    addPreferences("shellsmash", {}, [
        field(pathOf("ai.minGap"), "安全距离", "number", {
            min: 0, max: 12, step: 1,
            help: "威胁近于这个距离时不再破壳、直接交战；壳破了防御会永久下降，调大更保守。"
        }),
        field(pathOf("ai.minHealth"), "最低生命", "number", {
            min: 0.1, max: 1, step: 0.05,
            help: "生命低于这个比例时不再破壳；防御本就吃紧，调高更不愿意冒险。"
        })
    ]);
}
