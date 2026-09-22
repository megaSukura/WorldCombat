// 虫扑的缠身载体：借共享身份 world_combat:status/clung；掉速由 skill.ts 的 NativeEffects.boost 落到速度等级。
StartupEvents.registry("mob_effect", event => event.create("world_combat:pounce_cling")
    .harmful()
    .color(0xA6C24A)
    .tag("world_combat:status/clung")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
