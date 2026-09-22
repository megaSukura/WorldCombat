/**
 * 虫咬 / bugbite —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑。
 * 排序按“这一咬值不值”：目标持有树果时更优先（能吃到回复、强化或解异常）；空手目标当一记普通接触咬击参与排序。
 * `ai.berryOnly` 开启后只在目标持有树果时出手，作为专门的吃果手段；关闭则空手时也照常补刀。
 * `devour` 属于本招配置（更重吸收、更轻这一口），不改变候选排序。
 */
namespace CompanionBehavior {
    function bugbiteTargetBerry(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.bugbiteBerryOf(world, actor) !== null;
    }

    registerUse("bugbite", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "berryOnly", false)) return bugbiteTargetBerry(context, target);
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            return bugbiteTargetBerry(context, target) ? 52 : 24;
        }
    });

    PokemonSkills.addPreferences("bugbite", { ai: { maxChase: 10, leaveStation: false, berryOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.berryOnly", "只对携带树果者出手")
    ]);
}
