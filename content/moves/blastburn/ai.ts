/**
 * 爆炸烈焰的 AI 用途。
 *
 * 什么局面下出手：目标点附近挤着至少 `ai.minTargets` 个可见敌人才值得消耗这一记大爆炸；
 * 自身生命高于 `ai.minHealth`（或这一爆能直接清场）才出手，因为爆发后有过热力竭。
 * 对谁出手：焦点目标优先，其余是可接近、活着、非友方的目标；聚得越密越值得，但评分连续变化，不因数字大就锁死最高分。
 * 怎么够到：共享接近把身位收到射程以内（`kind: point`，以目标位置为落点）。
 * 出手前后：放完交回共享交战计划；力竭期间招式自动不可用。
 */
namespace PokemonSkills {
    function blastburnCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const radius = Number(capability.data.config && capability.data.config.spread || 2.6) + 1.0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("blastburn", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return false;
            const minTargets = CompanionBehavior.ai<number>(capability, "minTargets", 1);
            if (blastburnCluster(context, capability, target) < minTargets) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.35);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth || blastburnCluster(context, capability, target) >= 3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const cluster = blastburnCluster(context, capability, target);
            // 连续评分：每多罩住一个近敌加一档，但不再跨过阈值就固定同一个最高分。
            let score = 6 + Math.min(4, cluster) * 10;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 6;
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.5) score -= 8;
            return Math.max(0, score);
        }
    });

    addPreferences("blastburn", {}, [
        field(pathOf("spread"), "爆散范围", "number", {
            min: 1.6, max: 3.6, step: 0.5,
            help: "落点火焰铺开的半径。调大能同时覆盖更多对手，但每个目标分到的伤害下降、过热力竭更久；调小则爆发集中、恢复更快，但只烧得到落点附近。"
        }),
        field(pathOf("ai.minTargets"), "最少目标数", "number", {
            min: 1, max: 4, step: 1,
            help: "落点附近至少有多少个敌人才主动引爆。调高更惜用大爆炸、专等对手聚堆，调成 1 则对单个目标也照炸。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动引爆（除非能一次罩住三个以上目标）。越高越怕留下过热空档。"
        })
    ]);
}
