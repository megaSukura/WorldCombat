/**
 * 缩入壳中 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内、血量已经吃紧时，缩进壳里让壳替自己挡几下——
 *   它会把施法者钉住，所以只在值得停下来硬吃的时候用；身边暂时安全时不空放。
 * 什么时候最想出手：血量掉到 ai.panic 以下时 priority 115，抢在所有行动前把壳合上；其余情况只给 20，
 *   留给共享次序里更主动的选择。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：壳按次挡伤，钉住期间不再重复；壳裂或到期后才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("withdraw", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "withdraw")) return false;
            if (!threat) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.5);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) < panic ? 115 : 20;
        }
    });

    addPreferences("withdraw", {}, [
        field(pathOf("ai.maxChase"), "缩壳距离", "number", {
            min: 2, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑缩壳；越大越早在远处就收起来。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前缩壳；调高更早进入龟缩姿态，调低只在濒危时才缩。"
        })
    ]);
}
