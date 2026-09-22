/**
 * 抛物面充电 / paraboliccharge 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心的范围吸收盘。`available` 要求有可见、敌对、存活且落在
 *   `ai.maxChase`（默认 7）格内的目标；`ai.cluster` 打开时，目标身边 3.5 格内还挤着人就抬高 priority——
 *   同时吸到的目标越多，这一发回的血越多，所以它偏爱挤在一起的一圈人。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。够不到交给共享接近逻辑，射程就是抛物面半径。
 * 放完之后：交回共享顺序；它是一记近身吸场，不负责收尾。
 */
namespace CompanionBehavior {
    function parabolicchargeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    function parabolicchargeCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    registerUse("paraboliccharge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return parabolicchargeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !parabolicchargeWants(context, capability, target)) return 0;
            var base = 20;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return parabolicchargeCluster(context, target) >= 2 ? base + 18 : base;
        }
    });

    PokemonSkills.addPreferences("paraboliccharge", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("wide"), "广角抛物面", "boolean", {
            help: "开启：盘 ×1.25、电弧更多、可同时吸更多目标，但每道威力 ×0.82，靠人多回血。关闭（聚焦）：盘 ×0.78、每道 ×1.28、单发更重，用来打少而硬的目标。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动张盘，先朝目标走近。越大越愿意先接近再电。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先张盘，一次吸到一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
