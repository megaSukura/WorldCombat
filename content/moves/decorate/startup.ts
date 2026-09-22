// 装饰挂上的「已装扮」标记：只承载共享身份 world_combat:status/decorated 的可见标记，表示这件作品还亮着。
// 攻击与特攻的大幅提升由 NativeEffects.boost 写入公共能力阶梯；标记只负责可读性，别的作者可按身份消费它。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:decorated")
    .beneficial()
    .color(0xFF9FC4)
    .tag("world_combat:status/decorated")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
