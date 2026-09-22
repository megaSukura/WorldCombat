/**
 * 自然之恩 / naturalgift —— AI 用途。
 *
 * 出手局面：带着一颗表里的树果、目标是可见敌对的活体、且在 `ai.maxChase`（默认 6）格内时，作为近身攻击出手；
 * 空手或携带的不是树果时这招没有力量，直接不参与候选。焦点目标不受距离限制，由共享接近逻辑先走近。
 * 配置：多远考虑出手、驻守指令下是否离位。
 */
namespace CompanionBehavior {
    /** 现场读取施法者手里的树果：有可用的树果才值得出手。 */
    function naturalgiftHeld(context: WorldBehavior.Context): boolean {
        var access = CompanionBehavior.world(context);
        var actor = access.actor(CompanionBehavior.source(context).ref);
        if (!actor || String(actor.domain()) !== "cobblemon") return false;
        return !!PokemonSkills.naturalgiftGiftOf(CobblemonCombat.pokemon(actor));
    }

    registerUse("naturalgift", {
        protocols: ["world_combat:attack"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!naturalgiftHeld(context)) return false;
            if (!target) return true;
            var goal: any = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref) return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 6);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return !target.friendly && target.health > 0 && target.visible;
        }
    });

    PokemonSkills.addPreferences("naturalgift", { ai: { maxChase: 6, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 16, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
