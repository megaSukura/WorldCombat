// Declares the Frisk exposure: a native armor cut applied to inspected enemies.
StartupEvents.registry("mob_effect", event => event.create("world_combat:frisk_exposed")
    .harmful()
    .color(0x8A7F4A)
    .modifyAttribute("minecraft:generic.armor", "world_combat:frisk_exposed_armor", -2, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
