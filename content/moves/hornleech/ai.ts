/**
 * 木角 / hornleech 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 10）格内。它是一记带位移的接触
 * 冲撞，`priority` 在自身血量低于 `ai.healBelow`（默认 0.9）时抬一档，把"冲过去顺便回血"当作续航手段；
 * 目标在近身或正在拉开距离时优先——冲过去正好把人留在身前。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。够不到交给共享接近逻辑，射程就是冲出距离。
 * 放完之后：贯穿式最多扎中两个目标，交回共享顺序。
 */
namespace CompanionBehavior {
    registerUse("hornleech", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            var dist = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (dist > CompanionBehavior.ai<number>(capability, "maxChase", 10)) return 0;
            var score = 20;
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.9)) score += 16;
            if (CompanionBehavior.fleeing(context, target)) score += 10;
            else if (dist <= capability.data.range) score += 6;
            return score;
        }
    });

    PokemonSkills.addPreferences("hornleech", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("gore"), "贯穿式", "boolean", {
            help: "开启：冲得更远、可穿过一个目标继续扎第二个，但每个目标吸得更少、收招更慢，适合穿阵。关闭：只扎一个、吸得足、收得快，适合续航。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动冲撞，先走近。越大追得越执着，也越容易冲过头。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把木角当续航手段优先出手；越高越早开始靠它回血。"
        })
    ]);
}
