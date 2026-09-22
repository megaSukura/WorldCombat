/**
 * 秘密之力 / secretpower —— AI 用途。
 *
 * 出手局面：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 10）格内时贴身借力出手；
 * 焦点目标不受距离限制。开启 `ai.opening` 后，目标已经带着任一主异常时不再出手，把追加留给别人；
 * 关闭时照常补齐。够不到交给共享接近逻辑。
 */
namespace CompanionBehavior {
    function secretpowerControlled(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return status(context, target, "burn") || status(context, target, "paralysis") || status(context, target, "sleep")
            || status(context, target, "frozen") || status(context, target, "poison") || status(context, target, "toxic");
    }
    registerUse("secretpower", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!target || !target.health || target.health <= 0)
                return false;
            return !(ai(item, "opening", false) && secretpowerControlled(context, target));
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            var goal: any = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref)
                return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 10);
        }
    });
    PokemonSkills.addPreferences("secretpower", { ai: { maxChase: 10, leaveStation: false, opening: false } },
        [PokemonSkills.number("ai.maxChase", "追击距离", 2, 32, 1), PokemonSkills.flag("ai.leaveStation", "驻守时离位"),
            PokemonSkills.flag("ai.opening", "只打未有异常的目标")]);
}
