/**
 * 怒火中烧 / fierywrath 的伙伴 AI 用途。
 *
 * 什么局面下出手：一圈以施法者自身为中心的气场，必须先站进人堆里。`available` 要求可见、敌对、存活且在
 * `ai.maxChase`（默认 9）格内有目标；`approachTarget` 明确让它走向那个目标，走到气场半径以内就原地炸开。
 * `ai.cluster` 打开时，自己身周（不是候选目标身边）挤着两个以上敌人就抬高一档——那正是这招最值得放的局面。
 * 计数与距离衰减都以施法者圆心为准。够不到交给共享接近逻辑；放完交回共享交战计划。
 */
namespace PokemonSkills {
    function fierywrathCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : 3;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function fierywrathWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("fierywrath", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return fierywrathWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !fierywrathWants(context, capability, target)) return 0;
            const count = fierywrathCount(context, capability);
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return 20 + Math.min(8, count * 2);
            return count >= 2 ? 38 + Math.min(12, (count - 2) * 4) : 20;
        }
    });

    addPreferences("fierywrath", {}, [
        field(pathOf("linger"), "余怒", "boolean", {
            help: "开启：爆发约少 20%%，但炸开后气场留一段时间、反复灼烧没走开的人，冷却 +10 刻。关闭：一次更重的爆发、没有持续，冷却更短。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动进入人堆，先在气场的射程外待命。越大越愿意先朝目标接近再炸开。"
        }),
        field(pathOf("ai.cluster"), "被围时优先", "boolean", {
            help: "开启后，自己身周（气场半径内）挤着多个敌人时优先炸气场，一次震住一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
