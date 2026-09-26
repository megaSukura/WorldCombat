/**
 * 洁净光芒 / lusterpurge —— AI 用途（重做后）。
 *
 * 出手局面：朝瞄准方向的一束短光扇。目标可见、敌对、存活，且落在 `ai.maxChase`（默认 8）格内时列入候选；
 *   施法者放招时不移动、不追踪，所以先让共享接近把身位收进光束射程再放。
 * 对谁出手：`ai.cluster`（默认开）打开时，数一数目标方向前方、按实际张角展开的光扇里还挤着几个非友方——
 *   正面聚团正是它最值的时候；只数正面，因此被从背后围住时不会误以为这招能解围。关闭则只按普通攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享接近把身位收进光扇之后再放。
 * 放完接什么：交回共享交战计划；它是一发定向爆发，不负责收尾。
 */
namespace PokemonSkills {
    /** 以目标方向为中线，按本个体实际的光扇张角与光束射程数一数扇内还挤着几个非友方（含目标）。 */
    function lusterpurgeFront(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context).point, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2], span = Math.sqrt(dx * dx + dz * dz);
        if (span < 1e-6) return 1;
        const ux = dx / span, uz = dz / span;
        const range = typeof capability.data.range === "number" ? capability.data.range : 6;
        const angle = p("lusterpurge", "fanAngle", CompanionBehavior.world(context));
        const cosHalf = Math.cos(Math.min(180, Math.max(5, angle)) * Math.PI / 360);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            const ox = other.point[0] - self[0], oz = other.point[2] - self[2], distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > range || distance < 1e-6) continue;
            if ((ox / distance) * ux + (oz / distance) * uz >= cosHalf - 1e-12) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("lusterpurge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 20 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return lusterpurgeFront(context, capability, target) >= 2 ? base + 14 : base;
        }
    });

    addPreferences("lusterpurge", {}, [
        field(pathOf("focus"), "聚光形态", "boolean", {
            help: "开启：光扇收窄到 0.7、威力 ×1.18、碾防概率 +0.06、起手 +2 刻、冷却 +4 刻，适合正面把一个目标照透。关闭：光扇更宽、威力与概率按基础值，适合扫前方一片。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动靠近，先收进光束射程；越大越愿意先朝目标接近再放。"
        }),
        field(pathOf("ai.cluster"), "正面聚团优先", "boolean", {
            help: "开启后，目标方向前方、按实际张角展开的光扇里还挤着别的敌人时优先放光扇，一次扫到一排；只数正面，所以被背后围住时不会误以为能解围。关闭则只按普通攻击排序。"
        })
    ]);
}
