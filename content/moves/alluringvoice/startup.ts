// 魅诱之声的错乱载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/confusion；出手作废由共享 CombatStatus 承担，反噬行为写在本单元 skill.ts，消费方用
// CombatStatus.has(world, actor, "confusion") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:alluring_voice_song")
    .harmful()
    .color(0xF2A0C8)
    .tag("world_combat:status/confusion")
    .effectTick((entity: any, amplifier: number) => { }));
