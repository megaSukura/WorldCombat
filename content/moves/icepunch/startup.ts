// 冰冻拳的寒霜载体：借共享身份 world_combat:status/chill，行为全由本单元写（减速属性 + skill.ts 的二段冻结）。
// 对宝可梦、原版生物、玩家是同一个状态效果：物品栏可见、/effect 可用。identity_only 表示不借共享默认行为。
StartupEvents.registry("mob_effect", event => event.create("world_combat:icepunch_chill")
    .harmful()
    .color(0x8FD8F0)
    .tag("world_combat:status/chill")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:icepunch_chill_speed", -0.55, "add_multiplied_total")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
