/**
 * 虫之抵抗 / strugglebug 的伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为心、贴地整圈推出的虫群。`ready` 按**真实扩散半径**（`capability.data.range`，
 * 由体型/特攻/等级算出）统计身周可见、敌对、且**真实站在地面上**（脚底有支撑、与中心通视）的敌人，
 * 至少 `ai.minFoes`（默认 2）个才推——飞在高处、墙后、悬空断处的敌人不凑数，墙上的人也咬不到。
 * `ai.maxChase` 只决定“愿意先追到多近再推”，够不到交给共享接近逻辑；走进半径以内就原地扎稳。
 * 对谁出手：被贴身围住时最值；自己生命偏低时再抬一档，把身边人一起拖慢、拉开距离。
 * 状态：降特攻与减速是否真的成立由命中层的实际回执决定，免控目标照吃主伤；这里只按几何与被围程度出手。
 */
namespace PokemonSkills {
    /** 本招的真实波及半径；`ready` 的人数按它数，墙后与高空的不算。 */
    function strugglebugReach(item: WorldBehavior.Capability): number {
        return typeof item.data.range === "number" ? item.data.range : 3.4;
    }

    /** 真实半径内、贴地可及（脚底有支撑、与中心通视）的非友方数量。 */
    function strugglebugReachable(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const reach = strugglebugReach(item);
        const world = CompanionBehavior.world(context);
        const actor = world.actor(self.ref);
        if (actor === null) return 0;
        const body = world.observe(actor);
        if (body === null) return 0;
        const centre = body.position();
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) > reach) continue;
            if (other.grounded === false) continue;
            const at = CompanionBehavior.point(other.point);
            const feet = WorldCombat.point(at.x(), at.y() - (other.height || 1.4) / 2, at.z());
            if (SurfacePaths.support(world, feet, 0.5, 1.0) === null) continue;
            if (!world.clear(centre, feet)) continue;
            count++;
        }
        return count;
    }

    function strugglebugWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse(strugglebugId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false
                && strugglebugReachable(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return strugglebugWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !strugglebugWants(context, capability, target)) return 0;
            const count = strugglebugReachable(context, capability);
            let base = 20;
            if (count >= 3) base += Math.min(20, (count - 2) * 6);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.5) base += 6;
            return base;
        }
    });

    addPreferences(strugglebugId, { ai: { maxChase: 7, minFoes: 2 } }, [
        number("ai.maxChase", "考虑距离", 2, 16, 1),
        number("ai.minFoes", "涌到人数", 1, 6, 1)
    ]);
}
