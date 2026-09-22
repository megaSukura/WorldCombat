/**
 * 分担痛楚 / painsplit —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，在 `ai.maxChase`（默认 10）格内，并且它当前的生命绝对值
 * 比自己多出至少 `ai.margin`（默认 0.1，按双方较大的最大生命折算）——只有对方比你自己血更多时，拉平才是赚的。
 * 差得越多，排序越靠前。自己反而更健康时不参与候选（多半会把对手治好、把自己抽走），交给其他招；
 * 只剩本招时也不硬放，符合「只有……才」。
 * 对谁出手：非友方、活着、可见的目标；不需要贴身，牵线在射程内直接生效。
 */
namespace PokemonSkills {
    /** 目标当前生命比自己多出的幅度，按双方较大的最大生命折算；负数表示目标更少。 */
    function painsplitGain(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        var self = CompanionBehavior.source(context);
        var reference = Math.max(1, Math.max(self.maximum || 0, target.maximum || 0));
        return (target.health - self.health) / reference;
    }

    CompanionBehavior.registerUse("painsplit", {
        protocols: ["world_combat:attack"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(item, "maxChase", 10)) return false;
            return painsplitGain(context, target) >= CompanionBehavior.ai<number>(item, "margin", 0.1);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target) return 0;
            var gain = painsplitGain(context, target);
            if (gain < CompanionBehavior.ai<number>(item, "margin", 0.1)) return 0;
            return Math.max(1, Math.min(100, Math.round(30 + gain * 70)));
        }
    });

    addPreferences("painsplit", { ai: { maxChase: 10, margin: 0.1, leaveStation: false } }, [
        number("ai.maxChase", "牵线距离", 3, 16, 1),
        number("ai.margin", "拉平下限", 0, 0.5, 0.05),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
