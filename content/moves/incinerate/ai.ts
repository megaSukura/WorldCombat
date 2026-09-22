/**
 * 烧尽 / incinerate —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑。
 * 排序按“这一扫值不值”：目标携带树果或宝石时更优先（能真的烧掉并吃到爆燃追加）；空手目标当一记扇形火攻参与排序。
 * `ai.burnItems` 开启后只在目标携带可燃物时出手，作为专门的烧物手段；关闭则空手时也照常扫。
 * 扇形能一次覆盖多个目标，因此靠近的敌人越多，越值得在此时出手（由共享目标选择自然覆盖）。
 */
namespace CompanionBehavior {
    function incinerateTargetBurnable(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.incinerateBurnable(world, actor) !== null;
    }

    registerUse("incinerate", {
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
            if (CompanionBehavior.ai<boolean>(item, "burnItems", false)) return incinerateTargetBurnable(context, target);
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            return incinerateTargetBurnable(context, target) ? 50 : 26;
        }
    });

    PokemonSkills.addPreferences("incinerate", { ai: { maxChase: 10, leaveStation: false, burnItems: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.burnItems", "只对可燃物出手")
    ]);
}
