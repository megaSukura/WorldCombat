// 鼓击的根缚载体：借共享身份 world_combat:status/rootbound；限时掉速由 skill.ts 的 NativeEffects.boostWindow 归属到它。
StartupEvents.registry("mob_effect", event => event.create("world_combat:drumbeating_bound")
    .harmful()
    .color(0x7CB342)
    .tag("world_combat:status/rootbound")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
