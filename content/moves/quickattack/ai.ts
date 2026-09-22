/**
 * 电光一闪 / quickattack 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 7）格内。它是一记极便宜的先制，
 *   所以只要够得着就愿意出：走位到的距离内随手抢一下，是它的本职；更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 优先次序：目标残血且开启 `ai.finish` 时抬到最高（62）——它出手最快，正好用来补最后一下；
 *   若目标的矛头正对着自己（`attacking` 是自己）再加一点，抢在它之前打断节奏；否则普通先制候选（24）。
 * 够不到怎么办：射程由 `dash` 决定，共享任务把身位收进冲刺距离后再冲。
 * 放完之后：交回共享交战计划；冷却很短，可以反复用来起手和收尾。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(quickattackId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 38;
            if (target.attacking === self.ref) score += 8;
            return score;
        }
    });

    addPreferences(quickattackId, {}, [
        field(pathOf("eager"), "抢拍式", "boolean", {
            help: "开启：起手再快 1 刻（最低瞬发）、冲刺更远 7%，但这一下轻一成、冷却多 4 刻。关闭：冲得扎实、冷却更短。一个换更快更远，一个换更重更省。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "对手离自己这么远以内才主动冲刺；本招冲刺距离短，设大也常常要先走近。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一下（它出手最快）；关闭：只按普通先制候选参与排序。"
        })
    ]);
}
