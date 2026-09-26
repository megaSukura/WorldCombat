/**
 * 飞叶快刀 / razorleaf 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 12）格内。`ai.line`（默认开）实际改变
 *   候选排序：开启时，若瞄准方向沿窄带还排着别的敌人，把它抬到优先——叶幕真实推进、削穿一列才是它的价值；
 *   只有单个目标时按普通远程切割排序。关闭则不数直线，当单点远叶排。会横向侧闪的目标降权：它能在后波
 *   到来前走出窄带，连发容易落空。
 * 放完之后：交回共享交战计划；它是站定的连发招，掷完不改变站位。
 */
namespace PokemonSkills {
    /** 瞄准方向上、射程内还排着几个敌人（供直线加分）。 */
    function razorleafLine(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const reach = Number(capability.data.range) || 0;
        const ax = target.point[0] - self.point[0], az = target.point[2] - self.point[2];
        const length = Math.sqrt(ax * ax + az * az);
        if (length < 0.5) return 1;
        const ux = ax / length, uz = az / length;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible || other.ref === self.ref) continue;
            const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
            const along = dx * ux + dz * uz;
            if (along < 0 || along > reach + 1) continue;
            if (Math.abs(dx * uz - dz * ux) <= 1.4) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(razorleafId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return !target.friendly && target.health > 0 && target.visible
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                    <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            // 会横移侧闪的敌人能在后波到来前走出窄带——降权，别把连发浪费在追不上的目标上。
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity) {
                const ax = target.point[0] - self.point[0], az = target.point[2] - self.point[2];
                const length = Math.sqrt(ax * ax + az * az);
                if (length >= 0.5) {
                    const lateral = Math.abs(velocity[0] * (-az / length) + velocity[2] * (ax / length));
                    if (lateral > 0.1) return 8;
                }
            }
            if (!CompanionBehavior.ai<boolean>(capability, "line", true)) return 22;
            const inLine = razorleafLine(context, capability, target);
            return inLine >= 2 ? 22 + Math.min(18, (inLine - 1) * 7) : 18;
        }
    });

    addPreferences(razorleafId, {}, [
        field(pathOf("broad"), "撒叶式", "boolean", {
            help: "开启：叶幕铺宽到 1.8 倍、每波更重（×1.15）、冷却少 4 刻，但少发一波；关闭（连叶式，默认）：多连发一波、叶幕收窄到 0.8 倍，但冷却多 5 刻、每波更轻——用更窄的带子削穿一列。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动飞叶，先走近；越大越愿意从远处先手削出去。"
        }),
        field(pathOf("ai.line"), "削一列", "boolean", {
            help: "开启：瞄准方向还排着别的敌人时优先飞叶，一道叶幕扫穿一列；关闭：不数直线，当普通远程飞叶排序。"
        })
    ]);
}
