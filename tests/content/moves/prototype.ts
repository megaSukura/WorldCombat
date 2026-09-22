WorldCombat.registerAction("world_combat:bolt", "p2.1", 80, "aim", 24, function (action) {
    TrainingBolt.cast(action, 4);
});
WorldCombat.registerAction("world_combat:ward", "p2.1", 220, "friend", 24, PrototypeMechanisms.ward);
WorldCombat.registerAction("world_combat:wall", "p2.1", 40, "point", 12, PrototypeMechanisms.wall);
WorldCombat.registerAction("world_combat:dash", "p2.1", 40, "motion", 6, PrototypeMechanisms.dash);
WorldCombat.preview("world_combat:bolt", JSON.stringify({ lineOfSight: true }));
WorldCombat.preview("world_combat:wall", JSON.stringify(ManagedEffects.wallPreview));
WorldCombat.preview("world_combat:dash", JSON.stringify({ motion: "horizontal" }));

if (typeof CobblemonCombat !== "undefined") {
    CobblemonCombat.registerAction("cobblemon_world_combat:bolt", "p2.1", 80, "aim", 24, function (action) {
        var pokemon = CobblemonCombat.pokemon(action.actor());
        TrainingBolt.cast(action, Math.min(12, 2 + pokemon.level() / 5));
    });
    CobblemonCombat.registerAction("cobblemon_world_combat:ward", "p2.1", 220, "friend", 24, PrototypeMechanisms.ward);
    CobblemonCombat.registerAction("cobblemon_world_combat:wall", "p2.1", 40, "point", 12, PrototypeMechanisms.wall);
    CobblemonCombat.registerAction("cobblemon_world_combat:dash", "p2.1", 40, "motion", 6, PrototypeMechanisms.dash);
    WorldCombat.preview("cobblemon_world_combat:bolt", JSON.stringify({ lineOfSight: true }));
    WorldCombat.preview("cobblemon_world_combat:wall", JSON.stringify(ManagedEffects.wallPreview));
    WorldCombat.preview("cobblemon_world_combat:dash", JSON.stringify({ motion: "horizontal" }));
}
