/**
 * 诡异咒语 / eeriespell —— AI 用途。
 *
 * 出手局面：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 14）格内时出手。
 * 优先挑正在出手、贴近施加压力的敌人（本作没有逐目标的攻击频率表，正在攻击与贴身是当前可读的代理）；
 * 目标已带着「诡异」且还远未到期时降低优先级，避免把咒念浪费在同一层干扰上。
 * 宝可梦身份只作为「还能扣上一招 PP」的附加评分，不再决定是否加优先。
 */
namespace CompanionBehavior {
    registerUse("eeriespell", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            return !!target && !!target.health && target.health > 0;
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            var goal: any = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref)
                return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 14);
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target)
                return 0;
            var score = 0;
            if (target.attacking)
                score += 40;
            if (distance(source(context).point, target.point) <= 4)
                score += 15;
            if (status(context, target, "eerie"))
                score -= 30;
            if (domain(context, target) === "cobblemon")
                score += 10;
            return Math.max(0, score);
        }
    });
    PokemonSkills.addPreferences("eeriespell", { ai: { maxChase: 14, leaveStation: false } },
        [PokemonSkills.number("ai.maxChase", "追击距离", 2, 32, 1), PokemonSkills.flag("ai.leaveStation", "驻守时离位")]);
}
