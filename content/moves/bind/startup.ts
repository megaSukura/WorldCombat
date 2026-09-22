// 绑紧的两个身份（启动脚本不引用服务端共享库，标签用字符串字面量）。
// world_combat:bind_cinch —— 被拴住的一方，借共享身份 world_combat:status/partiallytrapped（原生 volatile）；
//   移动由绳的每刻回拽与导航监听共同决定，效果自带一点减速让图标读得出「被拉着」。
// world_combat:bind_hold  —— 施法者正在拉绳，带自己的身份 world_combat:status/binding；
//   绳的张力拖慢施法者，这是「把目标拴住」要付的代价。
StartupEvents.registry("mob_effect", event => event.create("world_combat:bind_cinch")
    .harmful()
    .color(0xB08C5A)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:bind_cinch_speed", -0.25, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:bind_hold")
    .harmful()
    .color(0x8C7448)
    .tag("world_combat:status/binding")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:bind_hold_speed", -0.22, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
