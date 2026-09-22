// 顺风：一段可见的整队加速窗口，承载共享身份 world_combat:status/tailwind。
// 速度等级本身由 NativeEffects.boost 写入公共能力阶梯，窗口只是「还在风里」的读法与 AI 的重复施放判据。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:tailwind_gale")
    .beneficial()
    .color(0xBEE9F2)
    .tag("world_combat:status/tailwind")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
