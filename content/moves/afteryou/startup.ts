// A pending one-use preparation transfer and the helper’s short recovery cost. Managed effects own both lifetimes.
StartupEvents.registry("mob_effect", event => event.create("world_combat:afteryou_ready")
    .beneficial()
    .color(0x8FE06A)
    .tag("world_combat:status/afteryou")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
StartupEvents.registry("mob_effect", event => event.create("world_combat:afteryou_yield")
    .harmful()
    .color(0x8A93A0)
    .tag("world_combat:status/afteryou_yield")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
