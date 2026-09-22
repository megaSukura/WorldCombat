// 交换：一段可见的窗口状态，只承载共享身份 world_combat:status/powershift。
// 数值本身由临时属性层对调（宝可梦走 NativeModifiers.stats，其他战斗者走 skill.ts 里注册的载体效果），
// 窗口走完或被清除时由本单元 skill.ts 按记号精确结束，数值自动回到原样。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:powershift_stance")
    .category("neutral")
    .color(0x9FD8E8)
    .tag("world_combat:status/powershift")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
