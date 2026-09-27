/**
 * 岩崩 / rockslide 的伙伴 AI 用途。
 *
 * 什么局面下出手：中近距离的一把岩石雨，对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内。
 * 它是覆盖招：`ai.cluster` 打开时，按本个体当前的真实 spread 与发射时长外推落区，落区里还有别的
 * 可达敌人就抬高 priority（一次罩住一片）；墙后不可达的不算。单挑时只当普通远程攻击。够不到交给共享接近逻辑。
 * 对谁出手：以候选敌人所在位置为落点；`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 */
namespace PokemonSkills {
    function rockslideWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    /** 目标在石雨落完那一刻的近似位置：用当刻速度按发射时长外推，让评分按落区而不是出手点算。 */
    function rockslidePredict(subject: CompanionBehavior.Entity, ticks: number): number[] {
        var v = subject.velocity;
        if (!v || v.length !== 3 || !isFinite(v[0]) || !isFinite(v[2])) return subject.point;
        return [subject.point[0] + v[0] * ticks, subject.point[1], subject.point[2] + v[2] * ticks];
    }

    /** 按本个体当前配置的真实 spread 与发射时长估算落区里可达的敌人数量；墙后不可达者不计。 */
    function rockslideCluster(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        var world = CompanionBehavior.world(context);
        var spread = Math.max(1.0, p("rockslide", "spread", world)) + 0.6;
        var boulders = Math.max(1, Math.round(p("rockslide", "boulders", world)));
        var interval = Math.max(1, Math.round(p("rockslide", "interval", world)));
        var volley = Math.min(60, interval * boulders);
        var aim = rockslidePredict(target, volley);
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || !(other.health > 0) || !other.visible) continue;
            var predicted = rockslidePredict(other, volley);
            if (CompanionBehavior.distance(predicted, aim) > spread) continue;
            // 真实遮挡：墙后那一侧不吃这把雨，群体估计也只按可达者算。
            if (!world.clear(CompanionBehavior.point(aim), CompanionBehavior.point(predicted))) continue;
            count++;
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
            return rockslideCluster(context, capability, target) >= 2 ? 34 : 18;
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
            help: "开启后，按本个体当前的真实覆盖半径与发射时长估算落区，落区里还有别的可达敌人时优先撒石，一次罩住一片；墙后不可达的不算，关闭则只按普通攻击排序。"
        })
    ]);
}
