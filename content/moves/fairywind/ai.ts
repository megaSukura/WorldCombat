/**
 * 妖精之风 / fairywind 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 13）格之内；更远交给共享接近逻辑。
 *   这是便宜、回得快的一条线，偏好从稍远处先手。
 * 对谁出手：`ai.through`（默认开）打开时，数「自身 → 目标」这条真实三维通道里、射程内、未被墙挡住、
 *   真实风团半径能罩住的非友方（受贯穿预算封顶）；≥2 就抬价——一穿一串才是它的价值。关闭则只看单目标。
 * 够不到怎么办：reach 就是本招射程，不够先走近；风会继续走，排成一线的人躲不掉。
 * 放完之后：一发即散，交回共享交战计划等冷却再刮下一阵。
 */
namespace PokemonSkills {
    /** 本招当前实际参数（含广旋式与成长）；读不到就退回行动携带的射程。 */
    function fairywindScope(context: WorldBehavior.Context, capability: WorldBehavior.Capability): NumberContext {
        const world = CompanionBehavior.world(context);
        return <NumberContext>{ world: world, actor: world.source(), skill: skills[fairywindId], detail: { values: capability.data.config } };
    }
    function fairywindNumber(scope: NumberContext, key: string, fallback: number): number {
        try { const value = p(fairywindId, key, scope); return isFinite(value) ? value : fallback; } catch (error) { return fallback; }
    }
    /** 瞄准方向真实三维通道里、真实风团能罩住的非友方数（含目标本身），受贯穿预算封顶。 */
    function fairywindLined(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const scope = fairywindScope(context, capability);
        const reach = Math.max(1, fairywindNumber(scope, "reach", Number(capability.data.range) || 9));
        const radius = Math.max(0.2, fairywindNumber(scope, "radius", 0.3));
        const cap = Math.max(0, Math.round(fairywindNumber(scope, "pierce", 1)));
        const origin = CompanionBehavior.point(self.point);
        const toward = CompanionBehavior.point(target.point).minus(origin);
        const frame = WorldGeometry.basis(toward, WorldCombat.point(0, 0, 1));
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || !(other.health > 0) || !other.visible) continue;
            const at = CompanionBehavior.point(other.point), delta = at.minus(origin);
            const along = delta.x() * frame.forward.x() + delta.y() * frame.forward.y() + delta.z() * frame.forward.z();
            if (along < -0.2 || along > reach) continue;
            const lateral = Math.abs(delta.x() * frame.right.x() + delta.y() * frame.right.y() + delta.z() * frame.right.z());
            if (lateral > radius + 0.8) continue;
            if (!world.clear(origin, at)) continue;
            count++;
        }
        return Math.min(count, cap + 1);
    }

    CompanionBehavior.registerUse(fairywindId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return !target.friendly && target.health > 0 && target.visible
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                    <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "through", true)) return 20;
            const lined = fairywindLined(context, capability, target);
            return lined >= 2 ? 20 + Math.min(16, (lined - 1) * 6) : 17;
        }
    });

    addPreferences(fairywindId, {}, [
        field(pathOf("wide"), "广旋式", "boolean", {
            help: "开启：风团判定 ×1.5、贯穿 +1、侧甩 ×1.4，但单次威力 ×0.85、起手 +1 刻、冷却 +5 刻——扫得更宽更散。关闭（轻掠式，默认）：单次 ×1.15、出手快、冷却短，但判定窄、贯穿少、侧甩弱。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动刮风，先走近；越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.through"), "穿一串", "boolean", {
            help: "开启：数「自身到目标」这条三维通道里、射程内、未被墙挡住、真实风团能罩住的非友方（受贯穿上限封顶）；有两个以上就优先刮风穿过去。关闭：不数通道，当普通远程攻击排序。"
        })
    ]);
}
