// 本招的原生状态载体；临时能力变化在服务端脚本中与它同生共灭。
StartupEvents.registry("mob_effect", event => event.create("world_combat:meditative")
    .beneficial()
    .color(0xB39DDB)
    .tag("world_combat:status/meditative")
    // 非空回调让原生效果时钟保持运行。
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
