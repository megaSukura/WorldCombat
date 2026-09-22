// 地脉蓄力：一段可见的窗口状态，只承载共享身份 world_combat:status/geomancy。
// 三攻三防项的等级本身由 NativeEffects.boost 写入公共能力阶梯，由本单元 skill.ts 在蓄力完成时结算。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:geomancy_charge")
    .beneficial()
    .color(0x8FD46A)
    .tag("world_combat:status/geomancy")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
