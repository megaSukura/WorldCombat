/**
 * Conversion AI use.
 *
 * Meaningful only while the lead move's type is not one the body already has: the whole move is a
 * gainful reorder, never a no-op. It is a self preparation, so it is offered through the shared
 * `world_combat:fortify` goal; it is offered when an engagement makes the type change useful. The lead type is read through a decision-scoped probe.
 */
namespace CompanionBehavior {
    registerFact("world_combat:conversion-lead", function (_access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return "";
        var pokemon = CobblemonCombat.pokemon(actor), lead = pokemon.move(0);
        return lead ? String(lead.type()) : "";
    });

    registerUse("conversion", {
        protocols: ["world_combat:fortify"],
        available: function (context) {
            if (context.facts.mounted || !context.senses["world_combat:threat"]) return false;
            var self = source(context), facts = pokemonFacts(context, self);
            if (!facts || !facts.types.length) return false;
            var lead = fact<string>(context, "world_combat:conversion-lead", self, null);
            return !!lead && facts.types.indexOf(lead) < 0;
        },
        priority: function (context) {
            return context.senses["world_combat:threat"] ? 28 : 8;
        }
    });
}
