/**
 * 投掷 / fling —— AI 用途。
 *
 * 出手局面：手里有道具、目标是可见敌对的活体、且在 `ai.maxChase`（默认 12）格内时，作为远程攻击出手。
 * 空手时不参与候选。候选排序按道具的投掷价值：带状态或一窒效果的最优先，其次看投掷威力；轻道具排在最后。
 * 配置：多远考虑出手、驻守指令下是否离位。
 */
namespace CompanionBehavior {
    function flingHeld(context: WorldBehavior.Context): PokemonSkills.FlingItem | null {
        var access = CompanionBehavior.world(context);
        var actor = access.actor(CompanionBehavior.source(context).ref);
        if (!actor || String(actor.domain()) !== "cobblemon") return null;
        return PokemonSkills.flingItemOf(CobblemonCombat.pokemon(actor));
    }

    registerUse("fling", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!flingHeld(context)) return false;
            if (!target) return true;
            var goal: any = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref) return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 12);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            var held = flingHeld(context);
            if (!held) return 0;
            if (held.status || held.flinch) return 45;
            return held.power >= 90 ? 40 : held.power >= 60 ? 30 : 20;
        }
    });

    PokemonSkills.addPreferences("fling", { ai: { maxChase: 12, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "投掷距离", 4, 24, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
