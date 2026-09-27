StartupEvents.registry("mob_effect", event => event.create("world_combat:mudslap_blinded")
    .harmful().color(0x79644F).tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
