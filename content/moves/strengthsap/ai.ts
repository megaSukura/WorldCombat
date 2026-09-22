/**
 * 吸取力量 / strengthsap 的伙伴 AI 用途：这是这招自己的一套出手计划——贴身把强敌的力气按住，顺手回一口血。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内。它既是续航（按对手物攻回血），又是削弱（对手物攻 −1），
 *   所以血量低于 ai.healBelow 时优先抬一档当回血用；平时把它当一记近身削弱。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。
 * 够不到怎么办：reach 就是抽取距离（本族很短），超出先走近；抽不到就先让给远程招。
 * 放完之后：自己回了一口、对手物攻被按住，交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    registerUse("strengthsap", {
        protocols: ["world_combat:attack", "world_combat:heal"],
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
            if (!target || !capability) return 0;
            const dist = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (dist > capability.data.range) return 0;
            const self = CompanionBehavior.source(context);
            const hurt = CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "healBelow", 0.8);
            if (CompanionBehavior.status(context, target, "strength_sapped") && !hurt) return 0;
            let score = 30;
            if (hurt) score += 18;
            if (!CompanionBehavior.status(context, target, "strength_sapped")) score += 6;
            return score;
        }
    });

    PokemonSkills.addPreferences("strengthsap", { ai: { maxChase: 6, healBelow: 0.8, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 14, 1),
        PokemonSkills.number("ai.healBelow", "回血优先阈值", 0.3, 1, 0.05),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
