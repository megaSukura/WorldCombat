// 本招的原生状态载体；临时能力变化在服务端脚本中与它同生共灭。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mudshot_mire")
    .harmful()
    .color(0x6E5438)
    .tag("world_combat:status/mired")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
