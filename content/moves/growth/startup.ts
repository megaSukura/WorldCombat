// 本招的原生状态载体；临时能力变化在服务端脚本中与它同生共灭。
StartupEvents.registry("mob_effect", event => event.create("world_combat:grown")
    .beneficial()
    .color(0x6FBF4A)
    .tag("world_combat:status/grown")
    // 非空回调让原生效果时钟保持运行。
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
