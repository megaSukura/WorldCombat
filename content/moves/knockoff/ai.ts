/**
 * 拍落 / knockoff —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 * 排序按“这一拍值不值”：目标携带持有物时最优先（既加伤害又封掉它的道具）；空手目标当普通近身重击参与排序。
 * `ai.denyItems` 开启后只在目标持物时出手，作为专门的封物手段；关闭则空手时也照常补刀。
 * `far` 属于本招配置（挑得更远、收招更久）。
 */
namespace CompanionBehavior {
    function knockoffTargetHeld(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.knockoffHeldOf(world, actor) !== null;
    }

    registerUse("knockoff", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 12);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "denyItems", true)) return knockoffTargetHeld(context, target);
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            return knockoffTargetHeld(context, target) ? 55 : 22;
        }
    });

    PokemonSkills.addPreferences("knockoff", { ai: { maxChase: 12, leaveStation: false, denyItems: true } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.denyItems", "只对持物者出手")
    ]);
}
