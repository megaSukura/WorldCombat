/**
 * 高速移动 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且在 ai.maxChase 内时，先松劲再交战。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时 priority 100 抢在共享交战次序前——趁还没贴上脸先把速度拉开。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：速度等级已经写进公共能力阶梯；轻身窗口内、或换招前 30 秒内不再重复，把 PP 留给别的事。
 */
namespace PokemonSkills {
    function agilityThreatGap(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    CompanionBehavior.registerUse("agility", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (["spe"].every(function (stat) { return CompanionBehavior.stage(context, CompanionBehavior.source(context), stat) >= 6; })) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "agility")) return false;
            if (CompanionBehavior.recent(context, "move", "agility", 600)) return false;
            const gap = agilityThreatGap(context);
            if (gap < 0) return false;
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = agilityThreatGap(context);
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 3) ? 0 : 100;
        }
    });

    addPreferences("agility", {}, [
        field(pathOf("ai.maxChase"), "松劲距离", "number", {
            min: 3, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑先松劲；越大越早准备。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再松劲、直接应对；调大更常在近身时放弃提速。"
        })
    ]);
}
