/**
 * 疯狂伏特 / wildcharge 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。它是一次带电冲锋，价值不只在伤害，
 * 还在那一记传导——所以优先湿透的敌人（电流在湿身上走得更实、还会被必然传导）；
 * `ai.spareParalyzed`（默认开）把已经麻痹的目标明显排后，把电流留给还没被挂上的人，但仍保留补伤害的用处，不再硬跳过。
 * 自己湿透时反噬更重：生命已经偏低时明显降低评分，不拿命去漏电。过载与否由玩家配置承担，不由 AI 选项重复。
 * 放完之后：这是一记反噬不轻的招，伙伴不会专门追击，交回共享目标顺序。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("wildcharge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 26;
            // 湿敌优先：湿身吃更多威力，还会被必然传导一次。
            if (target.wet) score += 10;
            if (CompanionBehavior.status(context, target, "paralysis"))
                score = CompanionBehavior.ai<boolean>(capability, "spareParalyzed", true) ? 8 : 18;
            // 自己湿透漏电更狠；血少时明显降低，不用残血去赌这一趟回路。
            if (self.wet && CompanionBehavior.ratio(self) < 0.4) score -= 20;
            return Math.max(0, score);
        }
    });

    addPreferences("wildcharge", {}, [
        field(pathOf("overload"), "过载", "boolean", {
            help: "开启：电流全开，威力、麻痹概率、击退与火花都升，但回路反噬更重、起手更长；关闭：控流式，压低威力与反噬、起手更短。"
        }),
        field(pathOf("ai.maxChase"), "冲锋距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才起冲；调小只贴脸冲，调大愿意从更远处助跑。"
        }),
        field(pathOf("ai.spareParalyzed"), "不重复麻痹", "boolean", {
            help: "开启：已经麻痹的目标明显降低优先，把电流留给还没被挂上的人，但仍可在没有更好目标时补一记伤害；关闭：按普通攻击候选一起竞价。"
        })
    ]);
}
