// 自我激励挂上的「斗志窗口」：通过共享身份 world_combat:status/roused 承载有限双攻提升。
// 攻击与特攻通过 boostWindow 随载体存在；到期、驱散或被消费时恢复。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:roused")
    .beneficial()
    .color(0xFF7A3C)
    .tag("world_combat:status/roused")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
