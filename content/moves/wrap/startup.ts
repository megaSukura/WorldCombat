// Visible carrier for the action-owned constriction and temporary Attack reduction.
StartupEvents.registry("mob_effect", event => event.create("world_combat:wrap_coil")
    .harmful()
    .color(0x7E9C5A)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
