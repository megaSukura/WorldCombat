// 宽墙：一段极短的整队防御窗口，承载共享身份 world_combat:status/wideguard。
// 实际的按量吸收由共享 GuardEffects 的 pool 承担；身份只是「谁被这面墙罩着」的读法与 AI 的重复施放判据。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:wide_guard")
    .beneficial()
    .color(0xC9C3AE)
    .tag("world_combat:status/wideguard")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
