// 神奇蒸汽的迷幻载体：借共享身份 world_combat:status/confusion，失手门禁由共享 CombatStatus 承担，本单元 skill.ts 只写云内续上。
// 对宝可梦、原版生物、玩家是同一个状态效果：物品栏可见、/effect 可用。
StartupEvents.registry("mob_effect", event => event.create("world_combat:strangesteam_haze")
    .harmful()
    .color(0xE89AC8)
    .tag("world_combat:status/confusion")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
