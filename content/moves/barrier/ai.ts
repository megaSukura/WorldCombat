/**
 * 屏障 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、自己还没被壁罩住，且它在 ai.maxChase 以内时立墙。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时 priority 100 抢在共享交战次序前——趁对手还没贴上脸，先把墙立起来；
 *   已经贴身就退回普通次序，贴身立墙挡不住也堵自己。
 * 对谁出手：自己；墙自动朝着最近的非友方活体的方向立起，不需要选中谁。
 * 放完之后：板立着时防御等级已在公共能力阶梯；屏障还在时不再重复，板崩后才重新考虑。
 * 配置 tall（高屏／壁垒）改变墙的高矮、宽窄与远近；ai.maxChase、ai.minGap 决定追多远、什么时候立墙。
 */
namespace PokemonSkills {
    function barrierThreatGap(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    CompanionBehavior.registerUse("barrier", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "barrier")) return false;
            const gap = barrierThreatGap(context);
            if (gap < 0) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = barrierThreatGap(context);
            return gap > CompanionBehavior.ai<number>(capability, "minGap", 3) ? 100 : 44;
        }
    });

    addPreferences("barrier", {}, [
        field(pathOf("ai.maxChase"), "立墙距离", "number", {
            min: 3, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑立墙；越大越早准备，越小只挡已经逼近的对手。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 12, step: 1,
            help: "威胁近于这个距离时不再立墙、直接应对；调大更常在近身时放弃立墙（贴脸立墙挡不住也堵自己）。"
        })
    ]);
}
