// Declares the mist ground mark: a real beneficial status every grounded body in the field carries.
StartupEvents.registry("mob_effect", event => event.create("world_combat:mistysurge_terrain")
    .beneficial()
    .color(0xA8D8E8)
    .effectTick((entity: any, amplifier: number) => { }));
