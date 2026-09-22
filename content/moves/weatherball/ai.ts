/**
 * 气象球 / weatherball —— AI 用途。
 *
 * 出手局面：目标是可见敌对的活体、且在 `ai.maxChase`（默认 16）格内时，作为远程攻击出手；
 * 天色可收（下雨、雷雨或晴空强日照）时 priority 抬到 55，优先把天气转化为输出；无天气时只有 25。
 * 配置：多远考虑出手、驻守指令下是否离位。
 */
namespace CompanionBehavior {
    function weatherballCharged(context: WorldBehavior.Context): boolean {
        var access = CompanionBehavior.world(context);
        var point = CompanionBehavior.point(CompanionBehavior.source(context).point);
        return PokemonSkills.weatherballSkyAt(access, point) !== "clear";
    }

    registerUse("weatherball", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!target) return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 16);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            return weatherballCharged(context) ? 55 : 25;
        }
    });

    PokemonSkills.addPreferences("weatherball", { ai: { maxChase: 16, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "投掷距离", 4, 24, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
