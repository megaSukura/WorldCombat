/**
 * 冰球 / iceball 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 9）格以内；更远交给共享接近逻辑。
 * 对谁出手：当前威胁；冰球会自己回头，所以只要目标还在飞行距离内就会连续撞上去。
 * 放完之后：施法者在这几秒里定住不动，是它最脆的窗口；碎开后会交回共享交战计划，带着冷却时不会重复抛。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(iceballId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            return 23;
        }
    });

    addPreferences(iceballId, {}, [
        flag("thick", "厚壳式"),
        number("ai.maxChase", "出手距离", 2, 14, 1)
    ]);
}
