/**
 * 洁净光芒 / lusterpurge —— AI 用途（重做后）。
 *
 * 出手局面：朝瞄准方向的一束短光扇。目标可见、敌对、存活，且落在 `ai.maxChase`（默认 8）格内时列入候选；
 *   施法者放招时不移动、不追踪，所以先让共享接近把身位收进光束射程再放。
 * 对谁出手：`ai.cluster`（默认开）打开时，数一数目标方向前方、按本个体实际配置张角与三维扇厚展开的光扇里，
 *   真正还能被光照到、且没有被更近的身体或墙挡住的非友方有几个——正面聚团正是它最值的时候；只数正面，
 *   因此被从背后围住时不会误以为这招能解围。关闭则只按普通攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享接近把身位收进光扇之后再放。
 * 放完接什么：交回共享交战计划；它是一发定向爆发，不负责收尾。
 */
namespace PokemonSkills {
    /**
     * 以目标方向为中线，按本个体实际的光扇张角、三维扇厚（0.28 半厚）与光束射程，数一数扇内真正能被照到、
     * 且没有被更近身体或墙挡住的非友方（含目标）。与 execute 的逐身体 lit 判定同向：前排身体会遮光。
     */
    function lusterpurgeFront(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context).point, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const world = CompanionBehavior.world(context);
        const dx = target.point[0] - self[0], dy = target.point[1] - self[1], dz = target.point[2] - self[2];
        const span = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (span < 1e-6) return 1;
        const ux = dx / span, uy = dy / span, uz = dz / span;
        const range = typeof capability.data.range === "number" ? capability.data.range : 6;
        const angle = p("lusterpurge", "fanAngle", world);
        const cosHalf = Math.cos(Math.min(180, Math.max(5, angle)) * Math.PI / 360);
        // 扇平面：方向与水平侧向张成；法线给出三维扇厚的垂直偏移。
        const horizontal = Math.sqrt(dx * dx + dz * dz);
        const sx = horizontal < 1e-6 ? 1 : -dz / horizontal, sz = horizontal < 1e-6 ? 0 : dx / horizontal;
        const nx = uy * sz, ny = uz * sx - ux * sz, nz = -uy * sx;
        function blocked(ox: number, oy: number, oz: number, distance: number): boolean {
            const factor = distance * distance;
            for (let i = 0; i < nearby.length; i++) {
                const blocker = nearby[i];
                if (blocker.friendly || blocker.health <= 0 || blocker.ref === String(context.actor)) continue;
                const bx = blocker.point[0] - self[0], by = blocker.point[1] - self[1], bz = blocker.point[2] - self[2];
                const t = (bx * ox + by * oy + bz * oz) / factor;
                if (t <= 0.05 || t >= 0.95) continue;
                const px = bx - ox * t, py = by - oy * t, pz = bz - oz * t;
                if (Math.sqrt(px * px + py * py + pz * pz) < 0.6 + (typeof blocker.width === "number" ? blocker.width : 0.6) / 2) return true;
            }
            return false;
        }
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            const ox = other.point[0] - self[0], oy = other.point[1] - self[1], oz = other.point[2] - self[2];
            const distance = Math.sqrt(ox * ox + oy * oy + oz * oz);
            if (distance > range || distance < 1e-6) continue;
            if ((ox * ux + oy * uy + oz * uz) / distance < cosHalf - 1e-12) continue;
            if (Math.abs(ox * nx + oy * ny + oz * nz) > 0.28 + (typeof other.width === "number" ? other.width : 0.6) / 2) continue;
            if (blocked(ox, oy, oz, distance)) continue;
            if (!world.clear(CompanionBehavior.point(self), CompanionBehavior.point(other.point))) continue;
            count++;
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
