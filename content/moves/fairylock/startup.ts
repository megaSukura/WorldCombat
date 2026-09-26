// Visible identity of a finite boundary; ordinary movement remains available inside.
StartupEvents.registry("mob_effect", event => event.create("world_combat:fairy_lock")
    .harmful()
    .color(0xF7A8D8)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/fairy_locked")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
