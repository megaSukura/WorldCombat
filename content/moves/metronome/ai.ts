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

    registerUse("metronome", {
        protocols: ["world_combat:attack"],
        available: function (context) {
            var self = source(context);
            if (!pokemonFacts(context, self)) return false;
            if (status(context, self, "sleep") || status(context, self, "frozen")) return false;
            return PokemonSkills.metronomePool().length > 0;
        },
        priority: function () { return -5; }
    });
}
