// Shared stockpile identity; amplifier is the live layer count. The managed store owns each defensive window.
StartupEvents.registry("mob_effect", event => event.create("world_combat:stockpile_charge")
    .beneficial()
    .color(0xF0B23A)
    .tag("world_combat:status/stockpile")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
