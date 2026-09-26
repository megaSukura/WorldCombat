/**
 * 撒菱 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、在 `ai.maxChase`（默认 10）以内的威胁时布刺。
 * 封路优于蹲点：`ai.lead`（默认 8）对移动中的威胁提前落点，把尖刺撒在它要经过的路线上，而不是等它
 *   站定时铺在脚下；移动越快的威胁给越高的优先级（`ai.cutoff` 默认 1 时生效），静止的重型目标只当普通布防。
 * 对谁出手：当前威胁；落点是它的位置加上速度 × 提前量。推拉队友把敌人撞进刺地是玩家的操作，刺地本身不绕过位移抗性。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把碎片撒向目标所在位置（或提前量后的位置）。
 * 放完之后：刺留在原地继续扎人，伙伴交回共享交战顺序；同一片地上再撒会叠层，所以它会持续复用这招。
 * 配置 dense（密布／撒布）改变覆盖与每层伤害；ai.maxChase、ai.lead、ai.cutoff 决定追多远、提前多少、是否专挑移动目标。
 */
namespace PokemonSkills {
    function spikesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    function spikesSpeed(target: CompanionBehavior.Entity): number {
        const velocity = target.velocity;
        if (!velocity) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    }

    CompanionBehavior.registerUse(spikesId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return spikesWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        target: function (context, capability, selected) {
            const lead = CompanionBehavior.ai<number>(capability, "lead", 8), velocity = selected.velocity;
            if (lead <= 0 || !velocity) return selected;
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = [selected.point[0] + velocity[0] * lead, selected.point[1], selected.point[2] + velocity[2] * lead];
            return copy;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !spikesWants(context, capability, target)) return 0;
            const base = 24;
            const cutoff = CompanionBehavior.ai<number>(capability, "cutoff", 1) > 0;
            return cutoff && spikesSpeed(target) > 0.02 ? base + 14 : base;
        }
    });

    const spikesAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    spikesAiChase.help = "威胁离自己这么远以内才考虑撒刺；调小只在近处撒，调大愿意先把刺撒在远处的路上。";
    const spikesAiLead = number("ai.lead", "提前量", 0, 20, 1);
    spikesAiLead.help = "对移动中的威胁提前这么多刻落点，封住它要走的路；0 表示直接撒在它当前位置，调大更适合拦冲过来的对手。";
    const spikesAiCutoff = number("ai.cutoff", "优先封路", 0, 1, 1);
    spikesAiCutoff.help = "1 = 优先对正在移动的威胁封路（给更高优先级）；0 = 静止和移动的目标一视同仁，只当普通布防。";

    addPreferences(spikesId, { ai: { maxChase: 10, lead: 8, cutoff: 1 } }, [spikesAiChase, spikesAiLead, spikesAiCutoff]);
}
