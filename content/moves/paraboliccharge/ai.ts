/**
 * 抛物面充电 / paraboliccharge 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心的范围吸收盘。`available` 要求有可见、敌对、存活、自己电得动
 *   （非地面系免疫）且落在 `ai.maxChase`（默认 7）格内的目标。
 * 对谁出手：当前威胁；友方、倒下、不可见、以及电属性免疫的目标都不接受。
 * 收益估计：`ai.cluster` 打开时按**自身电盘内**（不是目标身边）可电的敌人数估收益——一次真能电到几个；
 *   自身生命低于 `ai.healBelow`（默认 0.8）时抬档，受伤且周围确有多人才优先张盘，远处扎堆不误估。
 * 够不到交给共享接近逻辑，射程就是抛物面半径。放完之后：交回共享顺序；它是一记近身吸场，不负责收尾。
 */
namespace CompanionBehavior {
    /** 电属性免疫（地面系）：这类目标既不会被电到，也不该被算作回血来源。 */
    function parabolicchargeImmune(target: CompanionBehavior.Entity): boolean {
        const types = target.facts && target.facts.types;
        if (!types || !types.length) return false;
        for (let index = 0; index < types.length; index++) if (CobblemonCombat.typeEffectiveness("electric", types[index]) === 0) return true;
        return false;
    }

    function parabolicchargeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible || parabolicchargeImmune(target)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    /** 以自身为圆心、本次电盘半径内真实可电的敌人数；只看自己够得着的一圈，远处扎堆不算。 */
    function parabolicchargeDish(context: WorldBehavior.Context, radius: number): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 0, self = CompanionBehavior.source(context).point;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || parabolicchargeImmune(other)) continue;
            if (CompanionBehavior.distance(other.point, self) <= radius) count++;
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
            return !target.friendly && target.health > 0 && target.visible && !parabolicchargeImmune(target);
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !capability || !parabolicchargeWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            var count = parabolicchargeDish(context, capability.data.range);
            var injured = CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.8);
            var score = 14 + Math.min(3, count) * 5;
            if (injured) score += 12;
            if (count >= 2) score += injured ? 8 : 2;
            return score;
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
            help: "开启后，自身体周本次电盘内有 2 个以上可电的敌人时优先张盘，一次吸到一圈；关闭则只按普通攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把抛物面充电当续航手段优先出手；越高越早靠它回血。"
        })
    ]);
}
