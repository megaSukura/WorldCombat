// 磁场：磁场操控给正负电己方挂在身上的可见状态，承载共享身份 world_combat:status/magnetized。
// 它是磁场的时限；等级记录在本单元的托管效果 world_combat:magneticflux_link 上，由 skill.ts 从移除事件里原样收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:magneticflux_field")
    .beneficial()
    .color(0x4FC3E8)
    .tag("world_combat:status/magnetized")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
