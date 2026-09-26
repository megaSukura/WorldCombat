// Visible identity of a finite boundary; ordinary movement remains available inside.
StartupEvents.registry("mob_effect", event => event.create("world_combat:no_retreat")
    .harmful()
    .color(0xE0B040)
    .tag("world_combat:status/noretreat")
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
