/**
 * 毒菱 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、在 `ai.maxChase`（默认 10）以内、身上还没有剧毒的威胁时布毒菱。
 *   已有普通毒的目标仍值得再撒一层把它升级成剧毒（给更高优先级）；已经剧毒的目标不再浪费。
 *   敌方毒属性的身体会把整片毒菱吸掉，对它布毒菱价值很低（降优先级），但它走进已有毒菱能帮玩家清场。
 * `ai.lead` 给移动中的目标一点提前量，把毒菱撒在它要经过的位置。
 * 对谁出手：当前威胁；它的位置（或提前量）就是落点。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把毒菱撒向目标所在位置。
 * 放完之后：毒菱留在原地继续上毒，伙伴交回共享交战顺序；第二层会把 1 层的中毒升级成剧毒。
 * 配置 virulent（烈毒／缓和）改变毒性与覆盖；ai.maxChase、ai.lead 决定追多远、留多少提前量。
 */
namespace PokemonSkills {
    function toxicspikesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "toxic")) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    function toxicspikesPoisonType(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("poison") >= 0;
    }

    CompanionBehavior.registerUse(toxicspikesId, {
        protocols: ["world_combat:attack", "world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return toxicspikesWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "toxic");
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
            if (!target || !toxicspikesWants(context, capability, target)) return 0;
            let score = 20;
            // 已有普通毒：再撒一层就能升级成剧毒，值得优先。
            if (CompanionBehavior.status(context, target, "poison")) score += 10;
            // 毒属性会把整片毒菱吸掉，对它布毒菱价值低。
            if (toxicspikesPoisonType(context, target)) score -= 12;
            return Math.max(1, score);
        }
    });

    const toxicspikesAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    toxicspikesAiChase.help = "威胁离自己这么远以内才考虑撒毒菱；调小只在近处撒，调大愿意先把毒菱撒在远处的路上。";
    const toxicspikesAiLead = number("ai.lead", "提前量", 0, 20, 1);
    toxicspikesAiLead.help = "对移动中的目标提前这么多刻落点；0 表示直接撒在目标当前位置，调大更适合拦冲过来的对手。";

    addPreferences(toxicspikesId, { ai: { maxChase: 10, lead: 6 } }, [toxicspikesAiChase, toxicspikesAiLead]);
}
