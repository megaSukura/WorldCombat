/**
 * 电力上升 / risingvoltage 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 17）格内；更远交给共享接近逻辑。
 * 对谁出手：一柱从锁定落点升起的垂直电击，所以最值的是「脚下带电、又不急着跑开」的目标。
 *   `ai.seekCharged`（默认开）打开时，脚下带着电场电荷（共享身份 electricterrain）的目标排到最前——这一柱对它们翻倍；
 *   落点附近还挤着别人（垂直聚集或低飞扎堆）时抬价，因为一柱能一起贯穿；当刻水平速度快的目标降权——
 *   电流要爬一段才升起，横移快的对象容易在柱起前就离开半径。够不到就靠近。
 * 放完之后：落点是一圈会一起挨打的地面区域，交回共享交战计划。
 */
namespace CompanionBehavior {
    function risingVoltageWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    /** 落点附近还挤着几个非友方（含目标），按本个体真实的电柱粗细判定。 */
    function risingVoltageStack(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const radius = Math.max(0.6, PokemonSkills.p(PokemonSkills.risingvoltageId, "columnRadius", world));
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0) continue;
            const dx = other.point[0] - target.point[0], dz = other.point[2] - target.point[2];
            if (Math.sqrt(dx * dx + dz * dz) <= radius) count++;
        }
        return count;
    }

    /** 目标当刻的水平速度；读不到速度就当作未知、不惩罚。 */
    function risingVoltageDrift(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const velocity = CompanionBehavior.velocity(context, target);
        if (velocity === null) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    }

    CompanionBehavior.registerUse(PokemonSkills.risingvoltageId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return risingVoltageWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !risingVoltageWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            let score = 15;
            if (CompanionBehavior.ai<boolean>(capability, "seekCharged", true) && CompanionBehavior.status(context, target, "electricterrain"))
                score += 30;
            if (risingVoltageStack(context, target) >= 2) score += 10;
            // 横移快的目标容易在电柱升起前离开半径，降权；站定/低飞的更可能被贯穿。
            if (risingVoltageDrift(context, target) > 0.08) score -= 8;
            return score;
        }
    });

    const risingVoltageChase = PokemonSkills.number("ai.maxChase", "出手距离", 4, 24, 1);
    risingVoltageChase.help = "超过这个距离就不主动出手，先走近；越大越愿意在更远处点着地脉。";
    const risingVoltageSeek = PokemonSkills.flag("ai.seekCharged", "专打带电目标");
    risingVoltageSeek.help = "开启：脚下带着电场电荷的目标排到最前，因为这一柱对它们翻倍；同时更愿意打扎堆/站定的人、少打快速横移的人；关闭则只按普通远程攻击排序。";

    PokemonSkills.addPreferences(PokemonSkills.risingvoltageId, { ai: { maxChase: 17, seekCharged: true } },
        [risingVoltageChase, risingVoltageSeek]);
}
