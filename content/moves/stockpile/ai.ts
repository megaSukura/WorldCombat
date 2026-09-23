/**
 * 蓄力 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内、且有交战需求时，先连蓄几层再压上去。
 * 什么时候最想出手：层数还没到 ai.hoardTo（默认 2）且威胁还在 ai.minGap 之外时 priority 106，抢在共享交战次序前
 *   连压几口；已经攒够就退回普通次序先交战，只在空隙里补到 3 层；贴身（小于 minGap）时让位给普通攻击。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。蓄满 3 层后本招会被拒绝（full-charge），不再尝试。
 * 放完之后：每层写进公共能力阶梯与光壳窗口；层数被对手打掉后回到上面的判断，重新想补。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_stockpile/layers", function (access, actor, _argument) {
        return stockpileLayers(access, actor);
    });

    CompanionBehavior.registerUse("stockpile", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if ((CompanionBehavior.fact<number>(context, "world_combat:move_stockpile/layers", self) || 0) >= stockpileMaxLayers) return false;
            if (!threat) return false;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            const layers = CompanionBehavior.fact<number>(context, "world_combat:move_stockpile/layers", self) || 0;
            if (layers < CompanionBehavior.ai<number>(capability, "hoardTo", 2)) return 106;
            return 40;
        }
    });

    addPreferences("stockpile", {}, [
        field(pathOf("ai.maxChase"), "蓄力距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑继续蓄力；越大越早开始铺层，也越早把层数带进交战。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再蓄力、直接交战；调大更常在近身时放弃补层。"
        }),
        field(pathOf("ai.hoardTo"), "蓄到几层", "number", {
            min: 1, max: 3, step: 1,
            help: "打算攒到几层再压上去；调高更贪、更晚接战，调低更早带着薄壳应战。"
        })
    ]);
}
