// The carrier anchors the finite successful-hit budget.
StartupEvents.registry("mob_effect", event => event.create("world_combat:laserfocus_edge")
    .beneficial()
    .color(0xFFC24A)
    .tag("world_combat:status/laserfocus")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
