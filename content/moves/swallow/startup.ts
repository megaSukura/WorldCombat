// 吞下挂上的「咽力」窗口：承载共享身份 world_combat:status/swallowed，表示那口攒下的力正被身体化开。
// 它只是可见的消化标记；真正的回复在 skill.ts 里一次或分几口结算。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:swallowed")
    .beneficial()
    .color(0xF0B23A)
    .tag("world_combat:status/swallowed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
