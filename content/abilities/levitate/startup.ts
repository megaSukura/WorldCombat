// Declares the hover the floating holder carries. Server behavior lives in rules.ts.
StartupEvents.registry("mob_effect", event => event.create("world_combat:levitate_hover")
    .beneficial()
    .color(0xAFE8FF)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:levitate_hover_speed", 0.1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
