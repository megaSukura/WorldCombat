// 芳香薄雾：一段留在世界上的香云与被它裹住的留香窗口，承载共享身份 world_combat:status/aromaticmist。
// 特防等级本身由 NativeEffects.boost 写入公共能力阶梯，窗口只是「还裹着香」的读法与 AI 的重复施放判据。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:aromatic_veil")
    .beneficial()
    .color(0xF6C7E0)
    .tag("world_combat:status/aromaticmist")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
