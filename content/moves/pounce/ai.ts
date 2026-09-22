/**
 * 虫扑 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，在 `ai.maxChase` 之内。它是一记中距离的扑击，价值在于贴上去并缠住对方。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。`ai.preferFresh` 开启时，已经带着 clung 身份的目标排后。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近；它负责把距离一口气缩掉，不负责远程骚扰。
 * 放完之后：目标被缠身、速度等级下降，交回共享交战计划；残血目标让这一扑更有收尾价值。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("pounce", {
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
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 19;
            if (CompanionBehavior.ai<boolean>(capability, "preferFresh", true) && CompanionBehavior.status(context, target, "clung")) score -= 12;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 10;
            if (CompanionBehavior.fleeing(context, target)) score += 8;
            return score;
        }
    });

    addPreferences("pounce", {}, [
        field(pathOf("cling"), "缠身", "boolean", {
            help: "开启：缠得更久、掉速更深、把腿别住更久，但单发更轻、收招与冷却更久。关闭：一记更重更干脆的蹬扑，缠身很短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离就不主动扑击，先走近。越大越愿意从更远处扑上去。"
        }),
        field(pathOf("ai.preferFresh"), "先扑没缠住的", "boolean", {
            help: "开启：已经带着 clung 身份的目标排到最后，先换一个新目标缠；关闭：当普通近身候选排序。"
        })
    ]);
}
