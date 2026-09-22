// 爆裂拳的混乱载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/confusion；出手作废由共享 CombatStatus 承担，反噬行为写在本单元 skill.ts，消费方用
// CombatStatus.has(world, actor, "confusion") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:dynamicpunch_daze")
    .harmful()
    .color(0xE0523C)
    .tag("world_combat:status/confusion")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
