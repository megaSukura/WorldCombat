// 换档的挡位载体：amplifier 记录当前挡位（0 扭力／1 超速），攻速提升由绑在这份载体上的临时窗口拥有。
// 载体被替换、到期或清除时，窗口随原生效果生命周期只收回本招自己那一份。
StartupEvents.registry("mob_effect", event => event.create("world_combat:shiftgear_gear")
    .beneficial()
    .color(0x8FA3B8)
    .tag("world_combat:status/shiftgear")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
