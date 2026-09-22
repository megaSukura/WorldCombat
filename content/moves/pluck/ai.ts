/**
 * 啄食 / pluck —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 14）格内；更远交给共享接近逻辑。
 * 长喙走廊能啄到抬升范围内的目标，因此浮空或站高处的对手也在候选内（只要在走廊的高度带里）。
 * 排序按“这一啄值不值”：目标持有树果时更优先（能吃到回复、强化或解异常）；空手目标当一记远程啄击参与排序。
 * `ai.berryOnly` 开启后只在目标持有树果时出手，作为专门的吃果手段；关闭则空手时也照常啄。
 * `swoop` 属于本招配置（更远更高但更轻），不改变候选排序。
 */
namespace CompanionBehavior {
    function pluckTargetBerry(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.pluckBerryOf(world, actor) !== null;
    }

    registerUse("pluck", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 14);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "berryOnly", false)) return pluckTargetBerry(context, target);
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            return pluckTargetBerry(context, target) ? 52 : 22;
        }
    });

    PokemonSkills.addPreferences("pluck", { ai: { maxChase: 14, leaveStation: false, berryOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 18, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.berryOnly", "只对携带树果者出手")
    ]);
}
