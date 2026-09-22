// 水之波动的耳鸣载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/confusion；失手门禁由共享 CombatStatus 承担，消费方用
// CombatStatus.has(world, actor, "confusion") 按身份读取，不依赖这个 id。
// 只借身份（identity_only），因为水之波动的混乱是「耳鸣发飘」——附带移动减速，且不自伤。
StartupEvents.registry("mob_effect", event => event.create("world_combat:waterpulse_daze")
    .harmful()
    .color(0x4FB6E8)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:waterpulse_daze", -0.12, "add_multiplied_total")
    .tag("world_combat:status/confusion")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
