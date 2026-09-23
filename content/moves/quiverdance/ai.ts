/**
 * 蝶舞 / quiverdance 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内时，先扬一层鳞幕再打。
 * 什么时候最想出手：差距还在 ai.minGap 之外时 priority 100 越过共享交战次序；特攻不低于物攻时抬到 108——
 *   以特殊攻击为主的个体最能吃满这支舞，优先替它铺好鳞幕。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：特攻、特防、速度各 +1、身上挂着鳞幕；幕还在时不再重复起舞，交回共享交战计划。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("quiverdance", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "quiverdance")) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 16)) return false;
            return gap >= CompanionBehavior.ai<number>(capability, "minGap", 2);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            const focused = (context.facts.specialAttack || 0) >= (context.facts.attack || 0);
            return focused ? 108 : 100;
        }
    });

    addPreferences("quiverdance", {}, [
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑先扬鳞；越大越早开始铺幕。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再起舞、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
