// 腹鼓挂上的「力量窗口」：一个只承载共享身份 world_combat:status/bellydrum 的可见状态，告诉玩家与对手
// 物攻提升还剩多久。等级本身由 NativeEffects.boost 写入，窗口结束时 skill.ts 从移除事件里收回。
StartupEvents.registry("mob_effect", event => event.create("world_combat:bellydrum")
    .beneficial()
    .color(0xFF6A2A)
    .tag("world_combat:status/bellydrum")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
