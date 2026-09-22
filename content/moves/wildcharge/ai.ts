/**
 * 疯狂伏特 / wildcharge 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。它是一次带电冲锋，价值不只在伤害，
 * 还在那一记概率麻痹，所以 `ai.spareParalyzed`（默认开）让伙伴避开已经麻痹的目标——把电流留给还没被挂上的人；
 * 关闭后只按共享顺序竞价。过载与否由玩家配置承担，不由 AI 选项重复。
 * 放完之后：这是一记反噬不轻的招，伙伴不会专门追击，交回共享目标顺序。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("wildcharge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            return !(CompanionBehavior.ai<boolean>(capability, "spareParalyzed", true)
                && CompanionBehavior.status(context, target, "paralysis"));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const paralyzed = CompanionBehavior.status(context, target, "paralysis");
            if (!paralyzed) return 26;
            return CompanionBehavior.ai<boolean>(capability, "spareParalyzed", true) ? 0 : 18;
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
            help: "开启：已经麻痹的目标不再优先放电，把电流留给还没被挂上的人；关闭：只按共享顺序竞价。"
        })
    ]);
}
