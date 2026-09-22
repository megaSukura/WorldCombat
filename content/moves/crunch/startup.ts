// 咬碎的破防载体：共享身份 world_combat:status/guardbroken，行为（降防与缺口画面）全部由本单元写。
// 咬碎留下这道缺口，别的单元（例如撕裂爪）会按共享身份接着消费它。
StartupEvents.registry("mob_effect", event => event.create("world_combat:crunch_cracked")
    .harmful()
    .color(0x4E3C6E)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
