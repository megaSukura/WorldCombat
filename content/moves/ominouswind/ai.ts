/**
 * 奇异之风 / ominouswind —— 伙伴 AI 用途。
 *
 * 什么局面下出手：一道能追到远处的幽风，落地时把一圈人朝中心收拢。`available` 要求目标可见、敌对、存活，
 *   且在自己 `ai.maxChase`（默认 14）格内；焦点目标不受距离限制。它不挑目标站不站在地上。
 * 选择倾向：收拢半径内还挤着别的敌人时优先——一次收一圈、把阵形拽散，统计用本个体真实的 `coilRadius`。
 *   `ai.chaseRunners`（默认开）打开时，移动快的目标排前；但先看幽风与目标的相对速度：目标沿背离方向
 *   跑得比幽风还快时追不上，这种极快逃敌会被降权、也不会被选择追击，避免无限追。聚群统计同样用真收拢半径。
 * 够不到交给共享接近逻辑；进了射程就放风。放完交回共享交战计划。
 */
namespace PokemonSkills {
    /** 以目标为中心、按本个体真实的收拢半径数一数圈里还挤着几个非友方（含目标）。 */
    function ominouswindCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const world = CompanionBehavior.world(context);
        const radius = Math.max(1.5, p("ominouswind", "coilRadius", world));
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    /** 幽风每刻有限转向；目标沿背离方向的速度达到或超过风头速度时追不上，不当作可追的跑者。 */
    function ominouswindCatchable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (!target.velocity) return true;
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const front = Math.max(0.2, p("ominouswind", "front", world));
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.5) return true;
        const outward = (target.velocity[0] * dx + target.velocity[2] * dz) / length;
        return outward < front * 0.9;
    }

    CompanionBehavior.registerUse("ominouswind", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            // 追不上的极快逃敌不追：只有当前已在风圈内才允许放。
            if (CompanionBehavior.ai<boolean>(capability, "chaseRunners", true) && !ominouswindCatchable(context, target)
                && distance > (typeof capability.data.range === "number" ? capability.data.range : 0)) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            let base = 18;
            const count = ominouswindCount(context, capability, target);
            if (count >= 2) base += Math.min(18, (count - 1) * 6);
            if (CompanionBehavior.ai<boolean>(capability, "chaseRunners", true) && target.velocity) {
                const speed = Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]);
                if (speed > 0.12) base += ominouswindCatchable(context, target) ? Math.min(14, Math.round(speed * 40)) : -8;
            }
            return Math.max(0, base);
        }
    });

    addPreferences("ominouswind", {}, [
        field(pathOf("haunt"), "缠魄式", "boolean", {
            help: "开启：收拢半径约 ×0.82、威力约 ×1.1、内收更强、反哺概率 +0.05，但奔袭更慢、冷却更长，适合把目标从掩体或队友身边拽出来打。关闭（漫游式，默认）：奔袭更快更远、覆盖约 ×1.15，但单点更轻、内收更弱。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动放风，先走近；越大越愿意对更远的目标放。"
        }),
        field(pathOf("ai.chaseRunners"), "先卷跑得快的", "boolean", {
            help: "开启后，移动快的目标优先——幽风有限转向，跑得快的最难把它甩掉；但沿背离方向跑得比风还快的极快目标追不上，会被降权且不再主动追。关闭则所有目标同价。"
        })
    ]);
}
