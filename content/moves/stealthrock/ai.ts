/**
 * 隐形岩 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、在 `ai.maxChase`（默认 11）以内的威胁时抬石；`ai.minFoes`（默认 2）
 *   让威胁身边至少挤着这么多敌人才值得先把石阵抬起来（多 +18 优先级）；目标越是满血越值得先布（+6）。
 * 对谁出手：当前威胁；它的位置就是石阵中心。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把石阵抬到目标所在位置。
 * 放完之后：石阵留在空中继续砸人，伙伴交回共享交战顺序；同一片地上重放会刷新石阵。
 * 配置 heavy（沉岩／浮岩）改变砸伤、范围与能否砸到空中目标；ai.maxChase、ai.minFoes 决定追多远、什么时候先布。
 */
namespace PokemonSkills {
    function stealthrockWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    function stealthrockCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(stealthrockId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return stealthrockWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !stealthrockWants(context, capability, target)) return 0;
            let base = 26;
            if (stealthrockCluster(context, target) >= CompanionBehavior.ai<number>(capability, "minFoes", 2)) base += 18;
            if (CompanionBehavior.ratio(target) > 0.8) base += 6;
            return base;
        }
    });

    const stealthrockAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    stealthrockAiChase.help = "威胁离自己这么远以内才考虑抬石；调小只在近处布，调大愿意先把石阵抬在远处的路上。";
    const stealthrockAiFoes = number("ai.minFoes", "成群时优先", 1, 4, 1);
    stealthrockAiFoes.help = "威胁身边至少挤着这么多敌人才优先抬石；调 1 表示看见就布。";

    addPreferences(stealthrockId, { ai: { maxChase: 11, minFoes: 2 } }, [stealthrockAiChase, stealthrockAiFoes]);
}
