// 本招的原生状态载体；临时能力变化在服务端脚本中与它同生共灭。
StartupEvents.registry("mob_effect", event => event.create("world_combat:string_bound")
    .harmful()
    .color(0xE6E2D6)
    .tag("world_combat:status/silked")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
