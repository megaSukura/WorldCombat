/**
 * 生长 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：附近有威胁、还在 ai.maxChase 以内时，先长一轮再打；没有威胁时只在整备命令
 *   （驻守／自主／工作）下做。
 * 什么时候最想出手：站在阳光下（context.facts.sunlight ≥ 0.6）时 priority 抬到 90 抢在共享顺序前——
 *   阳光让双攻各多长一级，值得先占这个窗口；阴影里就退回普通次序。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：双攻抬起（阳光下更高），伙伴交回共享交战计划。
 */
namespace CompanionBehavior {
    function growthThreat(context: WorldBehavior.Context): Entity | null {
        return context.senses["world_combat:threat"] as Entity | null;
    }
    function growthSunlit(context: WorldBehavior.Context): boolean {
        const value = context.facts.sunlight;
        return typeof value === "number" && value >= 0.6;
    }

    registerUse("growth", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const threat = growthThreat(context);
            if (!threat) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return distance(source(context).point, threat.point) <= ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, capability, _target) {
            const threat = growthThreat(context);
            if (!threat) return 0;
            if (growthSunlit(context)) return ai<boolean>(capability, "waitForSun", true) ? 90 : 50;
            return ai<boolean>(capability, "shadeGrowth", false) ? 0 : 45;
        }
    });

    const growthChase = PokemonSkills.number("ai.maxChase", "生长距离", 3, 26, 1);
    growthChase.help = "威胁进入这个距离内才考虑先长一轮；越大越早准备。";
    const growthSun = PokemonSkills.flag("ai.waitForSun", "阳光优先");
    growthSun.help = "开启：站在阳光下时长一轮越过分派顺序抢先出手（双攻各多长一级）；关闭：只看距离，不特意等阳光。";
    const growthShade = PokemonSkills.flag("ai.shadeGrowth", "阴影里不长");
    growthShade.help = "开启：不在阳光下就不生长，把这一轮留到有阳光时；关闭：阴影里也照常长（每项少一级）。";

    PokemonSkills.addPreferences("growth", { ai: { maxChase: 12, waitForSun: true, shadeGrowth: false } },
        [growthChase, growthSun, growthShade]);
}
