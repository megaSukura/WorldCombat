/**
 * Sleep Talk AI use.
 *
 * The move exists to answer being asleep: it is offered as an attack only while the shared sleep
 * identity holds, and then it is urgent (>=100) so it beats the ordinary attack order — which is
 * exactly when the shared policy is already refusing every other committed action. It keeps the
 * default reach from its own resolved range, so a sleeping body that cannot close distance still
 * fires when a target is in reach of its dreams.
 */
namespace CompanionBehavior {
    registerUse("sleeptalk", {
        protocols: ["world_combat:attack"],
        available: function (context) {
            var self = source(context);
            return !!pokemonFacts(context, self) && status(context, self, "sleep");
        },
        priority: function () { return 130; }
    });
}
