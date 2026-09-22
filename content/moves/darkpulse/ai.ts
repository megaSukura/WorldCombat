/**
 * 恶之波动 / darkpulse 的伙伴 AI 用途。
 *
 * 什么局面下出手：中距离的一团恶意气场，目标可见、敌对、存活且在 `ai.maxChase`（默认 14）格内。
 * 它是范围招：`ai.cluster` 打开时，目标身边 3.5 格内还挤着别的敌人就抬高 priority，一次罩住一片。
 * 对谁出手：以候选敌人所在位置为落点；`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再出手。
 * 放完接什么：交回共享交战计划；它是一记中距离的点射，不负责收尾。
 */
namespace PokemonSkills {
    function darkpulseWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 14);
    }

    function darkpulseCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("darkpulse", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return darkpulseWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !darkpulseWants(context, capability, target)) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return 20;
            return darkpulseCluster(context, target) >= 2 ? 36 : 20;
        }
    });

    addPreferences("darkpulse", {}, [
        field(pathOf("creep"), "弥漫气场", "boolean", {
            help: "开启：气场飞得更慢、落点更大更久、畏缩更易，但威力约少 15%%、冷却更长，适合罩一片。关闭：更快更小更重，适合点射落单的目标。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动推气场，先走近。越大越愿意在更远处先手，目标也越有时间在气场抵达前走开。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还站着别的敌人时优先推气场，一次罩住一片；关闭则只按普通远程攻击排序。"
        })
    ]);
}
