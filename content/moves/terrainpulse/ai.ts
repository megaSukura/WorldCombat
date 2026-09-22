/**
 * 大地波动 / terrainpulse —— AI 用途。
 *
 * 出手局面：目标是可见敌对的活体、且在 `ai.maxChase`（默认 14）格内时，作为远程攻击出手。
 * 接地且脚下有场地时 priority 抬到 60，优先把场地当成武器；悬空或无场地时只有 20。
 * 配置：多远考虑出手、驻守指令下是否离位。
 */
namespace CompanionBehavior {
    function terrainpulseCharged(context: WorldBehavior.Context): boolean {
        var subject = CompanionBehavior.source(context);
        if (subject.grounded === false) return false;
        var access = CompanionBehavior.world(context);
        return !!PokemonSkills.terrainpulseTerrainAt(access, CompanionBehavior.point(subject.point));
    }

    registerUse("terrainpulse", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!target) return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 14);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            return terrainpulseCharged(context) ? 60 : 20;
        }
    });

    PokemonSkills.addPreferences("terrainpulse", { ai: { maxChase: 14, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "推波距离", 3, 24, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
