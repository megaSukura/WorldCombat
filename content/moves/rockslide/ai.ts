/**
 * 岩崩 / rockslide 的伙伴 AI 用途。
 *
 * 什么局面下出手：中近距离的一把岩石雨，对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内。
 * 它是覆盖招：`ai.cluster` 打开时，目标身边 3.5 格内还挤着别的敌人就抬高 priority（一次罩住一片）；
 * 单挑时只当普通远程攻击。够不到交给共享接近逻辑。
 * 对谁出手：以候选敌人所在位置为落点；`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 */
namespace PokemonSkills {
    function rockslideWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    function rockslideCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("rockslide", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return rockslideWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !rockslideWants(context, capability, target)) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return 18;
            return rockslideCluster(context, target) >= 2 ? 34 : 18;
        }
    });

    addPreferences("rockslide", {}, [
        field(pathOf("scatter"), "散布式", "boolean", {
            help: "开启：岩石更多、覆盖更广，但每块更轻、畏缩略降，用来扫一片。关闭：石头更少更集中，每块更重、畏缩更高。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动撒石，先走近。越大越会在远处先手，目标也越有时间在石雨落下前走开。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还站着别的敌人时优先撒石，一次罩住一片；关闭则只按普通攻击排序。"
        })
    ]);
}
