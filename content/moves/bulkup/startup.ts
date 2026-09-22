// 涨身：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/bulkup。
// 物攻与防御等级由 NativeEffects.boost 写入公共能力阶梯；各加了几级另存在 world_combat:bulkup_mark 里，
// 窗口走完或被清除时由本单元 skill.ts 从移除事件里照数收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:bulkup_surge")
    .beneficial()
    .color(0xE0603C)
    .tag("world_combat:status/bulkup")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
