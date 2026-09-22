// 鼓击的根缚载体：借共享身份 world_combat:status/rootbound；掉速由 skill.ts 的 NativeEffects.boost 落到速度等级。
StartupEvents.registry("mob_effect", event => event.create("world_combat:drumbeating_bound")
    .harmful()
    .color(0x7CB342)
    .tag("world_combat:status/rootbound")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
