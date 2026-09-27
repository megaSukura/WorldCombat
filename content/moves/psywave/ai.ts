/**
 * 精神波 / psywave —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 15）格内；够不到交给共享接近逻辑。
 *   它便宜、冷却短，是常规远程输出。
 * 对谁出手：`ai.crowd`（默认开）打开时，数「自身 → 目标」这条真实三维通道里、射程内、未被墙挡住、
 *   真实波宽能罩住的非友方数（受本招实际穿透预算封顶）；≥2 就抬价。关闭则只看单目标。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 放完之后：交回共享交战计划；本此摇出的强度只决定伤害，不改变行为。
 */
namespace PokemonSkills {
    /** 本招当前实际参数（含配置与成长），用于通道计数；读不到就退回行动携带的射程。 */
    function psywaveScope(context: WorldBehavior.Context, capability: WorldBehavior.Capability): NumberContext {
        const world = CompanionBehavior.world(context);
        return <NumberContext>{ world: world, actor: world.source(), skill: skills[psywaveId], detail: { values: capability.data.config } };
    }
    function psywaveNumber(scope: NumberContext, key: string, fallback: number): number {
        try { const value = p(psywaveId, key, scope); return isFinite(value) ? value : fallback; } catch (error) { return fallback; }
    }
    /** 瞄准方向真实三维通道里能被这一发罩住的非友方数（含目标本身），受穿透预算封顶。 */
    function psywaveLined(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const scope = psywaveScope(context, capability);
        const reach = Math.max(1, psywaveNumber(scope, "reach", Number(capability.data.range) || 12));
        const width = Math.max(0.2, psywaveNumber(scope, "width", 0.55));
        const pierce = Math.max(1, Math.min(9, Math.round(psywaveNumber(scope, "pierce", 2))));
        const origin = CompanionBehavior.point(self.point);
        const toward = CompanionBehavior.point(target.point).minus(origin);
        const frame = WorldGeometry.basis(toward, WorldCombat.point(0, 0, 1));
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const at = CompanionBehavior.point(other.point), delta = at.minus(origin);
            const along = delta.x() * frame.forward.x() + delta.y() * frame.forward.y() + delta.z() * frame.forward.z();
            if (along < -0.2 || along > reach) continue;
            const lateral = Math.abs(delta.x() * frame.right.x() + delta.y() * frame.right.y() + delta.z() * frame.right.z());
            if (lateral > width + 0.8) continue;
            if (!world.clear(origin, at)) continue;
            count++;
        }
        return Math.min(count, pierce + 1);
    }

    function psywaveWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
    }

    CompanionBehavior.registerUse(psywaveId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psywaveWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psywaveWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 18 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true)) {
                const lined = psywaveLined(context, capability, target);
                if (lined >= 2) score += Math.min(20, (lined - 1) * 7);
            }
            return score + Math.round(CompanionBehavior.ratio(target) * 4);
        }
    });

    addPreferences(psywaveId, { ai: { maxChase: 15, crowd: true } }, [
        field(pathOf("surge"), "涌动", "boolean", {
            help: "开启：威力 ×1.2、波动幅度 ×1.5，更容易摇出高低两端，收招快 3 刻；代价是基础威力略降、射程不变，冷却不降。关闭（稳流）：威力与波动都小一半，射程 ×1.1、冷却 −3 刻，稳而远。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 22, step: 1,
            help: "超过这个距离就不主动推波，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.crowd"), "优先穿透成列", "boolean", {
            help: "开启：数「自身到目标」这条三维通道里、射程内、未被墙挡住、真实波宽能罩住的非友方（受穿透数封顶）；有两个以上就优先推一道能穿过去的波。关闭则只按普通远程攻击排序。"
        })
    ]);
}
