/**
 * 洁净光芒 / lusterpurge —— AI 用途。
 *
 * 出手局面：一个以自身为中心、向外扩张的光圈。`available` 要求目标可见、敌对、存活且落在 `ai.maxChase`
 *   （默认 7）格内——这是全族最短的射程，出手前要先贴近。
 * 对谁出手：`ai.cluster`（默认开）打开时，自己身边还围着别的敌人就抬高 priority——那正是这一圈最值的时候。
 * 够不到怎么办：`approachTarget` 让伙伴朝目标走到光圈射程内再放；`approach` 用共享接近。
 * 放完接什么：交回共享交战计划；它是一发贴身爆发，不负责收尾。
 */
namespace PokemonSkills {
    function lusterpurgeCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context).point, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const radius = typeof capability.data.range === "number" ? capability.data.range : 5;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            if (CompanionBehavior.distance(other.point, self) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("lusterpurge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 20 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return lusterpurgeCluster(context, capability) >= 2 ? base + 14 : base;
        }
    });

    addPreferences("lusterpurge", {}, [
        field(pathOf("focus"), "聚光形态", "boolean", {
            help: "开启：半径 ×0.78、威力 ×1.18、碾防概率 +0.06、起手 +2 刻、冷却 +4 刻，适合单挑。关闭：光芒按默认半径摊得更开、威力与概率按基础值，适合被围住时一次罩住一圈。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动靠近，先在光圈射程外待命；越大越愿意先朝目标接近再放。"
        }),
        field(pathOf("ai.cluster"), "被围时优先", "boolean", {
            help: "开启后，自己身边还有别的敌人时优先放光圈，一次罩住一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
