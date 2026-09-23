// 胃液：一个只承载共享身份 world_combat:status/gastroacid 的可见状态，告诉玩家与对手“沾酸/特性被压制”
// 还剩多久。真正的特性压制由 NativeModifiers 的 suppressAbility 层承担（技能脚本命中后写入），
// 两者同时到期；标记本身供别的作者按身份消费。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:gastroacid").harmful().color(0x9BE049)
        .tag("world_combat:status/gastroacid").tag("world_combat:status/identity_only")
        .modifyAttribute("minecraft:generic.armor", "world_combat:gastroacid_armor", -0.25, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
});
