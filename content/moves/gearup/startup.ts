// 传动：辅助齿轮给正负电己方挂在身上的可见状态，承载共享身份 world_combat:status/geared。
// 它是运转的时限；等级记录在本单元的托管效果 world_combat:gearup_mark 上，由 skill.ts 从移除事件里原样收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:gearup_drive")
    .beneficial()
    .color(0xC8CDD3)
    .tag("world_combat:status/geared")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
