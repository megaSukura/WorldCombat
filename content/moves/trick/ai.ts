/**
 * 戏法 / trick —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑走过去。
 * AI 仍把戏法当作攻击用途并在敌人里筛选；手动目标可选友方，但那是玩家的自由，AI 不推荐。
 * 已知拒绝持有物交换的目标（黏着/查封）不出手，避免白费；换不动的目标不高估。
 * 排序按「这一换值不值」：目标持物而自己空手时最优先（净赚一件）；双方都有物次之（对调）。
 * 两边都空不给分——没有东西可换，空放毫无收益，只有自己持物可递出时才有一次净让渡（最低分）。
 * `ai.tradeOnly` 开启后只在至少一方持物时才出手；关闭时也仍不给两空局面任何分数。
 * `snap` 是本招配置（瞬时抓取），只收紧射程与起手，不改变候选排序。
 */
namespace PokemonSkills {
    function trickTargetHeld(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && trickHeldOf(world, actor) !== null;
    }
    function trickSelfHeld(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
        return !!actor && trickHeldOf(world, actor) !== null;
    }
    function trickRefuses(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && trickBlocked(world, actor);
    }

    CompanionBehavior.registerUse("trick", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (trickRefuses(context, target)) return false;
            if (CompanionBehavior.ai<boolean>(item, "tradeOnly", false))
                return trickTargetHeld(context, target) || trickSelfHeld(context);
            return true;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target) return 0;
            var held = trickTargetHeld(context, target), mine = trickSelfHeld(context);
            if (!held && !mine) return 0;
            if (held && !mine) return 60;
            if (held && mine) return 48;
            return mine ? 34 : 0;
        }
    });

    addPreferences("trick", { ai: { maxChase: 10, leaveStation: false, tradeOnly: false } }, [
        number("ai.maxChase", "心线距离", 3, 16, 1),
        flag("ai.leaveStation", "驻守时允许离位"),
        flag("ai.tradeOnly", "只在有物可换时出手")
    ]);
}
