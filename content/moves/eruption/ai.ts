/**
 * 喷火 / eruption 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一个以自身为中心、威力随自己血量走的满血爆发。`available` 要求有可见、敌对、存活
 * 且在 `ai.maxChase`（默认 8）格内的目标；`priority` 随自己血量越满、目标身边越挤而抬高——那正是这一发最值
 * 的时候。开了 `ai.cluster` 时身边挤着两个以上敌人再抬一档；够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function eruptionWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    function eruptionCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
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
            if (CompanionBehavior.ai<boolean>(capability, "healthy", true)) score += Math.round(ratio * 18);
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return score;
            return eruptionCluster(context, target) >= 2 ? score + 18 : score;
        }
    });

    addPreferences("eruption", {}, [
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动靠近，先在喷发半径外待命。越大越愿意先朝目标接近再炸。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先喷火，一次罩住一圈；关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.healthy"), "满血时优先", "boolean", {
            help: "开启后，伙伴在自己血量越满时越倾向喷火（威力随剩余血量走）；关闭则不看血线，什么时候都可能用。"
        })
    ]);
}
