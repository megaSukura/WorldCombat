// The native status owns the temporary Attack contribution; removal ends the distraction.
StartupEvents.registry("mob_effect", event => event.create("world_combat:growl_hush")
    .harmful()
    .color(0xE8B84A)
    .tag("world_combat:status/charmed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
