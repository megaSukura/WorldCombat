// 星辉：一段可见的窗口，承载共享身份 world_combat:status/cosmicpower。
// 防御与特防等级由 NativeEffects.boost 写入公共能力阶梯；各加了几级另存在 world_combat:cosmicpower_mark 里，
// 窗口走完或被清除时由本单元 skill.ts 从移除事件里照数收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:cosmic_surge")
    .beneficial()
    .color(0x5B4BC4)
    .tag("world_combat:status/cosmicpower")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
