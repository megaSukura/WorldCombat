// 冰砾的冻僵载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/chill（与冰锤、冰冻拳、冰锥共用，别的单元可以只问「冻僵没有」）。
// 行为只有一处：移动稍慢，由原生属性修饰承担，随效果到期一起消失；identity_only 表示不借共享默认行为。
// 图标复用原版缓慢。
StartupEvents.registry("mob_effect", event => event.create("world_combat:iceshard_chill")
    .harmful()
    .color(0xBFE8F8)
    .tag("world_combat:status/chill")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:iceshard_chill", -0.35, "add_multiplied_total")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
