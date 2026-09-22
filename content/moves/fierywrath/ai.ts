/**
 * 怒火中烧 / fierywrath 的伙伴 AI 用途。
 *
 * 什么局面下出手：一圈以自身为中心的气场，必须先站进人堆里。`available` 要求可见、敌对、存活且在
 * `ai.maxChase`（默认 9）格内有目标；`approachTarget` 明确让它走向那个目标，`reach` 是气场半径，
 * 走到够得着就原地炸开。`ai.cluster` 打开时，目标身边 3.5 格内还挤着别的敌人就抬高 priority
 * ——那正是这招最值得放的局面。够不到交给共享接近逻辑；放完交回共享交战计划。
 */
namespace PokemonSkills {
    function fierywrathWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    function fierywrathCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
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
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return 20;
            return fierywrathCluster(context, target) >= 2 ? 38 : 20;
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
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先炸气场，一次震住一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
