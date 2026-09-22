/**
 * 劈开 / slash 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 5）格以内；更远交给共享接近逻辑。
 * 它是一记慢而准的重劈、暴击率高，适合收尾：`ai.finishLow`（默认开）在残血目标上加分，
 * 把这一刀当最后一击来用；关掉后只按普通中近距离斩击排序。
 * 放完之后：目标要么被劈开、要么掉了血，交回共享顺序决定继续贴身还是走位等冷却。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(slashId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.45) return 36;
            return 22;
        }
    });

    addPreferences(slashId, {}, [
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.finishLow", "优先收尾")
    ]);
}
