/**
 * Assist AI use.
 *
 * Meaningful only when a friendly Pokemon inside the effective call radius knows an implemented
 * move; on its own it is never offered. Ranked below concrete attacks (negative priority) so it is
 * chosen when it is the remaining option. The `callRadius` preference is read here so the AI's
 * offer matches the player's resolved radius; raising it trades a longer shout for a wider net.
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("assist", { callRadius: 8 }, [
        PokemonSkills.number("callRadius", "求助半径", 4, 16, 1)
    ]);

    registerUse("assist", {
        protocols: ["world_combat:attack"],
        available: function (context, capability) {
            var self = source(context), facts = pokemonFacts(context, self);
            if (!facts) return false;
            if (status(context, self, "sleep") || status(context, self, "frozen")) return false;
            var raw = capability.data.config || {}, configured = raw.callRadius === undefined ? 8 : Number(raw.callRadius);
            var radius = Math.max(4, Math.min(24, configured + facts.level / 20));
            return PokemonSkills.assistAvailable(world(context), point(source(context).point), self.ref, radius);
        },
        priority: function () { return -3; }
    });
}
