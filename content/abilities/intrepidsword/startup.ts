// Declares Intrepid Sword's opening tempo: a Pokemon-only skill-haste boost.
StartupEvents.registry("mob_effect", event => event.create("world_combat:intrepidsword_edge")
    .beneficial()
    .color(0x4C9BE8)
    .modifyAttribute("world_combat:skill_haste", "world_combat:intrepidsword_edge_haste", 25, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
