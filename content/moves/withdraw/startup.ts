// 壳：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/withdraw。
// 防御等级由本单元 skill.ts 的 boostWindow 绑在同一份壳载体上；窗口走完、被清除或壳被挡满时由移除事件收回。
// 「按次硬挡」由本单元 skill.ts 的 GuardEffects 规则承担，钉住由世界已有的 world_combat:rooted 承担。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:withdraw_shell")
    .beneficial()
    .color(0x4C7FA8)
    .tag("world_combat:status/withdraw")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
