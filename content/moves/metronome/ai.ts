/**
 * Metronome AI use.
 *
 * A wild card: it is a real attack option, but ranked below concrete attacks (negative priority) so
 * it is chosen when it is the only thing left or nothing better fits. It is never offered while the
 * body is asleep or frozen, where the shared policy would refuse the commit anyway. The `bias`
 * preference is consumed inside the cast (pool narrowing), so the AI and a player share the same
 * observable difference: biased draws fit the current distance more often, unbiased draws keep the
 * full spectrum.
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("metronome", { bias: "none" }, [
        PokemonSkills.choice("bias", "挥指倾向", ["none", "near", "far"], ["全谱", "偏近身", "偏远程"])
    ]);

    /** A real protection candidate available this frame (protect, endure, ...), read from the live uses. */
    function metronomeGuarded(context: WorldBehavior.Context): boolean {
        return CompanionBehavior.options(context, "world_combat:survive").length > 0;
    }

    registerUse("metronome", {
        protocols: ["world_combat:attack"],
        available: function (context) {
            var self = source(context);
            if (!pokemonFacts(context, self)) return false;
            if (status(context, self, "sleep") || status(context, self, "frozen")) return false;
            return PokemonSkills.metronomePool().length > 0;
        },
        // Kept below concrete attacks. While the body is in danger with no protection candidate,
        // a random draw is not offered as a life-saver: it drops further instead of competing with survival.
        priority: function (context) {
            var self = source(context);
            if (ratio(self) < 0.3 && !metronomeGuarded(context)) return -30;
            return -5;
        }
    });
}
