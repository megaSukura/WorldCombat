// 岩石封锁的封锁载体：共享身份 world_combat:status/encased，行为（降速与围栏）全部由本单元写。
// 岩石封锁会按身份读取它来判断目标是否已经被封住；别的招式也可以 CombatStatus.has(world, actor, "encased")
// 消费「行动被封」这件事。identity_only：只借身份，速度下降由本单元在 skill.ts 里用能力等级实现。
StartupEvents.registry("mob_effect", event => event.create("world_combat:rocktomb_tomb")
    .harmful()
    .color(0x8A7A62)
    .tag("world_combat:status/encased")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
