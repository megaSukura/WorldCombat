/**
 * 掉包 / switcheroo —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑走过去。
 * 排序按「这一换值不值」与「冒险能不能承受」：目标持物而自己空手时最优先；双方都有物次之；只有自己持物时再次之。
 * `ai.tradeOnly` 开启后只在至少一方持物时才出手；关闭则两边都空时也照常擦身而过（多半白跑）。
 * 穿身而过属于本招配置（换手后把自己送进目标身后），只改变落位，不改变候选排序。
 */
namespace PokemonSkills {
    function switcherooTargetHeld(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && switcherooHeldOf(world, actor) !== null;
    }
    function switcherooSelfHeld(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
        return !!actor && switcherooHeldOf(world, actor) !== null;
    }

    CompanionBehavior.registerUse("switcheroo", {
        protocols: ["world_combat:attack"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "tradeOnly", false))
                return switcherooTargetHeld(context, target) || switcherooSelfHeld(context);
            return true;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target) return 0;
            var held = switcherooTargetHeld(context, target), mine = switcherooSelfHeld(context);
            if (held && !mine) return 62;
            if (held && mine) return 50;
            return mine ? 36 : 22;
        }
    });

    addPreferences("switcheroo", { ai: { maxChase: 10, leaveStation: false, tradeOnly: false } }, [
        number("ai.maxChase", "掠影距离", 3, 16, 1),
        flag("ai.leaveStation", "驻守时允许离位"),
        flag("ai.tradeOnly", "只在有物可换时出手")
    ]);
}
