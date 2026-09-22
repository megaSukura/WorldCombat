/**
 * 杂技 / acrobatics —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 * 自身空手时这一翻翻倍，排序最优先；带着道具时只当普通飞行撞击参与排序。
 * `ai.emptyOnly` 开启后只在自身空手时出手，专门吃翻倍的那一档；关闭则带物时也照常补刀。
 * `sweep` 属于本招配置（突进更远、本击略轻、收招更久）。
 */
namespace CompanionBehavior {
    function acrobaticsBare(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
        return !!actor && PokemonSkills.acrobaticsHeldOf(world, actor) === null;
    }

    registerUse("acrobatics", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.ai<boolean>(item, "emptyOnly", false) && !acrobaticsBare(context)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 12);
        },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target) return 0;
            return acrobaticsBare(context) ? 42 : 20;
        }
    });

    PokemonSkills.addPreferences("acrobatics", { ai: { maxChase: 12, leaveStation: false, emptyOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.emptyOnly", "只在空手时出手")
    ]);
}
