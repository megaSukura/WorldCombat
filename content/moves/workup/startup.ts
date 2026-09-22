// 自我激励挂上的「斗志窗口」：只承载共享身份 world_combat:status/roused 的可见标记，告诉玩家这一口气还在。
// 攻击与特攻的等级由 NativeEffects.boost 写入公共能力阶梯；标记只负责可读性，别的作者可以按身份消费它。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:roused")
    .beneficial()
    .color(0xFF7A3C)
    .tag("world_combat:status/roused")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
