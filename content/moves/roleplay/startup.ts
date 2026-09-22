// 扮演：一个只承载共享身份 world_combat:status/roleplay 的可见标记，告诉玩家与对手这层“扮相”还剩多久。
// 真正的特性覆盖由 NativeModifiers 的 ability 层承担（技能脚本提交后写入），标记只负责读数与 AI 节流。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:roleplay_mask").beneficial().color(0xFFC24A)
        .tag("world_combat:status/roleplay").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
