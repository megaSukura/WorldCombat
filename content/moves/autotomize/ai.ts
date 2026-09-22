/**
 * 身体轻量化 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且在 ai.maxChase 内时，先卸一轮再交战；身边暂时安全时（驻守／自主／工作）也先卸好。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时 priority 100 抢在共享次序前——趁还没贴上脸先把部件卸掉提速；
 *   已经贴身就交回普通次序。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：速度等级留在身上，轻身窗口内重力下调、身体浮起；窗口内或换招前 30 秒内不再重复卸件。
 */
namespace PokemonSkills {
    function autotomizeThreatGap(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    CompanionBehavior.registerUse("autotomize", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "lightened")) return false;
            if (CompanionBehavior.recent(context, "move", "autotomize", 600)) return false;
            const gap = autotomizeThreatGap(context);
            if (gap < 0) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = autotomizeThreatGap(context);
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 3) ? 0 : 100;
        }
    });

    addPreferences("autotomize", {}, [
        field(pathOf("ai.maxChase"), "卸件距离", "number", {
            min: 3, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑卸件；越大越早准备。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再卸件、直接应对；调大更常在近身时放弃提速。"
        })
    ]);
}
