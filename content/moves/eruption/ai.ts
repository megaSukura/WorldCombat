/**
 * 喷火 / eruption 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一个以自身为中心、威力随自己血量走的满血爆发。`available` 要求有可见、敌对、存活
 * 且在 `ai.maxChase`（默认 8）格内的目标；`priority` 随自己血量越满而抬高——残血时这一记既弱又不值得冒险，
 * 所以即便身边围着一圈敌人也不会只因数量就抬价。`ai.cluster`（默认开）只在**自己健康**时按实际
 * `blastRadius` 内的敌人数再加一档：那是这一发真正能一次罩住的范围，而不是远处某只怪身边的扎堆。
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function eruptionWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    /** 自己实际 blastRadius 内、这一发真能喷到的非友方数量（含给出的目标）。 */
    function eruptionCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        var self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[],
            world = CompanionBehavior.world(context), radius = Math.max(2.4, p("eruption", "blastRadius", world)), count = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= radius) count++;
        }
        if (count === 0 && CompanionBehavior.distance(self.point, target.point) <= radius) count = 1;
        return count;
    }

    CompanionBehavior.registerUse("eruption", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return eruptionWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !eruptionWants(context, capability, target)) return 0;
            const ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
            let score = 20;
            const healthy = CompanionBehavior.ai<boolean>(capability, "healthy", true);
            if (healthy) score += Math.round(ratio * 18);
            // 成片收益只在血线站得住时算；残血不因围敌多而冒险。
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true) && (!healthy || ratio >= 0.45)) {
                const packed = eruptionCluster(context, capability, target);
                if (packed >= 2) score += 18;
            }
            return score;
        }
    });

    addPreferences("eruption", {}, [
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动靠近，先在喷发半径外待命。越大越愿意先朝目标接近再炸。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，自己实际喷发半径内挤着两个以上敌人时优先喷火，一次罩住一圈；残血时不再因围敌多而抬价。关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.healthy"), "满血时优先", "boolean", {
            help: "开启后，伙伴在自己血量越满时越倾向喷火（威力随剩余血量走）；关闭则不看血线，什么时候都可能用。"
        })
    ]);
}
