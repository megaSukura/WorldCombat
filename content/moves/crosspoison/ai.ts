/**
 * 十字毒刃 / crosspoison 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）之内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferUnpoisoned`（默认开）打开时，还没中毒的目标排得更前——毒是这一招的价值；
 *   `ai.preferPair`（默认开）打开时，目标旁边那条刃线上还站着另一个敌人就再抬一档，一剪擦到两个；
 *   近乎停住的目标也抬一档，因为两刃的交叉点锁在瞄准那一刻，它更难滑出交点。
 * 够不到怎么办：出手距离交给 `reach`，共享任务先把身位收进两刃范围再剪。
 * 放完之后：正中目标被两条刃共同覆盖、按更高的交点毒率中毒；侧边只擦到一条刃的照吃折扣伤。
 */
namespace PokemonSkills {
    function crosspoisonClose(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    /**
     * 目标所在交叉点附近，另一名敌人落在任一条刃线上的估计数：合拢平面垂直于出手方向，
     * 两刃沿该平面的两条对角伸到目标两侧；用真实身体宽高判断是否被擦到，靠近交点则更可能双覆盖。
     */
    function crosspoisonPair(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const ax = target.point[0] - self.point[0], ay = target.point[1] - self.point[1], az = target.point[2] - self.point[2];
        const length = Math.sqrt(ax * ax + ay * ay + az * az);
        if (length < 0.5) return 0;
        const hx = ax / length, hy = ay / length, hz = az / length;
        const frame = WorldGeometry.basis(CompanionBehavior.point([hx, hy, hz]));
        const rx = frame.right.x(), ry = frame.right.y(), rz = frame.right.z();
        const ux = frame.up.x(), uy = frame.up.y(), uz = frame.up.z();
        const width = self.width || 0.9;
        const spread = Math.min(1.3, Math.max(0.55, 0.7 + Math.min(0.5, Math.max(-0.1, (width - 0.9) * 0.3))));
        const reach = spread * 1.28;
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        const inv = 1 / Math.sqrt(1.64);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref || other.ref === self.ref) continue;
            const ox = other.point[0] - target.point[0], oy = other.point[1] - target.point[1], oz = other.point[2] - target.point[2];
            if (Math.abs(ox * hx + oy * hy + oz * hz) > 0.6 + (other.height || 1.0) * 0.5) continue;
            const sx = ox * rx + oy * ry + oz * rz, sy = ox * ux + oy * uy + oz * uz;
            const bodyRadius = Math.max(0.35, (other.width || 0.9) * 0.5) + 0.25;
            if (Math.sqrt(sx * sx + sy * sy) > reach + bodyRadius) continue;
            if (Math.min(Math.abs(sx * 0.8 * inv - sy * inv), Math.abs(sx * 0.8 * inv + sy * inv)) <= bodyRadius) count++;
        }
        return count;
    }

    /** 水平速度：越接近静止的目标越可能在合拢那一刻留在交点上，两条刃才都剪得到。 */
    function crosspoisonStill(target: CompanionBehavior.Entity): boolean {
        const velocity = target.velocity;
        if (!velocity || velocity.length < 3) return true;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) < 0.06;
    }

    CompanionBehavior.registerUse("crosspoison", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return crosspoisonClose(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !crosspoisonClose(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 21;
            if (CompanionBehavior.ai<boolean>(capability, "preferUnpoisoned", true) && !CompanionBehavior.status(context, target, "poison")) score += 9;
            if (CompanionBehavior.ai<boolean>(capability, "preferPair", true) && crosspoisonPair(context, target) >= 1) score += 10;
            if (crosspoisonStill(target)) score += 5;
            return score;
        }
    });

    addPreferences("crosspoison", {}, [
        field(pathOf("corrode"), "腐蚀式", "boolean", {
            help: "开启：擦边毒率 ×1.2、交点毒率 ×1.3、中毒 ×1.15，但剪击威力 ×0.9、起手与冷却更久——以毒取胜。关闭（快刃式）：剪得更重更快，但毒更难按进伤口。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动合拢两刃，先走近；出手距离很短，设大也常常够不到。"
        }),
        field(pathOf("ai.preferUnpoisoned"), "优先剪没中毒的", "boolean", {
            help: "开启：还没中毒的目标排得更前，避免把这一次毒浪费在已经中毒的人身上；关闭则所有目标同价。"
        }),
        field(pathOf("ai.preferPair"), "优先能划到两个的", "boolean", {
            help: "开启：目标旁边那条刃线上还站着别的敌人时再抬一档，一剪擦到两个；关闭则只看目标本身。"
        })
    ]);
}
