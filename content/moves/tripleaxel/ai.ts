/**
 * 三旋击 / tripleaxel 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 4）格以内；这是近身招，更远先走近。
 * 对谁出手：当前威胁；横扫式下身旁的目标也会一起被扫到，但排序仍以当前目标为准。
 * 放完之后：三脚踢完交回共享交战计划；带着冷却时不会重复起旋。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(tripleaxelId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            return 24;
        }
    });

    addPreferences(tripleaxelId, {}, [
        flag("widen", "横扫"),
        number("ai.maxChase", "出手距离", 2, 8, 1)
    ]);
}
