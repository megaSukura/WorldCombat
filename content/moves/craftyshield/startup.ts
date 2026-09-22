// 符阵：一段只对变化招式生效的整队防御窗口，承载共享身份 world_combat:status/craftyshield。
// amplifier 记「还剩几次拨挡」；敌方变化招式的拒绝由本单元 skill.ts 的提交点监听承担，拨挡画面在之后的可写 tick 补播。
// 身份只是「谁撑着这片符阵」的读法与 AI 的重复施放判据。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:crafty_shield")
    .beneficial()
    .color(0xC9A0E8)
    .tag("world_combat:status/craftyshield")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
