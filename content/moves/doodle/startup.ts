// 描绘：一个只承载共享身份 world_combat:status/doodle 的可见标记，告诉玩家与对手“已描绘”还剩多久。
// 真正的特性覆盖由 NativeModifiers 的 ability 层承担（技能脚本提交后逐只写入），标记供别的作者按身份消费。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:doodle_sketch").beneficial().color(0x6E7BFF)
        .tag("world_combat:status/doodle").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
