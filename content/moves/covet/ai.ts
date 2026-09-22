/**
 * 渴望 / covet —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 * 排序按“这一贴值不值”：自己空手而目标持物时最优先（能真的换手并降攻）；目标持物次之；其余当一记会降攻的
 * 普通近身打击参与排序。`ai.stealOnly` 开启后只在目标持物时出手，作为专门的夺取手段；关闭则空手时也照常压上去。
 * `polite` 属于本招配置（更轻但降攻更深），不影响候选排序。
 */
namespace CompanionBehavior {
    function covetTargetHeld(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.covetHeldOf(world, actor) !== null;
    }
    function covetSelfEmpty(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
        return !!actor && PokemonSkills.covetHeldOf(world, actor) === null;
    }

    registerUse("covet", {
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
            if (CompanionBehavior.ai<boolean>(item, "stealOnly", false)) return covetTargetHeld(context, target);
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            var held = covetTargetHeld(context, target);
            if (!held) return 24;
            return covetSelfEmpty(context) ? 58 : 44;
        }
    });

    PokemonSkills.addPreferences("covet", { ai: { maxChase: 12, leaveStation: false, stealOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.stealOnly", "只对有物者出手")
    ]);
}
