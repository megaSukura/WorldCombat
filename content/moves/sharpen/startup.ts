// 棱角化挂上的「棱角」窗口：承载共享身份 world_combat:status/sharpened；amplifier 记录这次抬起的物攻级数，
// 窗口走完时照数收回。近身反击的判定与棱锋威力写在 skill.ts 的机读标记里。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:sharpened")
    .beneficial()
    .color(0xC8D0DA)
    .tag("world_combat:status/sharpened")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
