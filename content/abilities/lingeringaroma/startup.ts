// Declares the clinging scent; it weakens whatever it covers and refreshes a tracking glow.
StartupEvents.registry("mob_effect", event => event.create("world_combat:lingering_aroma")
    .harmful()
    .color(0xB45FD8)
    .modifyAttribute("minecraft:generic.attack_damage", "world_combat:lingering_aroma", -0.15, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
