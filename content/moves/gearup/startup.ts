// 传动：辅助齿轮给正负电/金属己方挂在身上的可见状态，承载共享身份 world_combat:status/geared。
// 它也是这次攻击/特攻临时窗口的载体：skill.ts 把 boostWindow 绑在它上面，状态结束或清除时贡献随之收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:gearup_drive")
    .beneficial()
    .color(0xC8CDD3)
    .tag("world_combat:status/geared")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
