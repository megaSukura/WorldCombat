// Legacy saved status id; current Boomburst no longer applies this visual-only status.
StartupEvents.registry("mob_effect", event => event.create("world_combat:deafened")
    .harmful()
    .color(0x6E6E82)
    .tag("world_combat:status/deafened")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
