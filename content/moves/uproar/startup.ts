// 吵闹：这一阵谁也不能入睡的共享身份 world_combat:status/uproar。
// 效果只提供身份、时长与图标；止眠由 skill.ts 的共享 CombatStatus gate 拦截，逐圈伤害由本单元的绑定效果结算。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:uproar_voice")
    .harmful()
    .color(0xD8B84A)
    .tag("world_combat:status/uproar")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
