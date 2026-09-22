// 冰锥的霜寒载体：只借共享身份 world_combat:status/chill，行为（按振幅减速、随新锥刷新）由本单元 rules.ts 写。
// 对宝可梦、原版生物、玩家是同一个状态效果：物品栏可见、/effect 可用。
StartupEvents.registry("mob_effect", event => event.create("world_combat:iciclespear_chill")
    .harmful()
    .color(0x9FD8E8)
    .tag("world_combat:status/chill")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
