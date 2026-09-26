/** Lock a visible mobile threat once, using the same resolved range as execution. */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("lockon", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function lockonWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, self, "lockon")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("lockon", {
        protocols: ["world_combat:control"],
        reach: function (_context,item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || lockonWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !lockonWants(context, item, target)) return 0;
            const self = source(context), owner = context.facts.owner;
            if (fleeing(context, target)) return 88;
            return target.attacking === self.ref || !!owner && target.attacking === owner.ref ? 82 : 76;
        }
    });
}
