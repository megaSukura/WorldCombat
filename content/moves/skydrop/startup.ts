// 自由落体的携行载体：借共享身份 world_combat:status/skydrop，行为（保持位移、门禁、导航归零）写在 skill.ts。
// 对宝可梦、原版生物、玩家是同一个状态效果：物品栏可见、/effect 可用。
StartupEvents.registry("mob_effect", event => event.create("world_combat:skydrop_carried")
    .harmful()
    .color(0x9FC6E8)
    .tag("world_combat:status/skydrop")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
