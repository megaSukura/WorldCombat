/**
 * 诡异咒语 / eeryspell —— AI 用途。
 *
 * 出手局面：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 14）格内时出手；焦点目标不受
 * 距离限制。对宝可梦抬到 40 优先级，因为只有它们才有最后招式的 PP 可抽；其他对象仍会在只剩本招或
 * 没有更好攻击时按普通远程招打出。够不到交给共享接近逻辑。
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
            return domain(context, target) === "cobblemon" ? 40 : 0;
        }
    });
    PokemonSkills.addPreferences("eeriespell", { ai: { maxChase: 14, leaveStation: false } },
        [PokemonSkills.number("ai.maxChase", "追击距离", 2, 32, 1), PokemonSkills.flag("ai.leaveStation", "驻守时离位")]);
}
