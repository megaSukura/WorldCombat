/**
 * 自我激励 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：存在交战需求、威胁在 ai.maxChase 以内时，先给自己鼓一口气再打。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 什么时候最想出手：生命低于 ai.eagerBelow 时 priority 抬到 100，越过分派顺序抢先鼓劲——背水时还能多涨一级。
 * 放完之后：双攻各抬一级（受伤时更高的一侧再多一级），伙伴交回共享交战计划。
 */
namespace CompanionBehavior {
    function workupThreat(context: WorldBehavior.Context): Entity | null {
        return context.senses["world_combat:threat"] as Entity | null;
    }

    registerUse("workup", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (["atk", "spa"].every(function (stat) { return CompanionBehavior.stage(context, CompanionBehavior.source(context), stat) >= 6; })) return false;
            const threat = workupThreat(context);
            if (!threat) return false;
            return distance(source(context).point, threat.point) <= ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, capability, _target) {
            if (!workupThreat(context)) return 0;
            return ratio(source(context)) < ai<number>(capability, "eagerBelow", 0.5) ? 100 : 55;
        }
    });

    const workupChase = PokemonSkills.number("ai.maxChase", "鼓劲距离", 3, 24, 1);
    workupChase.help = "威胁进入这个距离内才考虑先鼓一口气；越大越早准备，也越可能在接近途中被追上。";
    const workupEager = PokemonSkills.number("ai.eagerBelow", "背水血量", 0.2, 0.9, 0.05);
    workupEager.help = "生命低于这个比例时，自我激励越过分派顺序抢先出手（背水时更强的一侧多涨一级）；调高更常抢，调低更沉着。";

    PokemonSkills.addPreferences("workup", { ai: { maxChase: 12, eagerBelow: 0.5 } }, [workupChase, workupEager]);
}
