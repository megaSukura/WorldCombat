// Declares the grassy ground mark: a real beneficial status every grounded body in the field carries.
StartupEvents.registry("mob_effect", event => event.create("world_combat:grassysurge_terrain")
    .beneficial()
    .color(0x7CCB5A)
    .effectTick((entity: any, amplifier: number) => { }));
