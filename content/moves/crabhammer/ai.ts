/**
 * 蟹钳锤 / crabhammer 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 6）之内；更远交给共享接近逻辑。
 * 对谁出手：这是一次很慢很重的下砸，前摇长、能被躲开。`ai.crack`（默认开）在大个子目标（身高 1.6 以上）
 *   身上抬高一档——裂甲在耐久敌人身上最值；目标身边还聚着其他敌人时也抬高一档，前扇水花能一次掀到后排。
 *   小目标、散开的敌人按普通近身攻击排序。
 * 够不到怎么办：出手距离交给 `reach`，共享任务贴进钳子范围再举钳。
 * 放完接什么：交回共享交战计划；被砸中的人若能站住就带着物防被敲裂的架势，接下来由共享顺序决定追击还是脱离。
 */
namespace PokemonSkills {
    /** 目标身边聚着几个还活着的其他敌人；前扇水花在聚堆处收益最高。 */
    function crabhammerCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let others = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - target.point[0], dz = other.point[2] - target.point[2];
            if (Math.sqrt(dx * dx + dz * dz) <= 2.5) others++;
        }
        return others;
    }

    CompanionBehavior.registerUse(crabhammerId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (gap > capability.data.range) return 0;
            let base = 24;
            // 目标身边聚着其他敌人时，前扇水花能一次掀到后排，收益更高。
            if (crabhammerCluster(context, target as CompanionBehavior.Entity) >= 1) base += 8;
            if (!CompanionBehavior.ai<boolean>(capability, "crack", true)) return base;
            // 裂甲在身高 1.6 以上的耐久目标身上最值。
            return (target.height || 1.4) >= 1.6 ? base + 10 : base;
        }
    });

    addPreferences(crabhammerId, {}, [
        field(pathOf("crack"), "裂甲式", "boolean", {
            help: "开启：砸中时目标物防 −1 级、水环半径 ×1.1，代价是砸击威力 ×0.94、前摇 +2 刻、冷却 +6 刻；关闭：重锤式，砸击威力 ×1.06、水环更小、出手更快，代价是没有任何破甲效果。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动举钳，先走近；越大越愿意从稍远处先手，但前摇更长、目标更容易让开落点。"
        }),
        field(pathOf("ai.crack"), "对大个子优先", "boolean", {
            help: "开启：身高 1.6 以上的目标优先挨这一砸，裂甲与地面水环在它们身上最值；关闭：只按普通近身攻击排序。"
        })
    ]);
}
