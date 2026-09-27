StartupEvents.registry("mob_effect", event => event.create("world_combat:lusterpurge_exposed")
    .harmful().color(0xE3B9F5).tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
