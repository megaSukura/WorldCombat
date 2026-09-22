// Declares the shared terrain attunement. Server behavior lives in rules.ts.
StartupEvents.registry("mob_effect", event => event.create("world_combat:multitype_attuned")
    .beneficial()
    .color(0xB6E8FF)
    .modifyAttribute("minecraft:generic.armor", "world_combat:multitype_attuned_armor", 2, "add_value")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:multitype_attuned_speed", 0.1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
