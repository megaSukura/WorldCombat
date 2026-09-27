// The native drench marker owns its CombatTypes layer and water-film presentation.
StartupEvents.registry("mob_effect", event => event.create("world_combat:soaked_through")
    .harmful()
    .color(0x4FA8E8)
    .tag("world_combat:status/soak")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
