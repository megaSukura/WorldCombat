// Declares the shared nectar. Server behavior lives in rules.ts.
StartupEvents.registry("mob_effect", event => event.create("world_combat:honeygather_nectar")
    .beneficial()
    .color(0xE8B84A)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:honeygather_nectar_speed", 0.1, "add_multiplied_total")
    .modifyAttribute("world_combat:healing_received", "world_combat:honeygather_nectar_healing", 25, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
