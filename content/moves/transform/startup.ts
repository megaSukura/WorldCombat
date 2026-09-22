// 变身的形态载体：一个真实 MobEffect，共享身份 world_combat:status/transformed。
// 消费方用 CombatStatus.has(world, actor, "transformed") 按身份读；行为（临时层收回）写在本单元 skill.ts。
// 启动脚本不引用服务端共享库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:transform_shift")
    .category("neutral")
    .color(0xE8B4FF)
    .tag("world_combat:status/transformed")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
