/**
 * 宇宙力量 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内、但还没贴身（大于 ai.minGap）时先站定汲取星光；身边暂时安全时
 *   （驻守／自主／工作）也先垫好两项防护。它是本组起手最长的一招，所以最值得在对手贴近前先摆好。
 * 什么时候最想出手：血量掉到 ai.panic 以下、或对手在 minGap 之外且**天色已暗**（星光更盛、多抬 1 级）时
 *   priority 108 越过共享次序；只是有威胁时退回 96，抢在共享交战次序前但不如防守型招紧急。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：两项等级已写进公共能力阶梯；星辉窗口内不再重复，窗口走完才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("cosmicpower", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "cosmicpower")) return false;
            if (!threat) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 3)) return 0;
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.6);
            const dark = (context.facts.sunlight || 0) < 0.25;
            if (CompanionBehavior.ratio(self) < panic || dark) return 108;
            return 96;
        }
    });

    addPreferences("cosmicpower", {}, [
        field(pathOf("ai.maxChase"), "汲力距离", "number", {
            min: 4, max: 28, step: 1,
            help: "威胁进入这个距离内才考虑先站定汲取星光；越大越早开始摆好防护。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再汲取、直接交战；调大更常在近身时放弃强化。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前汲取星光；调高更早进入防守姿态，调低只在濒危时才站定。"
        })
    ]);
}
