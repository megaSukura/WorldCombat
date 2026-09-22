// 挑衅的怒火载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/taunt；拒绝变化招式的行为写在本单元 skill.ts 的共享动作策略里，
// 消费方用 CombatStatus.has(world, actor, "taunt") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:taunt_rage")
    .harmful()
    .color(0xC0392B)
    .tag("world_combat:status/taunt")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
