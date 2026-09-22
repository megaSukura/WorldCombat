// 糖浆炸弹：满身麦芽糖的共享身份 world_combat:status/syrupbomb（消费方用 CombatStatus.has(world, actor, "syrupbomb")）。
// 效果只提供身份、时长与图标；每阵掉一级速度由 skill.ts 的绑定效果结算。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:syrup_coated")
    .harmful()
    .color(0xC98A2E)
    .tag("world_combat:status/syrupbomb")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
