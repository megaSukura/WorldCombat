/**
 * 恶之波动 / darkpulse 的伙伴 AI 用途。
 *
 * 什么局面下出手：中距离的一团恶意气场，目标可见、敌对、存活且在 `ai.maxChase`（默认 14）格内。
 * 它是范围招：`ai.cluster` 打开时，按气团**真实飞行半径与高度**判断途中第一具挡路的敌人（或墙面），
 * 再以该实际接触点为中心、按本个体**配置的气场半径**与遮挡数出会被罩住的非友方，罩到两个及以上就抬 priority，
 * 一次罩住一片；`ai.cluster` 关闭则只按普通远程攻击排序。
 * 对谁出手：以候选敌人所在位置为落点；`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再出手。
 * 放完接什么：交回共享交战计划；它是一记中距离的点射，不负责收尾。
 */
namespace PokemonSkills {
    function darkpulseWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 14);
    }

    /** 用本个体真实配置求一项参数；缺省时退回给定值。 */
    function darkpulseValue(context: WorldBehavior.Context, item: WorldBehavior.Capability, key: string, fallback: number): number {
        const world = CompanionBehavior.world(context);
        const value = p("darkpulse", key, { world: world, actor: world.source(), detail: { values: item.data.config } });
        return typeof value === "number" && isFinite(value) ? value : fallback;
    }

    function darkpulsePoint(point: number[]): CombatPoint { return WorldCombat.point(point[0], point[1], point[2]); }

    /** 真实飞行路径（含飞行判定半径与身体高宽）上第一具挡路的敌人或墙面：返回气场实际炸开的位置。 */
    function darkpulseContact(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number[] {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const flight = Math.max(0.22, darkpulseValue(context, item, "radius", 0.28));
        const from = CompanionBehavior.point(self.point);
        const aim = CompanionBehavior.point(target.point).minus(from);
        const length = aim.length();
        if (!(length > 0.1)) return target.point;
        const unit = aim.scale(1 / length);
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let first = target.point, firstAlong = length;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const offset = CompanionBehavior.point(other.point).minus(from);
            const along = offset.x() * unit.x() + offset.y() * unit.y() + offset.z() * unit.z();
            if (along <= 0.1 || along >= firstAlong) continue;
            // 真实弹半径加上身体半宽/半高：擦着弹体的身体也会提前引爆。
            const perp = offset.minus(unit.scale(along)).length();
            const body = Math.max(typeof other.width === "number" ? other.width : 0.9, typeof other.height === "number" ? other.height : 1.4);
            if (perp > flight + body * 0.5) continue;
            first = other.point; firstAlong = along;
        }
        // 到第一接触点的真实墙面：撞块就在可达面炸开。
        const wall = WorldGeometry.blockHit(world, from, darkpulsePoint(first));
        return wall === null ? first : [wall.position().x(), wall.position().y(), wall.position().z()];
    }

    /** 在真实接触点周围、按本个体配置的气场半径与遮挡，数一数会被罩住的非友方。 */
    function darkpulseCoverage(context: WorldBehavior.Context, item: WorldBehavior.Capability, contact: number[]): number {
        const world = CompanionBehavior.world(context);
        const bloom = Math.max(1.8, darkpulseValue(context, item, "bloom", 3.0));
        const at = darkpulsePoint(contact);
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(contact, other.point) > bloom) continue;
            // 圈伤逐敌 clear：隔墙的不算收益。
            if (WorldGeometry.blockHit(world, at, CompanionBehavior.point(other.point)) !== null) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("darkpulse", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return darkpulseWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !darkpulseWants(context, capability, target)) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return 20;
            // 半路撞人/撞墙时爆圈会停在实际第一接触点，按那点周围的真实覆盖评分。
            return darkpulseCoverage(context, capability, darkpulseContact(context, capability, target)) >= 2 ? 36 : 20;
        }
    });

    addPreferences("darkpulse", {}, [
        field(pathOf("creep"), "弥漫气场", "boolean", {
            help: "开启：气场飞得更慢、落点更大、畏缩更易，但威力约少 15%%、冷却更长，适合罩一片。关闭：更快更小更重，适合点射落单的目标。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动推气场，先走近。越大越愿意在更远处先手，目标也越有时间在气场抵达前走开。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，气场实际炸开点周围罩得住两个及以上敌人时优先推气场，一次罩住一片；关闭则只按普通远程攻击排序。"
        })
    ]);
}
