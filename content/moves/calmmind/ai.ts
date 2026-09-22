/**
 * 冥想 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内、但还没贴身（大于 ai.minGap）时先静一息再打——冥想抬特攻，
 *   最值得在开打前铺好；没有威胁时只在整备命令（驻守／自主／工作）下练一组。
 * 什么时候最想出手：差距还在 ai.minGap 之外时 priority 100 越过共享交战次序；特攻不低于物攻时抬到 108——
 *   以特殊攻击为主的个体最能吃满这份清明，优先替它铺好；已经贴身就让位给普通攻击。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：两项等级已写进公共能力阶梯；清明窗口内不再重复，窗口走完才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("calmmind", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "calmmind")) return false;
            if (!threat) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            const focused = (context.facts.specialAttack || 0) >= (context.facts.attack || 0);
            return focused ? 108 : 100;
        }
    });

    addPreferences("calmmind", {}, [
        field(pathOf("ai.maxChase"), "静心距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑先静一息；越大越早开始铺清明。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再冥想、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
