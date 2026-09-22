// Declares the well-fed state left by Hospitality's meal: a small speed bonus for every combatant,
// and a Pokemon-only boost to the native healing_received value.
StartupEvents.registry("mob_effect", event => event.create("world_combat:hospitality_well_fed")
    .beneficial()
    .color(0xE8A86B)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:well_fed_speed", 0.1, "add_multiplied_total")
    .modifyAttribute("world_combat:healing_received", "world_combat:well_fed_healing", 25, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
