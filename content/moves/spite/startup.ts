// 怨恨的「怀恨」：一枚真实的 MobEffect，只借共享身份 world_combat:status/grudge 做标记，行为全在本单元。
// 它不再改动移动速度或技能急速；真正的作用是让被记住的那一手在下一次有效直击时被削去一份（见 skill.ts 的
// DamageBudgets 预算），效果本身负责图标、可见性与预算挂靠的载体身份。
// 宝可梦、原版生物、玩家、其他模组生物走同一条路径：物品栏可见、/effect 可用、牛奶可解。
StartupEvents.registry("mob_effect", event => event.create("world_combat:spite_grudge")
    .harmful()
    .color(0x5B3FA0)
    .tag("world_combat:status/grudge")
    .tag("world_combat:status/identity_only")
    // 非空 tick 回调才会驱动原生效果时钟，进而触发 world_combat:mob_effect_tick 并正常到期。
    .effectTick((entity: any, amplifier: number) => { }));
