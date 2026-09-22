// 忍耐的架势载体：一个真实 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/bide；「站定忍耐、时间到自动还手、被打断则崩解」的行为写在本单元 skill.ts。
// 消费方用 CombatStatus.has(world, actor, "bide") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:bide_brace")
    .category("neutral")
    .color(0xE06A3C)
    .tag("world_combat:status/bide")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
