// 奇妙空间的成员身份：站在交换空间里的活体带这个世界共有的身份 world_combat:status/wonderroom。
// 真正的防御／特防对调由本单元 rules.ts 在共享伤害事实读取器里按该身份执行；
// 消费方用 CombatStatus.has(world, actor, "wonderroom") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:wonderroom_swap")
    .beneficial()
    .color(0x8FE8D8)
    .tag("world_combat:status/wonderroom")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
