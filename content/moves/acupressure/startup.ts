// 通畅图标承载这一轮随机强化的生命周期，属性由共享临时窗口持有。
StartupEvents.registry("mob_effect", event => event.create("world_combat:acupressure_flow")
    .beneficial()
    .color(0xE8B45A)
    .tag("world_combat:status/acupressure")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
