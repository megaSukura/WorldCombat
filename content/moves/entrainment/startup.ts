// 找伙伴：一个承载共享身份 world_combat:status/entrainment 的可见状态，告诉玩家「它的特性正被这段
// 节奏带着走」还剩多久。真正的特性顶替由 NativeModifiers 的 ability 层承担（技能脚本命中后写入），
// 两者同时到期；标记本身供别的作者按身份消费。
StartupEvents.registry("mob_effect", event => event.create("world_combat:entrainment")
    .harmful()
    .color(0xE8C24A)
    .tag("world_combat:status/entrainment")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
