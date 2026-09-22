// 丝网：铺开线阱期间的身份，承载共享身份 world_combat:status/silktrap。
// 按量吸收由共享 GuardEffects 的 pool 承担；接触缠足由本单元 skill.ts 在 pool 的 guarded 回调里结算
// （降速用 NativeEffects.boost，缠足用世界已有的 world_combat:rooted）。
// 线阱只挡伤害招式：变化招式会照常落下，所以这里没有提交点封口。
// 身份是「谁撑着丝网」的读法、AI 的重复施放判据与图标来源。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:silk_guard")
    .beneficial()
    .color(0xEDE6D0)
    .tag("world_combat:status/silktrap")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
