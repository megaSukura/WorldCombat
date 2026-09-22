// Declares the sticky state that slows a Pokemon attacker's skill recovery.
StartupEvents.registry("mob_effect", event => event.create("world_combat:gooey_cling")
    .harmful()
    .color(0x6A8F3C)
    // skill_haste feeds the shared skill cooldown formula; -40 turns a 100-tick cooldown into ~167 ticks.
    .modifyAttribute("world_combat:skill_haste", "world_combat:gooey_cling", -40, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
