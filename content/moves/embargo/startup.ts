// 查封：一个只承载共享身份 world_combat:status/embargo 的可见状态，告诉玩家与对手「道具被按住」还剩多久。
// 真正的道具压制由本单元 skill.ts 在目标身上叠加共享的 NativeModifiers suppressItems 层（随印记一起到期／收回）；
// 消费方用 CombatStatus.has(world, actor, "embargo") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:embargo").harmful().color(0x8C6BD8)
        .tag("world_combat:status/embargo").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
