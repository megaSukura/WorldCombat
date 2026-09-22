/**
 * 戏法防守 的伙伴 AI 用途：这是这招自己的一套出手计划——在对手铺变化招式之前先把符阵织起来。
 *
 * 什么局面有意义：有可见威胁、自己还没被符阵罩住，且它在 ai.maxChase 以内；
 *   ai.opening=受压时织阵（默认）只在对手正攻击自己或主人、或自己刚被打过时织；
 *   =随时时见威胁就先织上，当常备防御。
 * 对谁出手：自己；符阵会以自身为锚顺手把队友一起罩住，所以不需要选中队友。
 * 候选之间怎么排：身边有友方还没被符阵罩住时排得更前（58）——织阵是为了护住这一片；
 *   只剩自己需要时 48；0 或负值仍可由共享顺序兜底选中。
 * 够不到怎么办：不需要够——威胁太远就先不理会，等它靠近。
 * 放完之后：符阵替自己与队友挡下敌方变化招式，交回共享顺序继续战斗；阵还在时不再重复，拨挡次数用尽即收。
 */
namespace CompanionBehavior {
    function craftyShieldAllyExposed(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) > 6) continue;
            if (!CompanionBehavior.status(context, other, "craftyshield")) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("craftyshield", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "craftyshield")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 13)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "incoming") !== "incoming") return true;
            const owner = context.facts.owner;
            return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context) { return craftyShieldAllyExposed(context) ? 58 : 48; }
    });

    PokemonSkills.addPreferences("craftyshield", { weave: 1, ai: { maxChase: 13, opening: "incoming", leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 24, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["incoming", "anytime"], ["受压时织阵", "随时"]),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
