/**
 * 水蒸气 / hydrosteam 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 13）格内；更远交给共享接近逻辑。
 * 对谁出手：一条向前张开的扇面，目标越靠近正前方越值；日照越强这一喷越强（`context.facts.sunlight` 高于
 *   0.85 时抬优先级）。`ai.avoidFrozen`（默认开）打开时，冻住的目标排后——蒸汽会替它解冻，等于帮了它。
 *   够不到就靠近；放完之后交回共享交战计划。
 */
namespace CompanionBehavior {
    function hydrosteamWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    CompanionBehavior.registerUse(PokemonSkills.hydrosteamId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return hydrosteamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !hydrosteamWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            let score = 15;
            const sun = typeof context.facts.sunlight === "number" ? context.facts.sunlight as number : 0;
            if (sun >= 0.85) score += 12;
            if (CompanionBehavior.ai<boolean>(capability, "avoidFrozen", true) && CompanionBehavior.status(context, target, "frozen"))
                score -= 10;
            return score;
        }
    });

    const hydrosteamChase = PokemonSkills.number("ai.maxChase", "出手距离", 4, 22, 1);
    hydrosteamChase.help = "超过这个距离就不主动出手，先走近；越大越愿意在更远处先喷一记。";
    const hydrosteamAvoid = PokemonSkills.flag("ai.avoidFrozen", "避开冻住的目标");
    hydrosteamAvoid.help = "开启：冻住的目标排后，因为蒸汽会替它解冻（等于帮了它）；关闭则不看冰冻状态、按普通远程攻击排序。";

    PokemonSkills.addPreferences(PokemonSkills.hydrosteamId, { ai: { maxChase: 13, avoidFrozen: true } },
        [hydrosteamChase, hydrosteamAvoid]);
}
