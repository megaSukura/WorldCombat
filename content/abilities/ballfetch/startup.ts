// Declares the returned-object trip. Server behavior lives in rules.ts.
StartupEvents.registry("mob_effect", event => event.create("world_combat:ballfetch_trip")
    .harmful()
    .color(0x9FB86B)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:ballfetch_trip_speed", -0.2, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
