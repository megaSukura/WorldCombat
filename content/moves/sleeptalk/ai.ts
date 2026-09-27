/**
 * Sleep Talk AI use.
 *
 * The move exists to answer being asleep: it is offered as an attack only while the shared sleep
 * identity holds, and then it is urgent (>=100) so it beats the ordinary attack order — which is
 * exactly when the shared policy is already refusing every other committed action. It is offered
 * only when the set really holds a callable move with a legal recipient, so a sleeper whose only
 * remaining moves cannot reach anyone stops re-offering instead of rejecting on a loop.
 */
namespace CompanionBehavior {
    registerUse("sleeptalk", {
        protocols: ["world_combat:attack"],
        available: function (context) {
            var self = source(context);
            return !!pokemonFacts(context, self) && status(context, self, "sleep")
                && PokemonSkills.sleeptalkReady(world(context), self.ref);
        },
        priority: function () { return 130; }
    });
}
