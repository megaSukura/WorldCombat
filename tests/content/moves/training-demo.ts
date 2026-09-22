WorldCombat.register("world_combat:training_bolt", "p1.1", 80, function (action) {
    TrainingBolt.cast(action, 4);
});

if (typeof CobblemonCombat !== "undefined") {
    CobblemonCombat.register("cobblemon_world_combat:training_bolt", "p1.1", 80, function (action) {
        var pokemon = CobblemonCombat.pokemon(action.actor());
        TrainingBolt.cast(action, Math.min(12, 2 + pokemon.level() / 5));
    });
}
