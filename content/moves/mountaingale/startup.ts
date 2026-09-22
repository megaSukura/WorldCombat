// 冰山风的畏缩载体：借共享身份 world_combat:status/flinch，behavior 全由本单元写（skill.ts 的门禁）。
// 对宝可梦、原版生物、玩家是同一个状态效果：物品栏可见、/effect 可用。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mountaingale_flinch")
    .harmful()
    .color(0x9FD8E8)
    .tag("world_combat:status/flinch")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
