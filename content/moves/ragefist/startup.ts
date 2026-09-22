// 愤怒之拳的拳印载具：借共享身份 world_combat:status/rage_fist，振幅即拳印数（0..6）。
// 行为（挨打加印、存续续期、散尽余怒）全部由本单元的 skill.ts 写；这里只登记效果本体与图标。
StartupEvents.registry("mob_effect", event => event.create("world_combat:rage_fist_charge")
    .beneficial()
    .color(0xB23A4E)
    .tag("world_combat:status/rage_fist")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
