// 本招的原生状态载体；临时能力变化在服务端脚本中与它同生共灭。
StartupEvents.registry("mob_effect", event => event.create("world_combat:triplearrows_guard")
    .harmful()
    .color(0x9AA86A)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:triplearrows_flinch")
    .harmful()
    .color(0xB8C878)
    .tag("world_combat:status/flinch")
    .effectTick((entity: any, amplifier: number) => { }));
