/**
 * 魅惑之声 / disarmingvoice 的 AI 用途。
 *
 * 什么局面下出手：声场以自身为心，所以它看的是**自己周围**实际被罩住的人数，而不是目标身边的人。
 * 只有至少一个可见敌人在声场半径内才开口，远处敌群不会诱使它空鸣。
 * `ai.group`（默认开）：被罩住的敌人越多优先级越高，因为一句叫声能同时命中一圈。
 * 安抚形态下同样按圈内人数评估，用降攻换取交换优势。
 */
namespace PokemonSkills {
    /**
     * 声场是贴着施法者身体高度、半径 reach 的圆柱区，不是纯水平圆：按地面水平距离加上身体的竖直跨度判断，
     * 才和 WorldGeometry.ring({below:2, above:3}) 的实际 hitbox 判定一致。
     */
    function disarmingvoiceInField(self: CompanionBehavior.Entity, other: CompanionBehavior.Entity, reach: number): boolean {
        const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
        if (Math.sqrt(dx * dx + dz * dz) > reach) return false;
        const half = (typeof other.height === "number" && other.height > 0 ? other.height : 1.4) / 2;
        return other.point[1] + half >= self.point[1] - 2 && other.point[1] - half <= self.point[1] + 3;
    }
    /** 声场体积内可见的非友方数量，按实际声场高度计数。 */
    function disarmingvoiceCaught(context: WorldBehavior.Context, reach: number): number {
        const self = CompanionBehavior.source(context);
        let count = 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (disarmingvoiceInField(self, other, reach)) count++;
        }
        return count;
    }
    /** 还能被震到错拍（速度等级没到下限）的目标；封底的人仍吃声伤，但不再算作一次有效错拍。 */
    function disarmingvoiceStaggerable(context: WorldBehavior.Context, reach: number): number {
        const self = CompanionBehavior.source(context);
        let count = 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (!disarmingvoiceInField(self, other, reach)) continue;
            if (CompanionBehavior.stage(context, other, "spe") > -6) count++;
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
            // 能真正被错拍的人权重更高；已经在极限的人只算声伤，不浪费优先度。
            var staggerable = disarmingvoiceStaggerable(context, capability.data.range);
            return 20 + Math.max(0, staggerable - 1) * 12 + Math.max(0, caught - staggerable) * 4;
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
