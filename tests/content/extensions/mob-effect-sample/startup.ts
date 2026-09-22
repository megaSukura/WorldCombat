// Test fixture: declare a real Minecraft MobEffect at startup. Not formal content.
StartupEvents.registry("mob_effect", event => event.create("checks:mob_effect_sample")
    .beneficial()
    .color(0x66CCFF)
    .modifyAttribute("minecraft:generic.movement_speed", "checks:mob_effect_sample", 0.1, "add_multiplied_total")
    // A non-null tick callback keeps the native effect clock running, which raises world_combat:mob_effect_tick for server content.
    .effectTick((entity: any, amplifier: number) => { }));
