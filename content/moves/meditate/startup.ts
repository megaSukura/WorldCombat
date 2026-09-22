// 瑜伽姿势挂上的「入静」窗口：只承载共享身份 world_combat:status/meditative 的可见标记，
// 表示身体刚把沉睡的力叫醒过一口气。物攻等级由 NativeEffects.boost 写入公共能力阶梯，不会随窗口褪去。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:meditative")
    .beneficial()
    .color(0xB39DDB)
    .tag("world_combat:status/meditative")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
