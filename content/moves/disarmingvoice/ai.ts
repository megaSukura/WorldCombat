/**
 * 魅惑之声 / disarmingvoice 的 AI 用途。
 *
 * 什么局面下出手：声场以自身为心，所以它看的是**自己周围**实际被罩住的人数，而不是目标身边的人。
 * 只有至少一个可见敌人在声场半径内才开口，远处敌群不会诱使它空鸣。
 * `ai.group`（默认开）：被罩住的敌人越多优先级越高，因为一句叫声能同时命中一圈。
 * 安抚形态下同样按圈内人数评估，用降攻换取交换优势。
 */
namespace PokemonSkills {
    /** 声场半径内可见的非友方数量。 */
    function disarmingvoiceCaught(context: WorldBehavior.Context, reach: number): number {
        const self = CompanionBehavior.source(context).point;
        let count = 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self, other.point) <= reach) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("disarmingvoice", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            return disarmingvoiceCaught(context, capability.data.range) > 0;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            var caught = disarmingvoiceCaught(context, capability.data.range);
            if (caught <= 0) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "group", true)) return 20;
            return 20 + Math.max(0, caught - 1) * 12;
        }
    });

    addPreferences("disarmingvoice", {}, [
        field(pathOf("soothe"), "安抚", "boolean", {
            help: "开启：被罩住且受伤的目标额外降攻并带魅惑身份，但威力 ×0.85、起手多 3 刻、冷却多 6 刻。关闭：满威力的清唱，只让受伤目标错拍、更快。"
        }),
        field(pathOf("ai.group"), "成圈取材", "boolean", {
            help: "开启后，自身声场圈住的敌人越多越优先开口；关闭则只按普通攻击排序。"
        })
    ]);
}
