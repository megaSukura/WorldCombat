// 浸水的水属性身份：一个真实有害 MobEffect，承载共享身份 world_combat:status/soak，
// 对宝可梦、原版生物、玩家是同一个东西（物品栏可见、/effect 可用、牛奶可解）。
// 真正的属性改写由 NativeModifiers 的 types 层承担（skill.ts 命中后写入，与效果同寿命、到期还原），
// 标记本身供别的作者按身份消费。
StartupEvents.registry("mob_effect", event => event.create("world_combat:soaked_through")
    .harmful()
    .color(0x4FA8E8)
    .tag("world_combat:status/soak")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
