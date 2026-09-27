StartupEvents.registry("mob_effect", event => event.create("world_combat:shadowball_cling")
    .harmful().color(0x594A83).tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
