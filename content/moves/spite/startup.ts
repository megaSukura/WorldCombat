// 怨恨的「怀恨」：一枚真实的 MobEffect，只借共享身份 world_combat:status/grudge，行为全在本单元。
// 被怀恨的活体脚步变沉、出招变慢；宝可梦的一侧再由 skill.ts 从它上一招里抽走 PP。
// 宝可梦、原版生物、玩家、其他模组生物走同一条路径：物品栏可见、/effect 可用、牛奶可解。
StartupEvents.registry("mob_effect", event => event.create("world_combat:spite_grudge")
    .harmful()
    .color(0x5B3FA0)
    .tag("world_combat:status/grudge")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:spite_grudge_slow", -0.15, "add_multiplied_total")
    // skill_haste 越低，共享冷却公式让招式冷却越长——「招出得慢」对任何持有者成立。
    .modifyAttribute("world_combat:skill_haste", "world_combat:spite_grudge_haste", -30, "add_value")
    // 非空 tick 回调才会驱动原生效果时钟，进而触发 world_combat:mob_effect_tick。
    .effectTick((entity: any, amplifier: number) => { }));
