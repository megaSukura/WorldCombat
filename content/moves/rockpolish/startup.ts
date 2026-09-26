// 原生光面载体同时锚定临时速度贡献与身体滑行系数；移除时各自释放。
StartupEvents.registry("mob_effect", event => event.create("world_combat:rock_polish_shine")
    .beneficial()
    .color(0xE8B87A)
    .tag("world_combat:status/polished")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
