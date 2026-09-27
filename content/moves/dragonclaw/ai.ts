/**
 * 龙爪 / dragonclaw 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 6）格内；爪程中等，够不到先让共享接近逻辑送进来。
 * 对谁出手：用本招真实的爪程/张角/半宽公式，沿自身→目标方向铺出两条斜爪带，数附近有多少敌人的身体落在带上；
 *   `ai.crowd`（默认开）在两条爪带一次罩住两只以上时把这一招抬到最前——一次扫多个才是它的本行；
 *   落在两带交叉中心（甜点）的目标额外加权，好把交点对准厚甲主敌、撕开它的护甲；`ai.finish` 收残血。
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

    /** 沿自身→目标方向、用本招真实公式铺出的两条斜爪带（水平投影）。 */
    function dragonclawBands(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): {
        centre: number[]; halfLength: number; claw: number; dirA: number[]; dirB: number[];
    } | null {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        if (span < 1e-4) return null;
        const world = CompanionBehavior.world(context);
        const values = { world: world, actor: world.source(), skill: skills["dragonclaw"], detail: { values: item.data.config } };
        const reach = Math.max(2.0, Math.min(3.4, Number(item.data.range)));
        const spread = Math.max(60, Math.min(180, p("dragonclaw", "spread", values)));
        const claw = Math.max(0.3, p("dragonclaw", "claw", values));
        const theta = Math.max(20, Math.min(60, spread / 2 * 0.85)) * Math.PI / 180;
        const hx = dx / span, hz = dz / span, c = Math.cos(theta), s = Math.sin(theta);
        return { centre: [self.point[0] + hx * reach * 0.55, self.point[1], self.point[2] + hz * reach * 0.55],
            halfLength: reach * 0.55, claw: claw,
            dirA: [hx * c - hz * s, hx * s + hz * c], dirB: [hx * c + hz * s, -hx * s + hz * c] };
    }

    /** 一个身体点被几条爪带罩住（0/1/2）；半径给身体留一点边。 */
    function dragonclawCovered(bands: { centre: number[]; halfLength: number; claw: number; dirA: number[]; dirB: number[] }, point: number[]): number {
        const dx = point[0] - bands.centre[0], dz = point[2] - bands.centre[2], radius = 0.45;
        let cover = 0;
        const dirs = [bands.dirA, bands.dirB];
        for (let i = 0; i < dirs.length; i++) {
            const along = dx * dirs[i][0] + dz * dirs[i][1];
            const side = dx * (-dirs[i][1]) + dz * dirs[i][0];
            if (Math.abs(along) <= bands.halfLength + radius && Math.abs(side) <= bands.claw + radius) cover++;
        }
        return cover;
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
            const bands = dragonclawBands(context, capability, target);
            let bandFoes = 0, centredFoes = 0;
            if (bands !== null) {
                const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (!dragonclawValid(other)) continue;
                    const cover = dragonclawCovered(bands, other.point);
                    if (cover > 0) bandFoes++;
                    if (cover > 1) centredFoes++;
                }
                if (dragonclawCovered(bands, target.point) > 1) centredFoes++;
            }
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true) && bandFoes >= 2) score += 14;
            score += Math.min(8, centredFoes * 4);
            score += Math.max(0, Math.min(6, dragonclawArmor(context, target) / 30));
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 10;
            return score;
        }
    });

    addPreferences("dragonclaw", {}, [
        flag("cross", "张开式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.crowd", "优先扫多目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
