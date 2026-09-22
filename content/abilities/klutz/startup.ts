// Declares Klutz's unburdened state: a Pokemon-only trade of held item for speed and tempo.
StartupEvents.registry("mob_effect", event => event.create("world_combat:klutz_unburdened")
    .beneficial()
    .color(0xC9A227)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:klutz_speed", 0.15, "add_multiplied_total")
    .modifyAttribute("world_combat:skill_haste", "world_combat:klutz_haste", 25, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
