// 泥巴射击的糊腿载体：借共享身份 world_combat:status/mired；掉速由 skill.ts 的 NativeEffects.boost 落到速度等级。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mudshot_mire")
    .harmful()
    .color(0x6E5438)
    .tag("world_combat:status/mired")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
