/**
 * 热风 / heatwave 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferClusters`（默认开）打开时优先周围挤着同伴的目标——一道扇面能连带扫到他们；
 *   已经带着共享灼伤身份的目标排后。它是一招覆盖面广、冷却不长的压制，值得在对手聚拢时先放。
 * 够不到怎么办：reach 就是本招吹程，不够就靠近。
 * 放完之后：把命中与击退交回共享交战计划。
 */
namespace PokemonSkills {
    function heatwaveWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    /** 按本个体真实吹程与张角，从自己朝目标方向铺出扇面，数一数实际前扇里挤着几个非友方（含目标）。 */
    function heatwaveCoverage(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point), delta = CompanionBehavior.point(target.point).minus(from);
        if (delta.length() < 0.05) return 1;
        const reach = typeof capability.data.range === "number" ? capability.data.range : p("heatwave", "reach", world);
        const region = WorldGeometry.sector(from, delta, reach, p("heatwave", "angle", world));
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (region.contains(CompanionBehavior.point(other.point))) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("heatwave", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return heatwaveWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !heatwaveWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 16;
            if (!CompanionBehavior.status(context, target, "burn")) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "preferClusters", true))
                score += Math.min(24, (heatwaveCoverage(context, capability, target) - 1) * 10);
            return score;
        }
    });

    addPreferences("heatwave", {}, [
        field(pathOf("gale"), "疾风式", "boolean", {
            help: "开启：扇面更宽、推得更远、扫得更快，但威力 ×0.88、灼伤 ×0.85、冷却 −2 刻，用来把人整片推开。关闭（灼热式）：威力 ×1.12、灼伤 ×1.15，但扇面更窄、推得更近、冷却 +4 刻，用来灼烧。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 20, step: 1,
            help: "超过这个距离就不主动吹热风，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.preferClusters"), "优先扎堆目标", "boolean", {
            help: "开启：周围挤着别的敌人的目标排前，一道扇面能连带扫到他们；关闭则只按普通远程攻击排序。"
        })
    ]);
}
