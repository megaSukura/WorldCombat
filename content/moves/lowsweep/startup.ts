// 下盘踢的腿伤载体：借共享身份 world_combat:status/hobbled；掉速由 skill.ts 的 NativeEffects.boost 落到速度等级。
StartupEvents.registry("mob_effect", event => event.create("world_combat:lowsweep_hobble")
    .harmful()
    .color(0xE0B060)
    .tag("world_combat:status/hobbled")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
