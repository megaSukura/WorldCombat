// 地狱突刺的咽喉载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/throatchop；「带 sound 标记的招式在提交时被顶回去」的行为写在本单元 skill.ts 的共享动作策略里。
// 消费方用 CombatStatus.has(world, actor, "throatchop") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:throat_chop")
    .harmful()
    .color(0x7A1E3A)
    .tag("world_combat:status/throatchop")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
