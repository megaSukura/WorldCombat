/**
 * 啄食 / pluck —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 14）格内；更远交给共享接近逻辑。
 * 对谁出手：目标持有树果时最优先（能吃到回复、强化或解异常）；浮空或站高处、横瞄够不到的对手次之
 *   （仰起喙在 reach 之外再够 lift 格正是本招的用法）；空手平地目标当一记普通远程啄击参与排序。
 * 保持原地可触及才出手：本招本身不扑进也不回撤，靠近到射程由共享接近逻辑完成，不需要冲入近战。
 * `ai.berryOnly` 开启后只在目标持有树果时出手，作为专门的吃果手段；关闭则空手时也照常啄。
 * `outreach` 属于本招配置（更远更高但更轻），不改变候选排序。
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
            var self = CompanionBehavior.source(context);
            var score = 22;
            if (pluckTargetBerry(context, target)) score = 52;
            if (target.point[1] - self.point[1] > 1.0) score += 10;
            return score;
        }
    });

    PokemonSkills.addPreferences("pluck", { ai: { maxChase: 14, leaveStation: false, berryOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 18, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.berryOnly", "只对携带树果者出手")
    ]);
}
