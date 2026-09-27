/**
 * 蟹钳锤 / crabhammer 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 6）之内；更远交给共享接近逻辑。
 * 对谁出手：这是一次很慢很重的下砸，前摇长、能被躲开，落点只看真实接触，所以选的是「前扇容易罩住、砸下去收益高」的目标：
 *   - 前扇收益：目标身边还聚着其他敌人时抬高，接触处的前扇能一次掀到后排。
 *   - 预计停留：目标移动慢、被定身、或在攻击别人时更可能停在前扇里；疾走目标降权。
 *   - 物防收益：裂甲档下目标物防还没触底、且物防越厚，敲裂越值；已触底则降权。
 *   身高只作为一个小加成，不再是唯一依据。
 * 够不到怎么办：出手距离交给 `reach`，共享任务贴进钳子范围再举钳。
 * 放完接什么：交回共享交战计划；被砸中的人若能站住就带着物防被敲裂的架势，接下来由共享顺序决定追击还是脱离。
 */
namespace PokemonSkills {
    /** 目标身边聚着几个还活着的其他敌人；前扇水花在聚堆处收益最高。 */
    function crabhammerCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let others = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - target.point[0], dz = other.point[2] - target.point[2];
            if (Math.sqrt(dx * dx + dz * dz) <= 2.5) others++;
        }
        return others;
    }

    /** 前摇很长，落点只看接触，所以更愿意砸在预计会停住的目标上；疾走目标降权。 */
    function crabhammerDwell(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): number {
        let score = 0;
        const velocity = target.velocity;
        const speed = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : 0;
        if (speed < 0.05) score += 6;
        else if (speed > 0.2) score -= 6;
        if (CompanionBehavior.bound(context, target)) score += 6;
        if (target.attacking && target.attacking !== self.ref) score += 4;
        return score;
    }

    /** 裂甲档下物防越厚、越没触底，敲裂越值；已触底则不再有收益。 */
    function crabhammerDefBenefit(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        if (CompanionBehavior.stage(context, target, "def") <= -6) return -6;
        const stats = CompanionBehavior.combatStats(context, target);
        const def = stats && stats.stats && typeof stats.stats.def === "number" ? stats.stats.def : null;
        if (def !== null && def > 0) return Math.min(8, 2 + def / 18);
        return 4;
    }

    CompanionBehavior.registerUse(crabhammerId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let base = 24;
            // 目标身边聚着其他敌人时，前扇水花能一次掀到后排，收益更高。
            if (crabhammerCluster(context, target as CompanionBehavior.Entity) >= 1) base += 8;
            base += crabhammerDwell(context, self, target as CompanionBehavior.Entity);
            if (!CompanionBehavior.ai<boolean>(capability, "crack", true)) return base;
            // 裂甲在还没触底、物防更厚的大个子身上最值；身高只作为一个小加成。
            base += crabhammerDefBenefit(context, target as CompanionBehavior.Entity);
            if ((target.height || 1.4) >= 1.6) base += 3;
            return base;
        }
    });

    addPreferences(crabhammerId, {}, [
        field(pathOf("crack"), "裂甲式", "boolean", {
            help: "开启：砸中时目标物防 −1 级、水扇半径 ×1.1，代价是砸击威力 ×0.94、前摇 +2 刻、冷却 +6 刻；关闭：重锤式，砸击威力 ×1.06、前扇更小、出手更快，代价是没有任何破甲效果。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动举钳，先走近；越大越愿意从稍远处先手，但前摇更长、目标更容易让开落点。"
        }),
        field(pathOf("ai.crack"), "对大个子优先", "boolean", {
            help: "开启：优先砸向身边聚堆、预计会停住、且物防还没触底的目标，裂甲与前扇在它们身上最值；关闭：只按普通近身攻击排序。"
        })
    ]);
}
