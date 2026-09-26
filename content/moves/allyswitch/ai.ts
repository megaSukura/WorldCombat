/** Rescue a weaker ally in greater danger, or retreat into a healthier ally's safer position. */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("allyswitch", { ai: { maxChase: 14, retreatBelow: 0.4, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 26, 1),
        PokemonSkills.number("ai.retreatBelow", "脱身血量", 0.1, 0.9, 0.05),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function allyswitchThreat(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (context.facts.mounted) return false;
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat || threat.health <= 0 || !threat.visible) return false;
        return distance(source(context).point, threat.point) <= ai<number>(item, "maxChase", 14);
    }
    function allyswitchPartner(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity | null {
        const self = source(context), range = item.data.range, nearby = context.facts.nearby as Entity[];
        let best: Entity | null = null, bestScore = 0;
        function clearance(subject: Entity): number {
            let result = 40;
            nearby.forEach(enemy => { if (!enemy.friendly && enemy.visible && enemy.health > 0) result = Math.min(result, distance(subject.point, enemy.point)); });
            return result;
        }
        const ownSafety = clearance(self), ownHp = ratio(self), escaping = ownHp <= ai<number>(item,"retreatBelow",.4);
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.health <= 0 || !other.visible || other.ref === self.ref || distance(other.point,self.point)>range) continue;
            const safety = clearance(other), hp = ratio(other);
            const pursued = nearby.some(enemy => !enemy.friendly && enemy.health > 0 && enemy.attacking === other.ref);
            const score = escaping
                ? (hp > ownHp + .1 && safety > ownSafety + 1 ? (safety-ownSafety)*8 + hp*20 : 0)
                : (pursued && hp < ownHp-.15 && safety < ownSafety-1 ? (ownHp-hp)*80 + (ownSafety-safety)*4 : 0);
            if (score > bestScore) { best = other; bestScore = score; }
        }
        return best;
    }

    registerUse("allyswitch", {
        protocols: ["world_combat:cover"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, item, _purpose, _target) { return allyswitchThreat(context, item); },
        selectTarget: function (context, item, _proposed) { return allyswitchThreat(context, item) ? allyswitchPartner(context, item) : null; },
        accepts: function (context, _item, target) {
            const self = source(context);
            return target.friendly && target.health > 0 && target.visible && target.ref !== self.ref;
        },
        approachTarget: function (context) { return source(context); },
        target: function (context, item, _target) { return allyswitchPartner(context, item); },
        priority: function (context, item, _target) {
            if (!allyswitchThreat(context, item) || !allyswitchPartner(context, item)) return 0;
            return ratio(source(context)) <= ai<number>(item, "retreatBelow", 0.4) ? 100 : 88;
        }
    });
}
