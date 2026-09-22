// 陷阱甲壳的待爆载体：一个真实 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/shelltrap；「被物理打中就爆炸、没打中则收壳」的行为写在本单元 skill.ts。
// 消费方用 CombatStatus.has(world, actor, "shelltrap") 按身份读取，不依赖这个 id。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:shelltrap_armed")
    .beneficial()
    .color(0xE07030)
    .tag("world_combat:status/shelltrap")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
