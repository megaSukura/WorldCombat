/**
 * 广域破坏 / breakingswipe 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在扫击半径（`capability.data.range`）内；够不到交给共享接近逻辑，
 *   把身位收进去再甩尾。
 * 对谁出手：一个目标定方向，扫到的是它周围那片扇里的人；`ai.cluster`（默认开）打开时，目标附近还有别的
 *   敌人就优先——一次能压低多人。
 * 够不到怎么办：交给共享接近逻辑；进不到半径内就先不扫。
 * 放完之后：被掀开并被压低攻击的一圈人交回共享交战计划。
 */
namespace PokemonSkills {
    function breakingswipeWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    function breakingswipeCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.2) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("breakingswipe", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return breakingswipeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !breakingswipeWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 20 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true) && !target.friendly && breakingswipeCluster(context, target) >= 2) score += 16;
            return score;
        }
    });

    addPreferences("breakingswipe", {}, [
        field(pathOf("wide"), "广域式", "boolean", {
            help: "开启：扇形张角拉到 235°、半径 ×1.12，一次罩住一片人；代价是威力 ×0.85、起手 +2 刻、冷却 +8 刻。关闭（聚扫式）：威力 ×1.12，打得更重，但只扫到身前一道。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标进入这个距离内才主动甩尾；越大越早扫，但还没收进身位时容易扫空。"
        }),
        field(pathOf("ai.cluster"), "瞄准扎堆", "boolean", {
            help: "开启：目标身边 3.2 格内还有别的敌人时排得更前，一次压低多人；关闭则只按普通交战排序。"
        })
    ]);
}
