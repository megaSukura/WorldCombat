// 真实缩小窗口；公共闪避租约和BodyScale分别绑定同一载体，恢复体型可独立等待安全空间。
StartupEvents.registry("mob_effect", event => event.create("world_combat:minimize_small")
    .beneficial()
    .color(0x9FB8D8)
    .tag("world_combat:status/minimize")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
