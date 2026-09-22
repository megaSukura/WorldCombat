/**
 * 硬撑 / facade 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase` 之内。它是一招贴身冲撞，
 * 但只有在**自己带着异常**时才把威力翻倍，所以带着异常时 priority 抬到 45，让它在多个近战候选里先被选中；
 * 没带异常时也照常出手（12），只是不翻倍。够不到就交给共享接近逻辑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("facade", {
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
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            var self = CompanionBehavior.source(context);
            var afflicted = CompanionBehavior.status(context, self, "burn") || CompanionBehavior.status(context, self, "poison")
                || CompanionBehavior.status(context, self, "paralysis") || CompanionBehavior.status(context, self, "frozen");
            return afflicted ? 45 : 12;
        }
    });

    addPreferences("facade", {}, [
        field(pathOf("brutal"), "变本加厉", "boolean", {
            help: "开启：威力 ×1.15、顶得更远，但命中时按自身最大生命的 6% 反噬，收招与冷却各多 2／4 刻。关闭：不反噬，起手更干净。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动冲撞，先走近。越大追击越执着，也越容易在开阔地空撞。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为硬撑离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
