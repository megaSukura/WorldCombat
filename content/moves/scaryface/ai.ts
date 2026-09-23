/** 优先拖慢尚未被吓住的快速威胁，按招式距离接近。 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("scaryface", { ai: { maxChase: 9, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function scaryfaceEligible(context: WorldBehavior.Context, threat: Entity): boolean {
        return threat.health > 0 && !threat.friendly && !status(context, threat, "feared");
    }

    function scaryfaceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 9)) return false;
        return scaryfaceEligible(context, threat);
    }

    registerUse("scaryface", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || scaryfaceWants(context, item, target); },
        accepts: function (context, _item, target) {
            return scaryfaceEligible(context, target);
        },
        priority: function (context, item, target) {
            if (!target || !scaryfaceWants(context, item, target)) return 0;
            const self = source(context);
            const faster = typeof target.speed === "number" && typeof self.speed === "number" && target.speed > self.speed ? 12 : 0;
            const provoked = self.hurtAgo < 40 ? 8 : 0;
            return Math.min(90, 52 + faster + provoked);
        }
    });
}
