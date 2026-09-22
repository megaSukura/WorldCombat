// 缩小：一段可见的蜷缩窗口，承载共享身份 world_combat:status/minimize。
// 闪避等级由 NativeEffects.boost 写入公共能力阶梯（宝可梦的原生闪避项）；
// 「打不中」与「被大体型踩中更疼」由本单元 skill.ts 的入场伤害规则按同一个身份承接。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:minimize_small")
    .beneficial()
    .color(0x9FB8D8)
    .tag("world_combat:status/minimize")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
