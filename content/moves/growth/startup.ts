// 生长挂上的「长大」窗口：只承载共享身份 world_combat:status/grown 的可见标记，表示身体刚被撑大过一口气。
// 攻击与特攻的等级由 NativeEffects.boost 写入公共能力阶梯；身体抽长由 skill.ts 发送表现。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:grown")
    .beneficial()
    .color(0x6FBF4A)
    .tag("world_combat:status/grown")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
