StartupEvents.registry("mob_effect", event => event.create("world_combat:mistyexplosion_haze")
    .harmful().color(0xF0A8D0).tag("world_combat:status/mistyexplosion_haze")
    .effectTick((entity: any, amplifier: number) => { }));
