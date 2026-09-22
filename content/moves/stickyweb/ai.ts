/**
 * 黏黏网 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、在 `ai.maxChase`（默认 11）以内、且**身上还没有被网黏住**的威胁时织网
 *   （已经黏住的目标再织一张不会更慢，先不浪费）。`ai.lead` 给移动中的目标一点提前量，把网撒在它要经过的位置。
 * 对谁出手：当前威胁；它的位置（或提前量）就是落点。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把网撒向目标所在位置。
 * 放完之后：网留在原地继续拖慢踏进去的人，伙伴交回共享交战顺序。
 * 配置 anchored（深锚／广铺）改变减速级数与覆盖；ai.maxChase、ai.lead 决定追多远、留多少提前量。
 */
namespace PokemonSkills {
    function stickywebWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "stickyweb")) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    CompanionBehavior.registerUse(stickywebId, {
        protocols: ["world_combat:attack", "world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return stickywebWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "stickyweb");
        },
        target: function (context, capability, selected) {
            const lead = CompanionBehavior.ai<number>(capability, "lead", 0), velocity = selected.velocity;
            if (lead <= 0 || !velocity) return selected;
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = [selected.point[0] + velocity[0] * lead, selected.point[1], selected.point[2] + velocity[2] * lead];
            return copy;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !stickywebWants(context, capability, target)) return 0;
            let base = 22;
            const speed = target.velocity ? Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) : 0;
            if (speed > 0.08) base += 10;
            return base;
        }
    });

    const stickywebAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    stickywebAiChase.help = "威胁离自己这么远以内才考虑织网；调小只在近处织，调大愿意先把网撒在远处的路上。";
    const stickywebAiLead = number("ai.lead", "提前量", 0, 20, 1);
    stickywebAiLead.help = "对移动中的目标提前这么多刻落点；0 表示直接撒在目标当前位置，调大更适合拦冲过来的对手。";

    addPreferences(stickywebId, { ai: { maxChase: 11, lead: 6 } }, [stickywebAiChase, stickywebAiLead]);
}
