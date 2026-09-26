/**
 * 龙爪 / dragonclaw 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 6）格内；爪程中等，够不到先让共享接近逻辑送进来。
 * 对谁出手：`ai.crowd`（默认开）在正面有两只以上可选目标时把这一招抬到最前——两条爪带一次扫多个才是它的本行；
 * 正面那只厚甲主敌越好，`priority` 给的加成越高，好把交叉中心对准它、撕开护甲；`ai.finish` 收残血。单个目标时它仍是一记重击，但不再抢优先级。
 * 出手位置：站在交叉中心正对目标（约 2 格），让两条爪带把侧面的敌人一起框进来，中心落在厚甲目标身上。
 * 放完之后：交回共享交战计划；中心目标的护甲已被撕开，下一次命中更疼。
 */
namespace PokemonSkills {
    function dragonclawValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 目标的有效防御，用来把交叉中心对准厚甲主敌；非宝可梦或未给出防御时为 0。 */
    function dragonclawArmor(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const stats = CompanionBehavior.combatStats(context, target);
        const value = stats && stats.stats ? Number(stats.stats.def) : NaN;
        return isFinite(value) && value > 0 ? value : 0;
    }

    CompanionBehavior.registerUse("dragonclaw", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!dragonclawValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) { return dragonclawValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 18;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true)) {
                let count = 0;
                const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
                nearby.forEach(function (other) {
                    if (dragonclawValid(other) && CompanionBehavior.distance(self.point, other.point) <= capability.data.range) count++;
                });
                if (count >= 2) score += 14;
            }
            score += Math.max(0, Math.min(6, dragonclawArmor(context, target) / 30));
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 10;
            return score;
        }
    });

    addPreferences("dragonclaw", {}, [
        flag("cross", "交叉式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.crowd", "优先扫多目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
