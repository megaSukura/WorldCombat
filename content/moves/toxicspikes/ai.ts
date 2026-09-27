/**
 * 毒菱 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、贴地、在 `ai.maxChase`（默认 10）以内、身上还没有剧毒的威胁时布毒菱。
 *   空中路径的生物不会踩到毒菱，不布；毒属性会把整片毒菱吸掉，不布；钢属性免疫中毒，也不布。
 *   已有普通毒的目标只有在脚下能接上第二层（附近已有自己同层地的毒菱）时才值得再撒——否则仍是 1 层，不会升级。
 * `ai.lead` 给移动中的目标一点提前量，把毒菱撒在它要经过的位置。
 * 对谁出手：当前威胁；它的位置（或提前量）就是落点。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把毒菱撒向目标所在位置。
 * 放完之后：毒菱留在原地继续上毒，伙伴交回共享交战顺序；第二层会把 1 层的中毒升级成剧毒。
 * 配置 virulent（烈毒／缓和）改变毒性与覆盖；ai.maxChase、ai.lead 决定追多远、留多少提前量。
 */
namespace PokemonSkills {
    /** 当前有效类型（含临时类型变更），普通 MC 生物与模组生物同样适用，不再只读宝可梦个体。 */
    function toxicspikesTypes(context: WorldBehavior.Context, target: CompanionBehavior.Entity): string[] {
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
        if (actor === null) return [];
        try { return PokemonDamage.combatants.read(world, actor).types || []; } catch (error) { return []; }
    }

    /** 目标脚下附近是否已有自己在同层地布下的毒菱：只有能接上第二层，给已中毒目标补一层才有意义。 */
    function toxicspikesCanStack(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const own = String(self.ref), areas = WorldEffects.areas(world, toxicspikesRule), targetPoint = CompanionBehavior.point(target.point);
        for (let i = 0; i < areas.length; i++) {
            const area = areas[i];
            if (area.pending || area.source !== own || (area.data && area.data.absorbed)) continue;
            if (Math.abs(area.position[1] - target.point[1]) > 2.0) continue;
            const centre = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            if (centre.minus(targetPoint).length() <= area.radius + 4) return true;
        }
        return false;
    }

    function toxicspikesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        // 空中路径不会踩上毒菱。
        if (target.grounded === false) return false;
        if (CompanionBehavior.status(context, target, "toxic")) return false;
        const types = toxicspikesTypes(context, target);
        // 毒属性会把整片毒菱吸掉、钢属性免疫中毒，对它们布菱是白费。
        if (types.indexOf("poison") >= 0 || types.indexOf("steel") >= 0) return false;
        // 已有普通毒但这一趟只能算 1 层：不会升级成剧毒，拒绝主动送场。
        if (CompanionBehavior.status(context, target, "poison") && !toxicspikesCanStack(context, target)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 10);
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
            if (target.friendly || target.health <= 0 || !target.visible || target.grounded === false) return false;
            if (CompanionBehavior.status(context, target, "toxic")) return false;
            const types = toxicspikesTypes(context, target);
            return types.indexOf("poison") < 0 && types.indexOf("steel") < 0;
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
            // 已有普通毒：能接上第二层就升级成剧毒，值得优先。
            if (CompanionBehavior.status(context, target, "poison")) score += 10;
            return Math.max(1, score);
        }
    });

    const toxicspikesAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    toxicspikesAiChase.help = "威胁离自己这么远以内才考虑撒毒菱；调小只在近处撒，调大愿意先把毒菱撒在远处的路上。";
    const toxicspikesAiLead = number("ai.lead", "提前量", 0, 20, 1);
    toxicspikesAiLead.help = "对移动中的目标提前这么多刻落点；0 表示直接撒在目标当前位置，调大更适合拦冲过来的对手。";

    addPreferences(toxicspikesId, { ai: { maxChase: 10, lead: 6 } }, [toxicspikesAiChase, toxicspikesAiLead]);
}
