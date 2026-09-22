// 轻身：一段可见的窗口状态，只承载共享身份 world_combat:status/lightened。
// 速度等级由 NativeEffects.boost 写入公共能力阶梯；窗口内的「被击额外推开」写在服务端 applied 规则里。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:lightened")
    .beneficial()
    .color(0xC9D6E4)
    .tag("world_combat:status/lightened")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
