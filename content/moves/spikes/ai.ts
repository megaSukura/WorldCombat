/**
 * 撒菱 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、在 `ai.maxChase`（默认 10）以内的威胁时布刺；`ai.minFoes`（默认 2）
 *   让威胁身边至少挤着这么多敌人才值得先把刺撒下去（多 +20 优先级），否则排在普通攻击里当常规输出。
 * 对谁出手：当前威胁；它的位置就是落点。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把碎片撒向目标所在位置（或提前量）。
 * 放完之后：刺留在原地继续扎人，伙伴交回共享交战顺序；同一片地上再撒会叠层，所以它会持续复用这招。
 * 配置 dense（密布／撒布）改变覆盖与每层伤害；ai.maxChase、ai.minFoes 决定追多远、什么时候值得先撒。
 */
namespace PokemonSkills {
    function spikesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    function spikesCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
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
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !spikesWants(context, capability, target)) return 0;
            const base = 24;
            return spikesCluster(context, target) >= CompanionBehavior.ai<number>(capability, "minFoes", 2) ? base + 20 : base;
        }
    });

    const spikesAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    spikesAiChase.help = "威胁离自己这么远以内才考虑撒刺；调小只在近处撒，调大愿意先把刺撒在远处的路上。";
    const spikesAiFoes = number("ai.minFoes", "成群时优先", 1, 4, 1);
    spikesAiFoes.help = "威胁身边至少挤着这么多敌人才优先撒刺；调 1 表示看见就撒。";

    addPreferences(spikesId, { ai: { maxChase: 10, minFoes: 2 } }, [spikesAiChase, spikesAiFoes]);
}
