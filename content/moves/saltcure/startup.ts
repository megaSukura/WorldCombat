// 盐腌：一身盐壳的共享身份 world_combat:status/saltcure（消费方用 CombatStatus.has(world, actor, "saltcure")）。
// 效果只提供身份、时长与图标；每隔一段的蛰痛由 skill.ts 的绑定效果结算，盐壳本身不做逐 tick 行为。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:salt_cured")
    .harmful()
    .color(0xDED7C2)
    .tag("world_combat:status/saltcure")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
