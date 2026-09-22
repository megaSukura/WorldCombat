// 无理取闹的“烦躁”载体：一个真实有害 MobEffect。共享身份是 world_combat:status/torment，
// 消费方用 CombatStatus.has(world, actor, "torment") 按身份读取，不依赖这个 id。
// 行为（不能连续使用同一招）写在本单元 skill.ts 的共享动作策略里，效果本身不逐刻做什么。
StartupEvents.registry("mob_effect", event => event.create("world_combat:torment_itch")
    .harmful()
    .color(0x8E5BD0)
    .tag("world_combat:status/torment")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
