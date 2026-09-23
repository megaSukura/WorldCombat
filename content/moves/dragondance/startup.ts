// 龙势：一段可见的窗口状态，只承载共享身份 world_combat:status/dragondance。
// 龙势持有独立的物攻与速度窗口；等级贡献随载体移除自动结束。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:dragondance_airy")
    .beneficial()
    .color(0x8A6CFF)
    .tag("world_combat:status/dragondance")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
