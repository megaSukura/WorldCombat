/**
 * 捕兽夹 / snaptrap 的伙伴 AI 用途。
 *
 * 什么局面下出手：一件布在场上的限制物。`available` 要求目标可见、敌对、存活、在 `ai.maxChase`
 * （默认 11）以内，且身上还没有被夹住（`partiallytrapped`）。`ai.preferMovers` 打开时更愿意埋在正在移动或
 * 逃跑的威胁（用 `ai.lead` 提前量埋在前面）——这是排序倾向，不是硬门槛：站着不动的目标在没有更好选择时
 * 仍会被埋。已经在该点附近埋过夹子时降档，避免同处反复叠夹。
 * 对谁出手：当前威胁；冲过来、正在逃跑的最优先，焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑；kind 为 point，AI 会把夹子抛向目标（或提前量）所在的位置。
 * 放完之后：夹子留在原地等人踩，伙伴交回共享顺序继续交战。
 */
namespace PokemonSkills {
    function snaptrapMoving(target: CompanionBehavior.Entity): boolean {
        if (!target.velocity) return false;
        return Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) > 0.05;
    }

    /** 该点附近已经埋着一只夹子：别再往同一处叠，换个位置或先用手上的招。 */
    function snaptrapArmedNear(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const views = world.effectsOfType("world_combat:snaptrap_armed");
        for (let i = 0; i < views.length; i++) {
            try {
                const state = JSON.parse(String(views[i].data())), point = state.point;
                const dx = point[0] - target.point[0], dz = point[2] - target.point[2];
                if (dx * dx + dz * dz <= 9) return true;
            } catch (error) { }
        }
        return false;
    }

    function snaptrapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "partiallytrapped")) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    CompanionBehavior.registerUse("snaptrap", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return snaptrapWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        /** 给移动中的目标一点提前量：把夹子埋在它要经过的位置，等它自己踩进来。 */
        target: function (context, capability, selected) {
            const lead = CompanionBehavior.ai<number>(capability, "lead", 8), velocity = selected.velocity;
            if (lead <= 0 || !velocity) return selected;
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = [selected.point[0] + velocity[0] * lead, selected.point[1], selected.point[2] + velocity[2] * lead];
            return copy;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !snaptrapWants(context, capability, target)) return 0;
            let base = 20;
            const mover = snaptrapMoving(target) || CompanionBehavior.fleeing(context, target);
            if (snaptrapMoving(target)) base += 12;
            if (CompanionBehavior.fleeing(context, target)) base += 20;
            if (CompanionBehavior.ai<boolean>(capability, "preferMovers", false) && !mover) base -= 12;
            if (context.facts.focus === target.ref) base += 16;
            if (snaptrapArmedNear(context, target)) base -= 16;
            return Math.max(0, base);
        }
    });

    addPreferences("snaptrap", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 20, step: 1,
            help: "威胁离自己这么远以内才考虑埋夹；调小只在近处埋，调大愿意先把夹子埋到远处的路上。"
        }),
        field(pathOf("ai.lead"), "提前量", "number", {
            min: 0, max: 24, step: 1,
            help: "对移动目标提前这么多刻埋夹；0 表示埋在目标当前位置，调大更适合拦冲过来的对手。"
        }),
        field(pathOf("ai.preferMovers"), "偏向移动目标", "boolean", {
            help: "开启：更愿意把夹子埋在正在移动或逃跑的威胁前面，站着不动的目标排到后面；关闭：对所有范围内的威胁一视同仁。它是排序倾向，不会让站着不动的目标完全不被埋。"
        })
    ]);
}
